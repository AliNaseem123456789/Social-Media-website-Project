# Email service

Consumes email jobs from RabbitMQ (`<prefix>.email.outbox`, bound to the `<prefix>.email` exchange), renders them with Handlebars and sends them over SMTP.

## Email types

`welcome`, `verify-email`, `password-reset`, `password-changed`, `new-message`, `post-like`, `comment`, `friend-request`.

Each type is defined in `src/handlers/index.js` (payload schema, subject, plain-text body), and its HTML lives in `src/mail/templates/<type>.hbs` inside the shared `layout.hbs`. Values are HTML-escaped, so user content can't inject markup.

## Reliability

- Failed sends are retried through `<queue>.retry.<n>` queues with the delays in `RABBITMQ_RETRY_DELAYS_MS`, then parked in `<queue>.dlq`.
- Invalid payloads and unknown types go straight to the DLQ.
- The RabbitMQ connection reconnects with back-off. `/ready` reports broker status.

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start with reload |
| `npm start` | Production start |
| `npm run preview` | Render every template with sample data into `./preview` |
| `npm run lint` | ESLint |

Set `MAIL_TRANSPORT=log` to render emails without sending them.
