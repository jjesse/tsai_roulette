# Small Artist Roulette

A spin-and-play webpage for a Spotify playlist. The wheel shows **numbers only**. After a spin, the matching song is revealed with Spotify metadata and Spotify’s official embed player.

Code lives in this GitHub repo. The site is meant to be hosted on **Cloudflare Pages**.

Playlist used by default: [Small Artist Roulette](https://open.spotify.com/playlist/46gpuUdvKMnXSxGb5yTdAr) (`46gpuUdvKMnXSxGb5yTdAr`). Change it later with `SPOTIFY_PLAYLIST_ID` — no code change.

## What you get

- Full playlist load via Spotify Web API pagination (not the public webpage scrape)
- Roulette wheel for a living-room TV: sparse rim numbers plus a jumbo callout under the pointer. Song titles stay hidden until it lands. Space or Enter also spins.
- Independent-looking spins that **skip songs already played this visit** (same Spotify track id). After every unique song has been heard, a new round starts
- Result card: title, artists, album, cover, duration, explicit flag, Open in Spotify, embed player
- Click play **inside the embed**. Do not expect autoplay. Premium users logged into Spotify in the browser get the full track; others get a preview

## Local setup

You need Node.js 20+, a Spotify developer app, and collaborator (or owner) access on the playlist.

1. Copy `.dev.vars.example` to `.dev.vars`.
2. Create an app at [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard).
   - Development Mode needs Spotify Premium on the **app owner**.
   - Add yourself as an authorized user.
   - Redirect URI: `http://127.0.0.1:8888/callback`
3. Put `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` in `.dev.vars`.
4. Run the one-time login as the playlist collaborator:

   ```bash
   npm install
   npm run spotify:auth
   ```

   Paste the printed `SPOTIFY_REFRESH_TOKEN` into `.dev.vars`.
5. Set `SPOTIFY_PLAYLIST_ID` (default is already the Small Artist Roulette id).
6. Start the site (Vite + Cloudflare plugin; `/api/playlist` runs in workerd):

   ```bash
   npm run dev
   ```

   Open the URL Vite prints (usually `http://127.0.0.1:5173`).

```bash
npm test
npm run build
```

## Cloudflare Pages

1. Push this repo to GitHub.
2. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**.
3. Build settings:
   - Framework preset: none
   - Build command: `npm run build`
   - Build output directory: `dist/client`
4. Environment variables (Production, encrypt the secrets):
   - `SPOTIFY_CLIENT_ID`
   - `SPOTIFY_CLIENT_SECRET`
   - `SPOTIFY_REFRESH_TOKEN`
   - `SPOTIFY_PLAYLIST_ID`
5. Deploy. Pages Functions pick up `functions/api/playlist.ts` as `GET /api/playlist`.

Change the playlist later by updating `SPOTIFY_PLAYLIST_ID` in Cloudflare. You must own or collaborate on that playlist or Spotify returns 403.

## Notes

- `.dev.vars` is gitignored. Never commit tokens.
- Visitors do not log into this app. Only your collaborator token is used, server-side, to read the playlist.
- Spotify’s Development Mode allows a small number of authorized users on the **API app**. That does not cap how many people can open the webpage.
- Content attribution: the footer links to Spotify. Covers and metadata stay in their original form.
