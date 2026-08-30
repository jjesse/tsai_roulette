import { createServer } from "node:http";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const REDIRECT_URI = "http://127.0.0.1:8888/callback";
const SCOPE = "playlist-read-private playlist-read-collaborative";
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

function upsertDevVar(key, value) {
  const existing = existsSync(VARS_PATH) ? readFileSync(VARS_PATH, "utf8") : "";
  const line = `${key}=${value}`;
  const pattern = new RegExp(`^${key}=.*$`, "m");
  const next = pattern.test(existing)
    ? existing.replace(pattern, line)
    : `${existing.trimEnd()}\n${line}\n`;
  writeFileSync(VARS_PATH, next.endsWith("\n") ? next : `${next}\n`);
}

function openBrowser(url) {
  const child =
    process.platform === "win32"
      ? spawn(
          "powershell.exe",
          ["-NoProfile", "-NonInteractive", "-Command", `Start-Process '${url.replace(/'/g, "''")}'`],
          { detached: true, stdio: "ignore", windowsHide: true },
        )
      : process.platform === "darwin"
        ? spawn("open", [url], { detached: true, stdio: "ignore" })
        : spawn("xdg-open", [url], { detached: true, stdio: "ignore" });
  child.unref();
}

const fileEnv = parseDevVars();
const clientId = fileEnv.SPOTIFY_CLIENT_ID;
const clientSecret = fileEnv.SPOTIFY_CLIENT_SECRET;

if (!clientId || !clientSecret) {
  console.error("Set SPOTIFY_CLIENT_ID and SPOTIFY_CLIENT_SECRET in .dev.vars first.");
  process.exitCode = 1;
} else {
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
      res.writeHead(400, { "content-type": "text/plain; charset=utf-8" });
      res.end(`Authorization failed: ${error || "missing code"}`);
      server.close();
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
      res.writeHead(500, { "content-type": "text/plain; charset=utf-8" });
      res.end("Token exchange failed. See the terminal.");
      console.error(body);
      server.close();
      return;
    }

    upsertDevVar("SPOTIFY_REFRESH_TOKEN", body.refresh_token);
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end("<p>Authorized. You can close this tab and return to the terminal.</p>");
    console.log("Saved SPOTIFY_REFRESH_TOKEN to .dev.vars");
    console.log("Also add that token to Cloudflare Pages environment variables.\n");
    server.close();
  });

  server.listen(8888, "127.0.0.1", () => {
    const authorizeUrl = authorize.toString();
    console.log("Waiting for Spotify login at", REDIRECT_URI);
    console.log("If the browser shows 'response_type must be code', paste this FULL URL into the address bar:\n");
    console.log(authorizeUrl, "\n");
    openBrowser(authorizeUrl);
  });
}
