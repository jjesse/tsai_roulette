const STORAGE_KEY = "tsai-roulette-played";

export type HistoryItem = {
  number: number;
  id: string;
  name: string;
  artists: string[];
};

export type SessionState = {
  snapshotId: string;
  ids: string[];
  history: HistoryItem[];
};

export function emptySession(snapshotId: string): SessionState {
  return { snapshotId, ids: [], history: [] };
}

export function parseSessionState(raw: string | null, snapshotId: string): SessionState {
  if (!raw) return emptySession(snapshotId);
  try {
    const parsed = JSON.parse(raw) as Partial<SessionState>;
    if (parsed.snapshotId !== snapshotId) return emptySession(snapshotId);
    const ids = Array.isArray(parsed.ids) ? parsed.ids.filter((id) => typeof id === "string") : [];
    const history = Array.isArray(parsed.history)
      ? parsed.history.filter(
          (item): item is HistoryItem =>
            Boolean(
              item &&
                typeof item === "object" &&
                typeof item.number === "number" &&
                typeof item.id === "string" &&
                typeof item.name === "string" &&
                Array.isArray(item.artists),
            ),
        )
      : [];
    return { snapshotId, ids, history };
  } catch {
    return emptySession(snapshotId);
  }
}

export function appendHistory(state: SessionState, item: HistoryItem): SessionState {
  if (state.history.some((entry) => entry.id === item.id)) return state;
  return { ...state, history: [item, ...state.history] };
}

export function loadSession(snapshotId: string): SessionState {
  return parseSessionState(sessionStorage.getItem(STORAGE_KEY), snapshotId);
}

export function saveSession(state: SessionState): void {
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function loadPlayedIds(snapshotId: string): string[] {
  return loadSession(snapshotId).ids;
}

export function savePlayedIds(snapshotId: string, ids: string[]): void {
  const current = loadSession(snapshotId);
  saveSession({ ...current, snapshotId, ids });
}

export function savePlayedWithHistory(snapshotId: string, ids: string[], item: HistoryItem): SessionState {
  const current = loadSession(snapshotId);
  const next = appendHistory({ ...current, snapshotId, ids }, item);
  saveSession(next);
  return next;
}

export function clearPlayedIds(): void {
  sessionStorage.removeItem(STORAGE_KEY);
}
