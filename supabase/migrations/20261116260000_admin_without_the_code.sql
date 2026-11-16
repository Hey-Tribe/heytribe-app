-- Austin, 16 Nov: no authenticator step on the admin. Roles, the audit log and
-- the audit trigger stay; only the aal2 condition comes out.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path to '' as $$
  select private.admin_email_role() is not null;
$$;

create or replace function public.admin_whoami()
returns json language plpgsql security definer set search_path to '' as $$
declare e text; r text := private.admin_email_role();
begin
  if r is null then return json_build_object('admin', false); end if;
  select lower(email) into e from auth.users where id = auth.uid();
  update public.admin_emails set user_id = auth.uid() where email = e and user_id is null;
  return json_build_object('admin', true, 'email', e, 'role', r, 'aal', coalesce(auth.jwt() ->> 'aal', 'aal1'), 'mfa_required', false);
end;
$$;

create or replace function private.admin_require_role(p_roles text[])
returns text language plpgsql stable security definer set search_path to '' as $$
declare r text := private.admin_email_role();
begin
  if r is null or not (r = any (p_roles)) then
    raise exception 'not allowed' using errcode = '42501';
  end if;
  return r;
end;
$$;

create or replace function private.audit_admin_write()
returns trigger language plpgsql security definer set search_path to '' as $$
declare
  r text := private.admin_email_role();
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
