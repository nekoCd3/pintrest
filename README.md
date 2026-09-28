# Openlane

Openlane is a password-protected web proxy interface powered by Ultraviolet and Wisp.

## Run locally

Requires Node.js 24 or later. Install dependencies, then start the server with credentials:

```sh
npm install
PROXY_USERNAME=owner PROXY_PASSWORD='replace-with-a-long-password' npm start
```

Open `http://localhost:8080`. The browser will request the configured username and password. Use a strong, unique password and keep it in your hosting provider's secret/environment-variable settings, not in source control.

## Deploy to Render

The included `render.yaml` creates a Node web service for `prox.meot.dev` and prompts for the proxy credentials as secret environment variables.

1. In Render, create a Blueprint and select this GitHub repository.
2. Enter a unique `PROXY_USERNAME` and a long, unique `PROXY_PASSWORD` when prompted.
3. In the DNS provider for `meot.dev`, add a CNAME record with name `prox` and target `prox-meot-dev.onrender.com`. Remove any conflicting record for `prox`.
4. Wait for Render to verify the domain and provision its HTTPS certificate, then open `https://prox.meot.dev`.

The Blueprint uses Render's free plan, which may spin down while idle. Change `plan` to `starter` in `render.yaml` for an always-on service; that plan is paid. The `/healthz` route is public for health checks. The homepage and proxy WebSocket are protected with HTTP Basic Authentication; do not remove that protection.
