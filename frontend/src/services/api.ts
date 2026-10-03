export interface ScoreEntry {
  id: number; rank: number; player_name: string; score: number; played_at: string;
}
export interface Leaderboard { entries: ScoreEntry[]; total: number }
export interface GameSession { id: string; status: 'active'; player_names: string[]; created_at: string }
export interface GameResult { game_id: string; results: ScoreEntry[] }
export interface FinalScore { scores: number[]; duration_ms: number }

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 15_000);
  const externalAbort = () => controller.abort();
  options.signal?.addEventListener('abort', externalAbort, { once: true });
  if (options.signal?.aborted) controller.abort();
  try {
    const response = await fetch(path, { ...options, signal: controller.signal,
      headers: { 'Content-Type': 'application/json', ...options.headers } });
    if (!response.ok) {
      let message = `Server returned ${response.status}.`;
      try { const detail = await response.json(); if (typeof detail.detail === 'string') message = detail.detail; } catch { /* Non-JSON gateway errors. */ }
      throw new Error(message);
    }
    return await response.json() as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw new Error('The request timed out. Check that the backend is running.');
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', externalAbort);
  }
}
export const startGame = (player_names: string[]) => apiRequest<GameSession>('/api/games', {
  method: 'POST', body: JSON.stringify({ player_names }),
});
export const finishGame = (id: string, scores: FinalScore) => apiRequest<GameResult>(`/api/games/${encodeURIComponent(id)}/complete`, {
  method: 'POST', body: JSON.stringify(scores),
});
export const getLeaderboard = (limit = 10, offset = 0) => apiRequest<Leaderboard>(`/api/leaderboard?limit=${limit}&offset=${offset}`);
