# Deployment

## Environment checklist

| Service | File | Must set |
| --- | --- | --- |
| backend (API + worker) | `backend/.env` | `DATABASE_URL`, `REDIS_URL`, `RABBITMQ_URL`, `JWT_ACCESS_SECRET`, `APP_URL`, `CORS_ORIGINS`, `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (or the `S3_*` values), `GOOGLE_CLIENT_ID`, `ADMIN_USER_IDS` |
| email service | `email-microservice/.env` | `RABBITMQ_URL` (same broker and `RABBITMQ_PREFIX` as the backend), `SMTP_USER`, `SMTP_PASS`, `APP_URL` |
| frontend | Vercel project env | `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID` |

Every variable is documented in each service's `.env.example`.

**Cross-site cookies.** When the frontend and API are on different sites (for example `*.vercel.app` and `*.duckdns.org`), the refresh cookie needs `COOKIE_SECURE=true` and `COOKIE_SAMESITE=none`, and the API must be served over HTTPS. `CORS_ORIGINS` must list the exact frontend origin.

**Behind a proxy.** Keep `TRUST_PROXY=1` (one hop, e.g. nginx) so rate limits and audit logs see the real client IP.

## AWS EC2 (CodeBuild + CodeDeploy)

1. **CodeBuild** runs `buildspec.yml`. It builds two images, `my-app-backend` (API and worker) and `my-app-email`, pushes both with `latest` and the commit tag, and writes `.deploy.env` with the registry and tag.
2. **CodeDeploy** copies the bundle to `/home/ubuntu/app` (`appspec.yml`) and runs:
   - `scripts/stop_container.sh`: `docker compose down`
   - `scripts/start_container.sh`: logs in to ECR, pulls, runs `prisma migrate deploy`, then `docker compose up -d`
3. `backend/.env` and `email-microservice/.env` must already exist on the instance. The deploy stops if they're missing.

`docker-compose.yml` runs three containers from two images: `api`, `worker` (same image, `node src/workers/index.js`) and `email`. The old analytics and feed worker ECR repositories are no longer used.

To deploy by hand on the instance:

```bash
cd /home/ubuntu/app
export ECR_REGISTRY=<account>.dkr.ecr.us-east-1.amazonaws.com IMAGE_TAG=latest
./scripts/start_container.sh
```

## Render (fallback)

`render.yaml` is a blueprint for the free plan:

- `circle-api`: a web service. It runs the workers in-process with `EMBEDDED_WORKERS=*` because the free plan has no background workers, and runs `prisma migrate deploy` during build.
- `circle-email`: a web service (it exposes `/health`).

Fill in the `sync: false` variables in the dashboard. On a paid plan, remove `EMBEDDED_WORKERS` and enable the commented worker service.

Free instances sleep when idle, so the first request after a pause is slow, and queued emails wait until the email service wakes up.

## Frontend (Vercel)

- Root directory `frontend`, build `npm run build`, output `dist`.
- `vercel.json` rewrites every route to `index.html` for client-side routing.
- Set `VITE_API_URL` to the API origin (without `/api/v1`) and `VITE_GOOGLE_CLIENT_ID`. Add the Vercel domain to the backend's `CORS_ORIGINS` and `APP_URL`.
- The frontend no longer carries an ICE list. It asks the API for one at `GET /api/v1/calls/ice`, so TURN is configured on the backend (below).

## Moderators

`ADMIN_USER_IDS` is a comma separated list of user ids allowed into `/api/v1/moderation/reports` and the `/moderation` screen; everyone else gets a 403 and never sees the nav entry. Leave it empty and nobody can open the queue, which is the safe default — reports are still recorded. Set it to your own user id after the first deploy.

## TURN for calls

Without TURN, a call fails whenever both people are behind a symmetric NAT. `GET /api/v1/calls/ice` answers with the STUN list and, when TURN is configured, a credential that expires after `TURN_TTL_SECONDS`, so no long-lived secret ever reaches the browser.

Set on the backend:

```bash
STUN_URLS=stun:stun.l.google.com:19302,stun:stun1.l.google.com:19302
TURN_URLS=turn:turn.example.com:3478,turns:turn.example.com:5349
TURN_SECRET=<the same static-auth-secret as coturn>
TURN_TTL_SECONDS=3600
```

A matching coturn configuration:

```
listening-port=3478
tls-listening-port=5349
fingerprint
use-auth-secret
static-auth-secret=<the same value as TURN_SECRET>
realm=turn.example.com
no-multicast-peers
```

The credentials follow coturn's REST convention: the username is the expiry timestamp and the password is its HMAC-SHA1, base64 encoded. Leave `TURN_URLS` empty and the endpoint answers with STUN only and `turnConfigured: false`, which the call page tells the user about when a connection fails.

## Link previews

`GET /api/v1/share/posts/:id` and `/api/v1/share/u/:username` are public pages carrying Open Graph and Twitter meta and redirecting to the app. Crawlers do not run the SPA, so point them at those pages with a rule on whatever serves the frontend. For nginx:

```nginx
location ~ ^/(posts|u)/ {
  if ($http_user_agent ~* "(facebookexternalhit|Twitterbot|Slackbot|WhatsApp|LinkedInBot|Discordbot|TelegramBot|Googlebot)") {
    proxy_pass https://api.example.com/api/v1/share$request_uri;
  }
  try_files $uri /index.html;
}
```

Everyone else gets the app as usual. Without the rule, shared links still work; they just unfurl without a preview.

## Scaling out

- Run more `api` containers behind a load balancer. Sockets fan out through the Redis adapter, so enable sticky sessions only if you allow the polling transport.
- Split modules with `ENABLED_MODULES` and route `/api/v1/<basePath>` to each deployment.
- Scale workers per queue with `WORKERS=feed` / `WORKERS=notifications,analytics`. Run `WORKERS=scheduler` on exactly one instance if you like, though it is safe on several: due drafts are claimed with `FOR UPDATE SKIP LOCKED`.
