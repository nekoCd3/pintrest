import { createHash, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import wisp from "wisp-server-node";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";

const root = fileURLToPath(new URL(".", import.meta.url));
const username = process.env.PROXY_USERNAME;
const password = process.env.PROXY_PASSWORD;

if (!username || !password || username.includes(":")) {
  throw new Error("Set PROXY_USERNAME and PROXY_PASSWORD; the username cannot contain a colon.");
}

const expectedCredentials = createHash("sha256")
  .update(`${username}:${password}`)
  .digest();

function isAuthorized(request) {
  const header = request.headers.authorization ?? "";

  if (!header.startsWith("Basic ")) return false;

  const suppliedCredentials = Buffer.from(header.slice(6), "base64");
  const suppliedDigest = createHash("sha256").update(suppliedCredentials).digest();
  return timingSafeEqual(expectedCredentials, suppliedDigest);
}

function requireAuth(request, response, next) {
  if (!isAuthorized(request)) {
    response.setHeader("WWW-Authenticate", 'Basic realm="Openlane", charset="UTF-8"');
    response.status(401).send("Authentication required.");
    return;
  }

  next();
}

const app = express();
app.get("/healthz", (_request, response) => response.status(200).send("ok"));
app.use(requireAuth);
app.get("/", (_request, response) => response.sendFile(join(root, "index.html")));
app.use(express.static(join(root, "public"), { index: false }));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));
app.use((_request, response) => response.sendStatus(404));

const server = createServer((request, response) => {
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  app(request, response);
});

server.on("upgrade", (request, socket, head) => {
  if (!isAuthorized(request)) {
    socket.end(
      'HTTP/1.1 401 Unauthorized\r\nWWW-Authenticate: Basic realm="Openlane", charset="UTF-8"\r\nConnection: close\r\nContent-Length: 0\r\n\r\n',
    );
    return;
  }

  if (request.url?.startsWith("/wisp/")) {
    wisp.routeRequest(request, socket, head);
    return;
  }

  socket.end("HTTP/1.1 404 Not Found\r\nConnection: close\r\n\r\n");
});

const port = Number(process.env.PORT || 8080);
server.listen(port, "0.0.0.0", () => {
  console.log(`Openlane listening on port ${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(() => process.exit(0));
  });
}