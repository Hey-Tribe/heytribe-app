import { watch } from "../../lib/api/_watch.js";
// Mail sent to hello@heytribe.app arrives in Resend (MX record on heytribe.app). Resend calls this webhook
// ("email.received"), and the message is forwarded to the support inbox with the sender as the reply address.
// Setup: Resend › Webhooks › add https://www.heytribe.app/api/inbound-email for email.received, and put its signing
// secret in Vercel (heytribe project) as RESEND_WEBHOOK_SECRET. FORWARD_TO overrides the support address.
// The Resend account also receives mail for other domains: only messages to an @heytribe.app address are forwarded.
import crypto from "node:crypto";
import PostalMime from "postal-mime";

export const config = { api: { bodyParser: false }, maxDuration: 30 };
const DOMAIN = "heytribe.app";
const FROM = () => process.env.EMAIL_FROM || "HeyTribe <hello@heytribe.app>";
const TO = () => (process.env.FORWARD_TO || "support@squaredawaylabs.com").split(",").map(s => s.trim()).filter(Boolean);
const API = "https://api.resend.com";
const MAX_ATTACH = 20 * 1024 * 1024; // bytes of base64 we are willing to pass on
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

// Resend signs webhooks the Svix way: HMAC-SHA256 of "id.timestamp.body" with the base64 secret after "whsec_".
export function verify(secret, headers, body, now = Date.now()) {
  const id = headers["svix-id"], ts = headers["svix-timestamp"], sig = headers["svix-signature"];
  if (!secret || !id || !ts || !sig) return false;
  if (!/^\d+$/.test(ts) || Math.abs(now / 1000 - Number(ts)) > 300) return false;
  const key = Buffer.from(String(secret).replace(/^whsec_/, ""), "base64");
  const want = crypto.createHmac("sha256", key).update(`${id}.${ts}.${body}`).digest();
  return String(sig).split(" ").some(part => {
    const [v, s] = part.split(",");
    if (v !== "v1" || !s) return false;
    const got = Buffer.from(s, "base64");
    return got.length === want.length && crypto.timingSafeEqual(got, want);
  });
}

const addr = s => { const m = /<([^>]+)>/.exec(String(s || "")); return (m ? m[1] : String(s || "")).trim().toLowerCase(); };
export const forUs = to => (Array.isArray(to) ? to : [to]).some(a => addr(a).endsWith("@" + DOMAIN));

async function readBody(req) {
  const chunks = [];
  for await (const c of req) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString("utf8");
}

async function resend(path, init = {}) {
  const r = await fetch(API + path, { ...init, headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json", ...(init.headers || {}) }, signal: AbortSignal.timeout(15000) });
  const text = await r.text();
  let json = null; try { json = JSON.parse(text); } catch (e) {}
  return { ok: r.ok, status: r.status, json, text };
}

// The forwarded copy: a short note of who wrote to whom, then the original message and its attachments.
export function buildForward(meta, parsed) {
  const from = meta.from || "unknown sender", to = [].concat(meta.to || []).join(", "), subject = meta.subject || "(no subject)";
  const head = `Forwarded from ${DOMAIN}. Reply to answer ${from}.`;
  const lines = [`From: ${from}`, `To: ${to}`, meta.created_at ? `Date: ${meta.created_at}` : ""].filter(Boolean);
  const text = `${head}\n${lines.join("\n")}\n\n${(parsed && parsed.text) || ""}`.trim();
  const html = `<div style="font:13px/1.5 -apple-system,Segoe UI,Arial,sans-serif;color:#555;border-bottom:1px solid #ddd;padding:0 0 10px;margin:0 0 14px">` +
    `${esc(head)}<br>${lines.map(esc).join("<br>")}</div>` +
    ((parsed && parsed.html) || `<pre style="white-space:pre-wrap;font:14px/1.5 -apple-system,Segoe UI,Arial,sans-serif">${esc((parsed && parsed.text) || "")}</pre>`);
  let size = 0;
  const attachments = ((parsed && parsed.attachments) || []).map(a => ({
    filename: a.filename || "attachment", content: String(a.content || ""), content_type: a.mimeType || undefined
  })).filter(a => (size += a.content.length) <= MAX_ATTACH);
  return { subject: /^fwd?:/i.test(subject) ? subject : `Fwd: ${subject}`, text, html, attachments, replyTo: addr(meta.from) || undefined };
}

async function handler(req, res) {
  res.setHeader("cache-control", "no-store");
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const body = await readBody(req);
  if (!verify(process.env.RESEND_WEBHOOK_SECRET, req.headers, body)) return res.status(401).json({ error: "bad signature" });
  let ev; try { ev = JSON.parse(body); } catch (e) { return res.status(400).json({ error: "bad json" }); }
  if (ev.type !== "email.received") return res.status(200).json({ ignored: ev.type });
  const d = ev.data || {};
  if (!forUs(d.to)) return res.status(200).json({ ignored: "other domain" });
  if (addr(d.from).endsWith("@" + DOMAIN)) return res.status(200).json({ ignored: "from ourselves" });
  if (!process.env.RESEND_API_KEY) return res.status(500).json({ error: "email not set up" });

  // Full message: metadata, then the raw email, parsed. If the key can't read received mail, forward what the webhook has.
  let parsed = null, meta = d;
  const got = await resend(`/emails/receiving/${encodeURIComponent(d.email_id)}`, { method: "GET" });
  if (got.ok && got.json) {
    meta = { ...d, ...got.json };
    const url = got.json.raw && got.json.raw.download_url;
    if (url) {
      try {
        const r = await fetch(url, { signal: AbortSignal.timeout(15000) });
        if (r.ok) parsed = await PostalMime.parse(await r.arrayBuffer(), { attachmentEncoding: "base64" });
      } catch (e) {}
    }
  }
  if (!parsed) parsed = { text: `(The message body couldn't be loaded. Open it in Resend › Inboxes › hello@${DOMAIN}.)` };

  const f = buildForward(meta, parsed);
  const sent = await resend("/emails", {
    method: "POST",
    headers: { "idempotency-key": `fwd-${d.email_id}` },
    body: JSON.stringify({ from: FROM(), to: TO(), subject: f.subject, text: f.text, html: f.html,
      ...(f.replyTo ? { reply_to: f.replyTo } : {}), ...(f.attachments.length ? { attachments: f.attachments } : {}) })
  });
  if (!sent.ok) return res.status(502).json({ error: "forward failed", status: sent.status });
  return res.status(200).json({ forwarded: true, id: sent.json && sent.json.id });
}

export default watch(handler);
