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

## AWS EC2, one instance, built on the box

Four containers, defined in `docker-compose.ec2.yml`: the **API** with its workers embedded, the
**email service**, **Redis**, and **Caddy** terminating TLS in front. Postgres is Supabase and
RabbitMQ is CloudAMQP, so neither runs here — `DATABASE_URL` and `RABBITMQ_URL` point off the box.

### Why it is shaped this way

Measured resident memory of each piece:

| | resident |
| --- | --- |
| API (node + Prisma) | 218 MB |
| worker as its own process | 206 MB |
| email service | 96 MB |
| Redis | 7 MB |
| RabbitMQ, if self-hosted | 124 MB |

A `t3.micro` gives about 960 MB, and the OS plus dockerd take roughly 250 MB of it. Three decisions
follow:

- **The workers run inside the API process** (`EMBEDDED_WORKERS`), not as a second container. That is
  the largest single saving available.
- **Swap is mandatory.** `scripts/ec2-bootstrap.sh` creates 4 GB. Building the backend image needs
  more memory than the instance has, and without swap the build is killed with no clear error.
- **Every container has a `mem_limit`, and Node has `--max-old-space-size`.** Node otherwise sizes its
  heap against total machine memory and overshoots on a box this small.

### First run

```bash
sudo ./scripts/ec2-bootstrap.sh     # docker, compose plugin, 4 GB swap, log caps
# copy backend/.env.example -> backend/.env and fill it in
# copy email-microservice/.env.example -> email-microservice/.env and fill it in
printf 'API_DOMAIN=api.example.com\nACME_EMAIL=you@example.com\n' > .env
./scripts/ec2-deploy.sh
```

Before that last command: point `API_DOMAIN`'s DNS A record at the instance's public IP, and open
**only 22, 80 and 443** in the security group. Caddy cannot get a certificate until the domain
resolves and 80 is reachable. Redis is never published — it is reachable only on the compose network.

### Deploying an update

```bash
./scripts/ec2-deploy.sh --pull
```

It pulls, rebuilds what changed, runs `prisma migrate deploy` inside the API image, restarts the
containers, prunes old layers, waits for the health check and prints the database doctor's summary.
Re-running it is safe; the migrations are additive and idempotent.

### Operating it

```bash
docker compose -f docker-compose.ec2.yml ps
docker compose -f docker-compose.ec2.yml logs -f api
docker stats --no-stream
free -h
docker exec circle-api npm run db:doctor
```

Watch two things on an instance this size: `free -h` (if swap use climbs past a few hundred MB under
normal traffic, the box is too small) and CPU credit balance in CloudWatch, since `t3` instances
throttle hard once credits run out.

To roll back, check out the previous commit and re-run the deploy script. Images are built on the box,
so there is no registry tag to point back at — if you want that, use the pipeline below instead.

### Talking to the frontend

The frontend on Vercel is a different site from the API, so the refresh cookie needs
`COOKIE_SECURE=true` and `COOKIE_SAMESITE=none`, `CORS_ORIGINS` must list the exact Vercel origin, and
`VITE_API_URL` on Vercel must be `https://API_DOMAIN`. `TRUST_PROXY=1` is already set in the compose
file, because Caddy is the one proxy hop in front of the API.

## AWS EC2 with a pipeline (CodeBuild + CodeDeploy)

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
