//
// Checks assistantClient against a local stub that speaks the assistant service's contract: the shared
// secret, the request shape, the timeout, and — the part that matters — that a short, mis-sized, refused
// or slow response is discarded rather than half-applied. A misaligned batch would attach every vector
// to the wrong post.
//
// Needs nothing set up; it starts its own server on a random port:  npm run verify:assistant
//
import http from "node:http";

const SECRET = "an-internal-secret-long-enough";
let seen = null;
let mode = "ok";

const server = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    seen = { path: req.url, secret: req.headers["x-internal-secret"], body: JSON.parse(body || "{}") };
    if (mode === "slow") await new Promise((r) => setTimeout(r, 3000));
    if (mode === "401") { res.writeHead(401); return res.end("{}"); }
    if (mode === "short") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ vectors: [Array(768).fill(0.1)] }));
    }
    if (mode === "wrong-width") {
      res.writeHead(200, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ vectors: seen.body.texts.map(() => Array(384).fill(0.1)) }));
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ vectors: seen.body.texts.map(() => Array(768).fill(0.1)), dimensions: 768 }));
  });
});

await new Promise((r) => server.listen(0, "127.0.0.1", r));
const port = server.address().port;

process.env.ASSISTANT_URL = `http://127.0.0.1:${port}`;
process.env.ASSISTANT_INTERNAL_SECRET = SECRET;
process.env.ASSISTANT_TIMEOUT_MS = "1000";

const { assistantClient } = await import("#shared/assistant-client.js");

let failures = 0;
const check = (label, condition, detail = "") => {
  if (condition) console.log(`  ok   ${label}`);
  else { failures += 1; console.log(`  FAIL ${label} ${detail}`); }
};

check("available once configured", assistantClient.available === true);

const vectors = await assistantClient.embed(["one", "two"]);
check("two texts, two vectors", vectors?.length === 2, JSON.stringify(vectors?.length));
check("it calls /internal/embed", seen.path === "/internal/embed", seen.path);
check("it sends the shared secret", seen.secret === SECRET, seen.secret);
check("it sends the texts", JSON.stringify(seen.body.texts) === '["one","two"]', JSON.stringify(seen.body));

check("an empty batch never leaves the process", JSON.stringify(await assistantClient.embed([])) === "[]");

mode = "short";
check("a short batch is discarded, not misaligned", (await assistantClient.embed(["a", "b"])) === null);

mode = "wrong-width";
check("wrong dimensions are discarded", (await assistantClient.embed(["a"])) === null);

mode = "401";
check("a refusal reads as unavailable, not a throw", (await assistantClient.embed(["a"])) === null);

mode = "slow";
const started = Date.now();
check("a slow service times out", (await assistantClient.embed(["a"])) === null);
const waited = Date.now() - started;
check("and it times out at the configured limit", waited < 2000, `waited ${waited}ms`);

server.close();
console.log(failures ? `\n${failures} failed` : "\nall good");
process.exit(failures ? 1 : 0);
