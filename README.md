# Small Artist Roulette

A spin-and-play webpage for a Spotify playlist. The wheel shows **numbers only**. After a spin, the matching song is revealed with Spotify metadata and Spotify’s official embed player.

**Live:** [https://smallartistroulette.subatomicforge.com](https://smallartistroulette.subatomicforge.com)

Code is in this GitHub repo and deploys on **Cloudflare Pages**.

Playlist id is `SPOTIFY_PLAYLIST_ID` (owned copy used in production). Change it in `.dev.vars` / Pages secrets — no code change.

## What you get

- Full playlist load via Spotify Web API pagination
- One-piece roulette wheel (teal / pink / yellow) with numbers on the slices and the current number in the hub
- Space or Enter also spins. Generated wheel ticks and a land sting; **Sound** / **Muted** remembers the host’s choice
- Skips songs already played this session (same Spotify track id). **New session** clears the list without closing the tab. After every unique song, a new round starts
- Tonight list of landed songs, Copy to share a pick, favicon and link preview for the live URL
- Result card: title, artists, album, cover, duration, explicit flag, Open in Spotify, embed player
- Click play **inside the embed**. Premium users logged into Spotify in the browser get the full track; otherwise a preview

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

Production: [https://smallartistroulette.subatomicforge.com](https://smallartistroulette.subatomicforge.com)  
Also: [https://tsai-roulette.pages.dev](https://tsai-roulette.pages.dev)

This project is connected to GitHub. A push to `main` should build and deploy.

Manual deploy:

```bash
npm run pages:deploy
```

Build settings if you recreate the project:

- Framework preset: none
- Build command: `npm run build`
- Build output directory: `dist/client`
- Secrets: `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET`, `SPOTIFY_REFRESH_TOKEN`, `SPOTIFY_PLAYLIST_ID`

You must own or collaborate on the playlist or Spotify returns 403.

## Notes

- `.dev.vars` is gitignored. Never commit tokens.
- Visitors do not log into this app. Only your collaborator token is used, server-side, to read the playlist.
- Spotify’s Development Mode allows a small number of authorized users on the **API app**. That does not cap how many people can open the webpage.
- Content attribution: the footer links to Spotify. Covers and metadata stay in their original form.
