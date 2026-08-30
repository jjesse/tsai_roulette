const STORAGE_KEY = "tsai-roulette-played";

type PlayedState = {
  snapshotId: string;
  ids: string[];
};

function read(snapshotId: string): string[] {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PlayedState;
    if (parsed.snapshotId !== snapshotId) return [];
    return Array.isArray(parsed.ids) ? parsed.ids.filter((id) => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function loadPlayedIds(snapshotId: string): string[] {
  return read(snapshotId);
}

export function savePlayedIds(snapshotId: string, ids: string[]): void {
  const state: PlayedState = { snapshotId, ids };
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
