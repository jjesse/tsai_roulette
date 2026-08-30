import { fetchPlaylist } from "./api.ts";
import { loadPlayedIds, savePlayedIds } from "./played.ts";
import { pickUnplayed, randomIndex } from "../shared/playlist.ts";
import type { PlaylistPayload, Track } from "../shared/types.ts";
import { RouletteWheel } from "./wheel.ts";
import "./styles.css";

function required<T extends Element>(selector: string): T {
  const element = document.querySelector<T>(selector);
  if (!element) throw new Error(`Page is missing ${selector}`);
  return element;
}

const canvas = required<HTMLCanvasElement>("#wheel");
const spinButton = required<HTMLButtonElement>("#spin");
const statusEl = required<HTMLParagraphElement>("#status");
const resultEl = required<HTMLElement>("#result");
const remainingEl = required<HTMLParagraphElement>("#remaining");
const roundNote = required<HTMLParagraphElement>("#round-note");
const callout = required<HTMLElement>("#callout");

const wheel = new RouletteWheel(canvas);
let playlist: PlaylistPayload | null = null;
let spinning = false;

function formatDuration(ms: number): string {
  const total = Math.round(ms / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function uniqueCount(tracks: Track[]): number {
  return new Set(tracks.map((track) => track.id)).size;
}

function remainingCount(tracks: Track[], playedIds: string[]): number {
  const played = new Set(playedIds);
  return tracks.filter((track) => !played.has(track.id)).length;
}

function playedIndices(tracks: Track[], playedIds: Iterable<string>): number[] {
  const played = new Set(playedIds);
  const indices: number[] = [];
  tracks.forEach((track, index) => {
    if (played.has(track.id)) indices.push(index);
  });
  return indices;
}

function setStatus(message: string): void {
  statusEl.textContent = message;
}

function setCallout(index: number): void {
  callout.textContent = String(index + 1);
}

function showResult(track: Track): void {
  const artists = track.artists.join(", ");
  const art = track.albumArt
    ? `<img class="cover" src="${track.albumArt}" alt="${escapeHtml(track.album)} cover">`
    : `<div class="cover fallback" aria-hidden="true"></div>`;
  const explicit = track.explicit ? `<span class="explicit">E</span>` : "";

  resultEl.classList.remove("empty");
  resultEl.innerHTML = `
    ${art}
    <div class="meta">
      <p class="landed">No. ${track.number}</p>
      <h2>${escapeHtml(track.name)} ${explicit}</h2>
      <p class="artists">${escapeHtml(artists)}</p>
      <p class="album">${escapeHtml(track.album)} · ${formatDuration(track.durationMs)}</p>
      <a class="open-link" href="${track.url}" target="_blank" rel="noopener noreferrer">Open in Spotify</a>
    </div>
    <iframe
      class="embed"
      src="https://open.spotify.com/embed/track/${encodeURIComponent(track.id)}?utm_source=generator&theme=0"
      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
      loading="lazy"
      title="Spotify player for ${escapeHtml(track.name)}"
    ></iframe>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function sizeWheel(): void {
  const stage = document.querySelector<HTMLElement>(".wheel-wrap");
  const width = stage?.clientWidth ?? 420;
  const max = Math.min(width, window.innerHeight * 0.7, 720);
  wheel.resize(Math.max(280, max));
}

function refreshPlayed(playedIds: Iterable<string>): void {
  if (!playlist) return;
  wheel.setPlayedIndices(playedIndices(playlist.tracks, playedIds));
}

async function spin(): Promise<void> {
  if (!playlist || spinning) return;
  spinning = true;
  spinButton.disabled = true;
  roundNote.hidden = true;
  resultEl.classList.add("empty");
  resultEl.innerHTML = `<p>Spinning… the song stays hidden until it lands.</p>`;
  setStatus("Spinning…");

  const played = loadPlayedIds(playlist.snapshotId);
  const pick = pickUnplayed(playlist.tracks, played, randomIndex);
  savePlayedIds(playlist.snapshotId, pick.playedIds);

  if (pick.newRound) {
    roundNote.hidden = false;
    roundNote.textContent = "All songs played — starting a new round.";
    refreshPlayed([]);
  } else {
    refreshPlayed(played);
  }

  const index = pick.track.number - 1;
  await wheel.spinToIndex(index, setCallout);
  setCallout(index);
  showResult(pick.track);
  refreshPlayed(pick.playedIds);

  const left = remainingCount(playlist.tracks, pick.playedIds);
  remainingEl.textContent = `${left} of ${uniqueCount(playlist.tracks)} unique songs left this round`;
  setStatus(`Landed on ${pick.track.number}. Press play in the Spotify player.`);
  spinning = false;
  spinButton.disabled = false;
}

async function boot(): Promise<void> {
  sizeWheel();
  window.addEventListener("resize", sizeWheel);
  spinButton.addEventListener("click", () => {
    void spin();
  });
  window.addEventListener("keydown", (event) => {
    if (event.repeat) return;
    if (event.key !== " " && event.key !== "Enter") return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.tagName === "A" || target.tagName === "IFRAME")) return;
    event.preventDefault();
    void spin();
  });

  try {
    setStatus("Loading playlist…");
    playlist = await fetchPlaylist();
    wheel.setSliceCount(playlist.tracks.length);
    const played = loadPlayedIds(playlist.snapshotId);
    refreshPlayed(played);
    sizeWheel();
    setCallout(wheel.pointerIndex());
    remainingEl.textContent = `${remainingCount(playlist.tracks, played)} of ${uniqueCount(playlist.tracks)} unique songs left this round`;
    setStatus(`Ready — ${playlist.tracks.length} songs. Spin to pick a number.`);
    spinButton.disabled = false;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load playlist";
    setStatus(message);
    resultEl.classList.add("empty");
    resultEl.innerHTML = `<p>Could not load the playlist. Check Spotify credentials in <code>.dev.vars</code> or Cloudflare Pages settings.</p><p class="error-detail">${escapeHtml(message)}</p>`;
  }
}

void boot();
