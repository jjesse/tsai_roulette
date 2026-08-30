import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { exec } from "node:child_process";
import { fileURLToPath } from "node:url";

const REDIRECT_URI = "http://127.0.0.1:8888/callback";
const SCOPE = "playlist-read-private";
const VARS_PATH = fileURLToPath(new URL("../.dev.vars", import.meta.url));

function parseDevVars() {
  const env = {};
  if (!existsSync(VARS_PATH)) return env;
  for (const line of readFileSync(VARS_PATH, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim();
  }
  return env;
}

function openBrowser(url) {
  const command =
    process.platform === "win32"
      ? `start "" "${url}"`
      : process.platform === "darwin"
        ? `open "${url}"`
        : `xdg-open "${url}"`;
  exec(command);
}

const fileEnv = parseDevVars();
const rl = createInterface({ input, output });
const clientId = fileEnv.SPOTIFY_CLIENT_ID || (await rl.question("Spotify Client ID: ")).trim();
const clientSecret =
  fileEnv.SPOTIFY_CLIENT_SECRET || (await rl.question("Spotify Client Secret: ")).trim();
await rl.close();

if (!clientId || !clientSecret) {
  console.error("Client ID and secret are required.");
  process.exit(1);
}

const state = Math.random().toString(36).slice(2);
const authorize = new URL("https://accounts.spotify.com/authorize");
authorize.searchParams.set("client_id", clientId);
authorize.searchParams.set("response_type", "code");
authorize.searchParams.set("redirect_uri", REDIRECT_URI);
authorize.searchParams.set("scope", SCOPE);
authorize.searchParams.set("state", state);

const server = createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", REDIRECT_URI);
  if (url.pathname !== "/callback") {
    res.writeHead(404);
    res.end();
    return;
  }

  const error = url.searchParams.get("error");
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  if (error || !code || returnedState !== state) {
    res.writeHead(400, { "content-type": "text/plain" });
    res.end(`Authorization failed: ${error || "missing code"}`);
    server.close();
    process.exit(1);
    return;
  }

  const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: REDIRECT_URI,
    }),
  });
  const body = await tokenRes.json();
  if (!tokenRes.ok || !body.refresh_token) {
    res.writeHead(500, { "content-type": "text/plain" });
    res.end("Token exchange failed. See the terminal.");
    console.error(body);
    server.close();
    process.exit(1);
    return;
  }

  res.writeHead(200, { "content-type": "text/html" });
  res.end("<p>Authorized. You can close this tab and return to the terminal.</p>");
  console.log("\nAdd this to .dev.vars and Cloudflare Pages environment variables:\n");
  console.log(`SPOTIFY_REFRESH_TOKEN=${body.refresh_token}\n`);
  server.close();
  process.exit(0);
});

server.listen(8888, "127.0.0.1", () => {
  console.log("Waiting for Spotify login at", REDIRECT_URI);
  console.log("If the browser does not open, visit:\n", authorize.toString());
  openBrowser(authorize.toString());
});
