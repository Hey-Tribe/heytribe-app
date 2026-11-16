-- Admin build for Hey Tribe (same steps as the Andamos pilot):
-- 1. Admins need the authenticator step: is_admin() is true only in an aal2 session, so every admin
--    function and admin RLS policy requires it. admin_whoami() still answers at aal1 so the admin can
--    ask for the code.
-- 2. Roles on admin_emails (owner, admin, support, marketing, readonly); read-only cannot write.
-- 3. Append-only audit log, filled by triggers on every table the admin writes.
-- 4. Team functions, product events, ad spend and one row of metrics per day.

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 1 and 2. Roles and the authenticator step.
alter table public.admin_emails add column if not exists role text not null default 'owner'
  check (role in ('owner', 'admin', 'support', 'marketing', 'readonly'));

create or replace function private.admin_email_role()
returns text language sql stable security definer set search_path to '' as $$
  select a.role from public.admin_emails a join auth.users u on lower(u.email) = a.email
  where u.id = auth.uid() and u.email_confirmed_at is not null and (a.user_id is null or a.user_id = u.id)
  limit 1;
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path to '' as $$
  select private.admin_email_role() is not null and coalesce(auth.jwt() ->> 'aal', '') = 'aal2';
$$;

create or replace function private.admin_require_role(p_roles text[])
returns text language plpgsql stable security definer set search_path to '' as $$
declare r text := private.admin_email_role();
begin
  if r is null or coalesce(auth.jwt() ->> 'aal', '') <> 'aal2' or not (r = any (p_roles)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return r;
end;
$$;

create or replace function public.admin_whoami()
returns json language plpgsql security definer set search_path to '' as $$
declare e text; r text := private.admin_email_role();
begin
  if r is null then return json_build_object('admin', false); end if;
  select lower(email) into e from auth.users where id = auth.uid();
  update public.admin_emails set user_id = auth.uid() where email = e and user_id is null;
  return json_build_object('admin', true, 'email', e, 'role', r,
    'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'), 'mfa_required', coalesce(auth.jwt() ->> 'aal', '') <> 'aal2');
end;
$$;

-- 3. Audit log. Never changed or removed.
create table if not exists public.admin_audit_log (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  admin_id uuid,
  admin_email text,
  action text not null,
  target_type text,
  target_id text,
  before jsonb,
  after jsonb,
  reason text,
  ip text
);
alter table public.admin_audit_log enable row level security;
revoke all on public.admin_audit_log from anon, authenticated;
revoke update, delete, truncate on public.admin_audit_log from service_role;

create or replace function private.audit_log_is_append_only()
returns trigger language plpgsql as $$
begin
  raise exception 'admin_audit_log is append-only' using errcode = '42501';
end;
$$;
create trigger admin_audit_log_append_only before update or delete on public.admin_audit_log
  for each row execute function private.audit_log_is_append_only();
create trigger admin_audit_log_no_truncate before truncate on public.admin_audit_log
  for each statement execute function private.audit_log_is_append_only();

create or replace function public.admin_log(p_action text, p_target_type text default null, p_target_id text default null,
  p_before jsonb default null, p_after jsonb default null, p_reason text default null, p_ip text default null)
returns void language plpgsql security definer set search_path to '' as $$
begin
  if not public.is_admin() then raise exception 'not allowed' using errcode = '42501'; end if;
  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, before, after, reason, ip)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), left(p_action, 80), left(p_target_type, 40),
          left(p_target_id, 120), p_before, p_after, left(p_reason, 500), left(p_ip, 64));
end;
$$;
revoke all on function public.admin_log(text, text, text, jsonb, jsonb, text, text) from public, anon;
grant execute on function public.admin_log(text, text, text, jsonb, jsonb, text, text) to authenticated;

-- Every write an admin session makes to these tables is logged with before and after. Customers and
-- the server (no admin session) are not logged here. Read-only admins are refused; only owners change
-- the admin list; only owners and admins change billing.
create or replace function private.audit_admin_write()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  r text := case when coalesce(auth.jwt() ->> 'aal', '') = 'aal2' then private.admin_email_role() end;
  b jsonb := case when tg_op <> 'INSERT' then to_jsonb(old) end;
  a jsonb := case when tg_op <> 'DELETE' then to_jsonb(new) end;
begin
  if r is null then return coalesce(new, old); end if;
  if r = 'readonly' then raise exception 'Read-only admins can''t change anything.' using errcode = '42501'; end if;
  if tg_table_name = 'admin_emails' and r <> 'owner' then raise exception 'Only an owner can change the team.' using errcode = '42501'; end if;
  if tg_table_name = 'subscriptions' and r not in ('owner', 'admin') then raise exception 'Only owners and admins can change billing.' using errcode = '42501'; end if;
  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, before, after)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), tg_table_name || '.' || lower(tg_op), tg_table_name,
          coalesce(a, b) ->> (case tg_table_name when 'subscriptions' then 'tribe_code' when 'admin_emails' then 'email' else 'id' end),
          b, a);
  return coalesce(new, old);
end;
$$;

create trigger audit_admin_write before insert or update or delete on public.subscriptions for each row execute function private.audit_admin_write();
create trigger audit_admin_write before insert or update or delete on public.tickets for each row execute function private.audit_admin_write();
create trigger audit_admin_write before insert or update or delete on public.ticket_messages for each row execute function private.audit_admin_write();
create trigger audit_admin_write before insert or update or delete on public.site_submissions for each row execute function private.audit_admin_write();
create trigger audit_admin_write before insert or update or delete on public.announcements for each row execute function private.audit_admin_write();
create trigger audit_admin_write before insert or update or delete on public.admin_emails for each row execute function private.audit_admin_write();
create trigger audit_admin_write before insert or update or delete on public.deletion_requests for each row execute function private.audit_admin_write();
create trigger audit_admin_write before insert or update or delete on public.saved_replies for each row execute function private.audit_admin_write();

-- Team. Admins are listed by email; the first confirmed sign-in with that email links it.
create or replace function public.admin_team()
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.admin_require_role(array['owner', 'admin', 'support', 'marketing', 'readonly']);
  return coalesce((select jsonb_agg(jsonb_build_object(
      'email', a.email, 'role', a.role, 'added', a.added_at, 'linked', a.user_id is not null,
      'last_sign_in', u.last_sign_in_at,
      'mfa', exists (select 1 from auth.mfa_factors f where f.user_id = u.id and f.status = 'verified')) order by a.added_at)
    from public.admin_emails a left join auth.users u on u.id = a.user_id), '[]'::jsonb);
end;
$$;

create or replace function public.admin_team_set(p_email text, p_role text)
returns void language plpgsql security definer set search_path to '' as $$
declare e text := lower(trim(p_email)); v_before text;
begin
  perform private.admin_require_role(array['owner']);
  if p_role not in ('owner', 'admin', 'support', 'marketing', 'readonly') then raise exception 'unknown role %', p_role; end if;
  if e !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then raise exception 'That doesn''t look like an email address.'; end if;
  select role into v_before from public.admin_emails where email = e;
  if v_before = 'owner' and p_role <> 'owner' and (select count(*) from public.admin_emails where role = 'owner') = 1 then
    raise exception 'There must always be at least one owner.';
  end if;
  insert into public.admin_emails (email, role) values (e, p_role) on conflict (email) do update set role = excluded.role;
end;
$$;

create or replace function public.admin_team_remove(p_email text)
returns void language plpgsql security definer set search_path to '' as $$
declare e text := lower(trim(p_email)); v_before text;
begin
  perform private.admin_require_role(array['owner']);
  select role into v_before from public.admin_emails where email = e;
  if v_before is null then return; end if;
  if v_before = 'owner' and (select count(*) from public.admin_emails where role = 'owner') = 1 then
    raise exception 'There must always be at least one owner.';
  end if;
  delete from public.admin_emails where email = e;
end;
$$;

create or replace function public.admin_audit_recent(p_limit integer default 100)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
begin
  perform private.admin_require_role(array['owner', 'admin']);
  return coalesce((select jsonb_agg(to_jsonb(a) order by a.at desc) from (
    select at, admin_email, action, target_type, target_id, before, after, reason from public.admin_audit_log
    order by at desc limit least(greatest(coalesce(p_limit, 100), 1), 500)) a), '[]'::jsonb);
end;
$$;

revoke all on function public.admin_team() from public, anon;
revoke all on function public.admin_team_set(text, text) from public, anon;
revoke all on function public.admin_team_remove(text) from public, anon;
revoke all on function public.admin_audit_recent(integer) from public, anon;
grant execute on function public.admin_team() to authenticated;
grant execute on function public.admin_team_set(text, text) to authenticated;
grant execute on function public.admin_team_remove(text) to authenticated;
grant execute on function public.admin_audit_recent(integer) to authenticated;

-- 4. Product events, written by triggers. A Hey Tribe account is a tribe (one family).
-- signup = a tribe created; key_action = a person saved something (at most once a day each);
-- activated = a second person joined the tribe; subscription events from subscriptions.status.
create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users (id) on delete cascade,
  tribe_code text,
  name text not null,
  properties jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists product_events_name_created on public.product_events (name, created_at);
create index if not exists product_events_user on public.product_events (user_id, created_at);
create index if not exists product_events_tribe on public.product_events (tribe_code, name);
alter table public.product_events enable row level security;
revoke all on public.product_events from anon, authenticated;

create or replace function private.pe_on_tribe()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.code = 'SAMPLE' then return new; end if;
  insert into public.product_events (user_id, tribe_code, name, created_at) values (new.created_by, new.code, 'signup', coalesce(new.created_at, now()));
  return new;
end;
$$;
create trigger product_events_tribe after insert on public.tribes for each row execute function private.pe_on_tribe();

create or replace function private.pe_on_doc()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.updated_by is null or new.tribe_code = 'SAMPLE' then return new; end if;
  if not exists (select 1 from public.product_events e where e.user_id = new.updated_by and e.name = 'key_action' and e.created_at >= date_trunc('day', now())) then
    insert into public.product_events (user_id, tribe_code, name, properties) values (new.updated_by, new.tribe_code, 'key_action', jsonb_build_object('what', new.col));
  end if;
  return new;
end;
$$;
create trigger product_events_doc after insert or update on public.docs for each row execute function private.pe_on_doc();

create or replace function private.pe_on_membership()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if new.tribe_code = 'SAMPLE' or coalesce(new.status, 'active') <> 'active' then return new; end if;
  if (select count(*) from public.memberships m where m.tribe_code = new.tribe_code and coalesce(m.status, 'active') = 'active' and m.removed_at is null) >= 2
     and not exists (select 1 from public.product_events e where e.tribe_code = new.tribe_code and e.name = 'activated') then
    insert into public.product_events (user_id, tribe_code, name) values ((select created_by from public.tribes where code = new.tribe_code), new.tribe_code, 'activated');
  end if;
  return new;
end;
$$;
create trigger product_events_membership after insert or update of status on public.memberships for each row execute function private.pe_on_membership();

create or replace function private.pe_on_subscription()
returns trigger language plpgsql security definer set search_path to '' as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then return new; end if;
  insert into public.product_events (user_id, tribe_code, name, properties) values (
    (select created_by from public.tribes where code = new.tribe_code), new.tribe_code,
    case
      when new.status = 'trialing' then 'trial_started'
      when new.status = 'active' then 'subscribed'
      when new.status = 'past_due' then 'payment_failed'
      when new.status = 'canceled' then 'canceled'
      else 'subscription_' || coalesce(new.status, 'changed')
    end,
    jsonb_build_object('from', case when tg_op = 'UPDATE' then old.status end, 'to', new.status, 'plan', new.plan));
  return new;
end;
$$;
create trigger product_events_subscription after insert or update of status on public.subscriptions for each row execute function private.pe_on_subscription();

-- Backfill once.
insert into public.product_events (user_id, tribe_code, name, created_at)
select t.created_by, t.code, 'signup', t.created_at from public.tribes t where t.code <> 'SAMPLE';
insert into public.product_events (user_id, tribe_code, name, created_at)
select t.created_by, t.code, 'activated', (select max(m.joined_at) from public.memberships m where m.tribe_code = t.code)
from public.tribes t
where t.code <> 'SAMPLE' and (select count(*) from public.memberships m where m.tribe_code = t.code and coalesce(m.status, 'active') = 'active' and m.removed_at is null) >= 2;
insert into public.product_events (user_id, tribe_code, name, properties, created_at)
select t.created_by, s.tribe_code, case when s.status = 'trialing' then 'trial_started' when s.status = 'active' then 'subscribed' else 'subscription_' || s.status end,
  jsonb_build_object('to', s.status, 'backfill', true), coalesce(t.created_at, s.updated_at)
from public.subscriptions s left join public.tribes t on t.code = s.tribe_code where s.tribe_code <> 'SAMPLE';

-- Marketing: campaigns and spend.
create table if not exists public.campaigns (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  channel text not null default 'paid',
  platform text,
  objective text,
  budget_cents bigint,
  daily_budget_cents bigint,
  target_cac_cents bigint,
  utm_campaign text unique,
  start_date date,
  end_date date,
  owner text,
  status text not null default 'active' check (status in ('draft', 'active', 'paused', 'ended')),
  creative_url text,
  created_at timestamptz not null default now()
);
alter table public.campaigns enable row level security;
revoke all on public.campaigns from anon, authenticated;

create table if not exists public.marketing_spend_daily (
  date date not null,
  platform text not null,
  campaign_key text not null default '',
  campaign_id uuid references public.campaigns (id) on delete set null,
  spend_cents bigint not null default 0,
  impressions bigint not null default 0,
  clicks bigint not null default 0,
  conversions bigint not null default 0,
  currency text not null default 'USD',
  source text not null default 'csv',
  imported_at timestamptz not null default now(),
  primary key (date, platform, campaign_key)
);
alter table public.marketing_spend_daily enable row level security;
revoke all on public.marketing_spend_daily from anon, authenticated;

-- One row per day for the central dashboard. Subscriptions do not record monthly vs yearly, so MRR
-- stays zero until they do (on the roadmap); paying customers is exact.
create table if not exists public.app_daily_metrics (
  date date primary key,
  app text not null default 'heytribe',
  mrr_cents bigint not null default 0,
  new_mrr_cents bigint not null default 0,
  churned_mrr_cents bigint not null default 0,
  paying_customers integer not null default 0,
  new_signups integer not null default 0,
  active_users integer not null default 0,
  trials_started integer not null default 0,
  spend_cents bigint not null default 0,
  tickets_open integer not null default 0,
  refunds_cents bigint not null default 0,
  computed_at timestamptz not null default now()
);
alter table public.app_daily_metrics enable row level security;
revoke all on public.app_daily_metrics from anon, authenticated;

create or replace function private.compute_daily_metrics(p_from date, p_to date)
returns integer language plpgsql security definer set search_path to '' as $$
declare n integer;
begin
  insert into public.app_daily_metrics as m
    (date, paying_customers, new_signups, active_users, trials_started, spend_cents, tickets_open, computed_at)
  select
    d::date,
    case when d::date = current_date
      then (select count(*) from public.subscriptions where status in ('active', 'past_due') and tribe_code <> 'SAMPLE')
      else greatest(0, (select count(*) from public.product_events e where e.name = 'subscribed' and e.created_at::date <= d::date)
                     - (select count(*) from public.product_events e where e.name = 'canceled' and e.created_at::date <= d::date))::int end,
    (select count(*) from public.product_events e where e.name = 'signup' and e.created_at::date = d::date),
    (select count(distinct e.user_id) from public.product_events e where e.name = 'key_action' and e.created_at::date = d::date),
    (select count(*) from public.product_events e where e.name = 'trial_started' and e.created_at::date = d::date),
    coalesce((select sum(x.spend_cents) from public.marketing_spend_daily x where x.date = d::date), 0),
    (select count(*) from public.tickets t where t.created_at::date <= d::date and (t.status = 'open' or (t.status <> 'open' and t.updated_at::date > d::date))),
    now()
  from generate_series(p_from, p_to, interval '1 day') d
  on conflict (date) do update set
    paying_customers = excluded.paying_customers, new_signups = excluded.new_signups, active_users = excluded.active_users,
    trials_started = excluded.trials_started, spend_cents = excluded.spend_cents, tickets_open = excluded.tickets_open,
    computed_at = excluded.computed_at;
  get diagnostics n = row_count;
  return n;
end;
$$;

select private.compute_daily_metrics((current_date - interval '365 days')::date, current_date);
select cron.schedule('heytribe-daily-metrics', '30 1 * * *', $$select private.compute_daily_metrics(current_date - 3, current_date)$$);

-- Marketing reads and writes. Channel comes from the source the site recorded when the tribe started.
create or replace function private.ht_channel(p_src text)
returns text language sql immutable set search_path to '' as $$
  select case
    when p_src is null then 'unknown'
    when lower(p_src) ~ '(cpc|ppc|paid|ads?$|gclid|fbclid|ttclid)' then 'paid'
    when lower(p_src) ~ '(google|bing|duckduckgo|yahoo|search|organic)' then 'organic'
    when lower(p_src) ~ '(facebook|instagram|tiktok|twitter|x\.com|reddit|pinterest|youtube|threads|social)' then 'social'
    when lower(p_src) ~ '(email|newsletter)' then 'email'
    when lower(p_src) ~ '(partner|affiliate)' then 'partner'
    when lower(p_src) ~ '(referral|invite|friend)' then 'referral'
    when lower(p_src) = 'direct' then 'direct'
    else 'referral'
  end;
$$;

create or replace function public.admin_marketing(p_days integer default 30)
returns jsonb language plpgsql stable security definer set search_path to '' as $$
declare v_from date := current_date - greatest(1, least(coalesce(p_days, 30), 730)) + 1;
begin
  perform private.admin_require_role(array['owner', 'admin', 'marketing', 'readonly']);
  return jsonb_build_object(
    'from', v_from,
    'channels', coalesce((select jsonb_agg(c order by c ->> 'channel') from (
      select jsonb_build_object(
        'channel', private.ht_channel(s.source),
        'signups', count(*),
        'activated', count(*) filter (where exists (select 1 from public.product_events e where e.tribe_code = t.code and e.name = 'activated')),
        'trials', count(*) filter (where exists (select 1 from public.product_events e where e.tribe_code = t.code and e.name = 'trial_started')),
        'paid', count(*) filter (where exists (select 1 from public.product_events e where e.tribe_code = t.code and e.name = 'subscribed'))) c
      from public.tribes t left join public.subscriptions s on s.tribe_code = t.code
      where t.code <> 'SAMPLE' and t.created_at::date >= v_from group by private.ht_channel(s.source)) x), '[]'::jsonb),
    'daily', coalesce((select jsonb_agg(jsonb_build_object('date', m.date, 'signups', m.new_signups, 'trials', m.trials_started, 'spend_cents', m.spend_cents, 'active', m.active_users) order by m.date)
      from public.app_daily_metrics m where m.date >= v_from), '[]'::jsonb),
    'campaigns', coalesce((select jsonb_agg(r order by (r ->> 'paid')::int desc, (r ->> 'signups')::int desc) from (
      select jsonb_build_object('utm_campaign', s.campaign, 'source', s.source, 'medium', null,
        'signups', count(*),
        'paid', count(*) filter (where exists (select 1 from public.product_events e where e.tribe_code = t.code and e.name = 'subscribed')),
        'spend_cents', coalesce((select sum(x.spend_cents) from public.marketing_spend_daily x where x.campaign_key = s.campaign and x.date >= v_from), 0)) r
      from public.tribes t join public.subscriptions s on s.tribe_code = t.code
      where t.code <> 'SAMPLE' and t.created_at::date >= v_from and s.campaign is not null
      group by s.campaign, s.source) y), '[]'::jsonb),
    'spend', coalesce((select jsonb_agg(jsonb_build_object('platform', s.platform, 'spend_cents', s.spend, 'impressions', s.imp, 'clicks', s.clk, 'conversions', s.conv) order by s.spend desc)
      from (select platform, sum(spend_cents) spend, sum(impressions) imp, sum(clicks) clk, sum(conversions) conv
            from public.marketing_spend_daily where date >= v_from group by platform) s), '[]'::jsonb),
    'attributed_share', (select round(100.0 * count(*) filter (where s.source is not null) / nullif(count(*), 0))
      from public.tribes t left join public.subscriptions s on s.tribe_code = t.code where t.code <> 'SAMPLE' and t.created_at::date >= v_from),
    'new_paying', (select count(*) from public.product_events where name = 'subscribed' and created_at::date >= v_from),
    'campaign_list', coalesce((select jsonb_agg(to_jsonb(c) order by c.created_at desc) from public.campaigns c), '[]'::jsonb)
  );
end;
$$;

create or replace function public.admin_import_spend(p_rows jsonb)
returns integer language plpgsql security definer set search_path to '' as $$
declare n integer;
begin
  perform private.admin_require_role(array['owner', 'admin', 'marketing']);
  insert into public.marketing_spend_daily as m (date, platform, campaign_key, campaign_id, spend_cents, impressions, clicks, conversions, source, imported_at)
  select (r ->> 'date')::date, lower(left(r ->> 'platform', 40)), coalesce(left(r ->> 'campaign', 200), ''),
    (select c.id from public.campaigns c where c.utm_campaign = r ->> 'campaign'),
    round(coalesce((r ->> 'spend')::numeric, 0) * 100)::bigint, coalesce((r ->> 'impressions')::bigint, 0),
    coalesce((r ->> 'clicks')::bigint, 0), coalesce((r ->> 'conversions')::bigint, 0), 'csv', now()
  from jsonb_array_elements(p_rows) r
  where (r ->> 'date') is not null and (r ->> 'platform') is not null
  on conflict (date, platform, campaign_key) do update set
    spend_cents = excluded.spend_cents, impressions = excluded.impressions, clicks = excluded.clicks,
    conversions = excluded.conversions, campaign_id = excluded.campaign_id, source = excluded.source, imported_at = now();
  get diagnostics n = row_count;
  perform private.compute_daily_metrics(
    (select min((r ->> 'date')::date) from jsonb_array_elements(p_rows) r),
    (select max((r ->> 'date')::date) from jsonb_array_elements(p_rows) r));
  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, after)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), 'marketing.spend_import', 'spend', jsonb_build_object('rows', n));
  return n;
end;
$$;

create or replace function public.admin_campaign_save(p jsonb)
returns uuid language plpgsql security definer set search_path to '' as $$
declare v uuid; v_before jsonb;
begin
  perform private.admin_require_role(array['owner', 'admin', 'marketing']);
  select to_jsonb(c) into v_before from public.campaigns c where c.id = (p ->> 'id')::uuid;
  insert into public.campaigns (id, name, channel, platform, objective, budget_cents, daily_budget_cents, target_cac_cents, utm_campaign, start_date, end_date, owner, status, creative_url)
  values (coalesce((p ->> 'id')::uuid, gen_random_uuid()), left(p ->> 'name', 200), coalesce(nullif(p ->> 'channel', ''), 'paid'),
    nullif(p ->> 'platform', ''), nullif(p ->> 'objective', ''), (p ->> 'budget_cents')::bigint, (p ->> 'daily_budget_cents')::bigint,
    (p ->> 'target_cac_cents')::bigint, nullif(p ->> 'utm_campaign', ''), (p ->> 'start_date')::date, (p ->> 'end_date')::date,
    nullif(p ->> 'owner', ''), coalesce(nullif(p ->> 'status', ''), 'active'), nullif(p ->> 'creative_url', ''))
  on conflict (id) do update set
    name = excluded.name, channel = excluded.channel, platform = excluded.platform, objective = excluded.objective,
    budget_cents = excluded.budget_cents, daily_budget_cents = excluded.daily_budget_cents, target_cac_cents = excluded.target_cac_cents,
    utm_campaign = excluded.utm_campaign, start_date = excluded.start_date, end_date = excluded.end_date, owner = excluded.owner,
    status = excluded.status, creative_url = excluded.creative_url
  returning id into v;
  insert into public.admin_audit_log (admin_id, admin_email, action, target_type, target_id, before, after)
  values (auth.uid(), (select email from auth.users where id = auth.uid()), 'marketing.campaign_save', 'campaign', v::text, v_before,
          (select to_jsonb(c) from public.campaigns c where c.id = v));
  return v;
end;
$$;

revoke all on function public.admin_marketing(integer) from public, anon;
revoke all on function public.admin_import_spend(jsonb) from public, anon;
revoke all on function public.admin_campaign_save(jsonb) from public, anon;
grant execute on function public.admin_marketing(integer) to authenticated;
grant execute on function public.admin_import_spend(jsonb) to authenticated;
grant execute on function public.admin_campaign_save(jsonb) to authenticated;
