# Frontend

React 19 + Vite, MUI 7 (custom theme in `src/theme`), TanStack Query and Socket.IO.

```bash
cp .env.example .env
npm install
npm run dev      # http://localhost:5173, proxies /api and /socket.io to VITE_DEV_PROXY_TARGET
npm run build    # production build in dist/
npm run lint
```

## Structure

- `src/features/<feature>`: pages, components, API services and hooks for auth, feed, posts, profile, friends, messages (chat and calls), notifications, search, settings and onboarding
- `src/components/layout`: app shell (side nav, top bar, mobile nav, incoming call dialog)
- `src/components/ui`: shared primitives
- `src/lib/apiClient.js`: axios instance with the access token and single-flight refresh
- `src/context`: socket and toast providers

## Environment

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | API origin. Empty means same origin (dev proxy) |
| `VITE_SOCKET_URL` | Socket.IO origin. Defaults to `VITE_API_URL` |
| `VITE_GOOGLE_CLIENT_ID` | Enables Google sign-in |
| `VITE_ICE_SERVERS` | Optional JSON list of STUN/TURN servers for calls |
| `VITE_DEV_PROXY_TARGET` | Backend used by the dev proxy |

`src/pages/Chatbot.jsx` is the AI assistant widget from the separate chatbot project and is kept as-is.
