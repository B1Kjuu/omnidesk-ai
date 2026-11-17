# Milestone 1: launch safely — setup checklist

The code for every item below is in the repo and does nothing until its keys are set,
so the deployed site keeps working while you go through this list one step at a time.

## 1. Database migration (rate limits + escalation recipient)

File: `supabase/migrations/20261117090000_notifications_and_rate_limits.sql`

```powershell
npx supabase db push --remote --dry-run
npx supabase db push --remote --yes
```

Adds `organizations.notification_email`, the `rate_limits` table (RLS on, no policies, so only the server
can touch it), and two functions. Until it is applied, the chat still works: the rate limiter fails open,
and emails go to the organization creator.

## 2. Supabase Auth (password reset + email confirmation)

Supabase dashboard → Authentication:

1. **URL Configuration**
   - Site URL: `https://<your-vercel-domain>`
   - Redirect URLs: add `https://<your-vercel-domain>/auth/confirm` and `http://localhost:3000/auth/confirm`
2. **Email Templates** (optional but recommended: branded, and links work even if opened in another browser)
   - Confirm signup → subject `Confirm your OmniDesk account`, body = `supabase/templates/confirm-signup.html`
   - Reset Password → subject `Reset your OmniDesk password`, body = `supabase/templates/reset-password.html`
3. **Emails**: Supabase's built-in sender is limited to a few emails per hour. For real users add custom
   SMTP (Authentication → Emails → SMTP Settings), for example Resend or a Gmail app password.

## 3. Cloudflare Turnstile (bot check on the public chat)

1. dash.cloudflare.com → Turnstile → Add widget. Hostnames: your Vercel domain and `localhost`. Mode: Managed.
2. Vercel → Project → Settings → Environment Variables:
   - `NEXT_PUBLIC_TURNSTILE_SITE_KEY` = site key
   - `TURNSTILE_SECRET_KEY` = secret key
3. Redeploy (the `NEXT_PUBLIC_` value is baked in at build time).

## 4. Sentry (error monitoring)

1. sentry.io → create a project, platform **Next.js**. Copy the DSN.
2. Vercel env vars: `NEXT_PUBLIC_SENTRY_DSN` and `SENTRY_DSN` = the DSN.
3. Optional, for readable stack traces: `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`
   (Sentry → Settings → Auth Tokens, scope `project:releases`).
4. Redeploy. Every `console.error` in the chat route (Gemini failure, n8n failure, limiter offline) now
   becomes a Sentry issue.

## 5. n8n escalation email (new layout + configurable recipient)

The email is now rendered by the app (`lib/email/escalationEmail.ts`) and sent in the webhook body.
In the n8n workflow, open the **Send Email** (SMTP) node and set (switch each field to *Expression*):

| Field | Value |
|---|---|
| From Email | your sending address, e.g. `OmniDesk <you@yourdomain.com>` (must be allowed by your SMTP account) |
| To Email | `{{ $json.body.notifyEmail }}` |
| Subject | `{{ $json.body.email.subject }}` |
| Email Format | Both |
| Text | `{{ $json.body.email.text }}` |
| HTML | `{{ $json.body.email.html }}` |
| Options → Reply To | `{{ $json.body.replyTo }}` |
| Options → Append n8n Attribution | off |

If the Webhook node sits directly before Send Email, `$json.body` is right. If another node is in
between, use `$('Webhook').item.json.body.notifyEmail` (and so on) instead.

Who receives it is chosen per organization in **Dashboard → Organizations → Escalation emails go to**.
Empty means the organization creator's sign-in email.

Optional webhook hardening: on the **Webhook** node set Authentication → Header Auth, header name
`x-omnidesk-secret`, value = a long random string; set the same string as `N8N_WEBHOOK_SECRET` in Vercel.

Abuse guard: each organization sends at most 30 escalation emails per hour; above that the ticket is
still created and the Automation page shows the event as failed with the reason.

## Limits in force

| What | Limit |
|---|---|
| Questions per visitor | 6 per minute, 60 per day |
| Questions per organization | 300 per hour |
| Escalation emails per organization | 30 per hour |

Change them in `app/api/chat/route.ts` (`CHAT_LIMITS`, `EMAIL_LIMIT`).
