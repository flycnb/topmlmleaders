# send-push

Supabase Edge Function: sends **Firebase Cloud Messaging (HTTP v1)** push when invoked (intended for **Database Webhooks** on `public.notifications` inserts).

## Behavior

- `POST` JSON body expects a **`record`** shaped like a `notifications` row (`user_id`, `type`, `text`, `link`, `id`, …).
- Only **`type`** `follow` and **`message`** trigger a send; others return `{ ok: true, skipped: true }`.
- Loads **`users.fcm_token`** for `record.user_id` via **service role** Supabase client.
- Obtains Google OAuth2 access token from **service account JWT** (`FIREBASE_*` secrets), then calls **FCM v1** `messages:send`.
- Clears **`fcm_token`** if FCM returns unregistered / not found token errors.

## Secrets (Supabase project)

| Secret | Purpose |
|--------|---------|
| `FIREBASE_PROJECT_ID` | FCM v1 URL project segment |
| `FIREBASE_CLIENT_EMAIL` | JWT `iss` / `sub` |
| `FIREBASE_PRIVATE_KEY` | PEM PKCS#8 (escaped `\n` ok) |
| `SEND_PUSH_WEBHOOK_SECRET` | If set, requires `Authorization: Bearer <secret>` |
| `PUBLIC_SITE_URL` | Base URL for relative `link` values (fallback: topmlmleaders.com) |

Auto-provided on hosted Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

## Webhook

Configure a **Database Webhook** on `public.notifications` **INSERT** (or equivalent) to `POST` this function URL with the payload shape your dashboard emits, and set the same bearer secret in the webhook caller if you use `SEND_PUSH_WEBHOOK_SECRET`.

## Deploy

```bash
npx supabase functions deploy send-push --project-ref <ref>
```
