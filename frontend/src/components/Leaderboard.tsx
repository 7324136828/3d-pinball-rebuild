import { useEffect, useState } from 'react';
import { getLeaderboard, type Leaderboard as Ranking } from '../services/api';

const number = new Intl.NumberFormat();
export function Leaderboard({ compact = false, refresh = 0, visible = true }: { compact?: boolean; refresh?: number; visible?: boolean }) {
  const [ranking, setRanking] = useState<Ranking | null>(null);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const limit = compact ? 5 : 10;
  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    const load = async () => {
      try {
        const result = await getLeaderboard(limit, page * limit);
        if (!cancelled) { setRanking(result); setError(''); }
      } catch (failure) {
        if (!cancelled) setError(failure instanceof Error ? failure.message : 'Rankings are unavailable.');
      } finally { if (!cancelled) setLoading(false); }
    };
    setLoading(true);
    void load();
    const timer = setInterval(() => { void load(); }, 15_000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [compact, refresh, page, revision, limit, visible]);

  return <section className={`leaderboard ${compact ? 'compact' : ''}`} aria-labelledby={compact ? 'top-pilots' : 'ranking-title'}>
    <div className="section-title"><div><span className="eyebrow">Flight records</span><h2 id={compact ? 'top-pilots' : 'ranking-title'}>{compact ? 'Top pilots' : 'The leaderboard'}</h2></div>
      <button className="icon-button" aria-label="Refresh rankings" title="Refresh rankings" onClick={() => setRevision(value => value + 1)}>↻</button>
    </div>
    {!compact && <p className="muted">Every completed flight, saved locally in SQLite. Highest scores lead; equal scores share a rank.</p>}
    {error && <p className="message error" role="alert">{error} <button className="text-button" onClick={() => setRevision(value => value + 1)}>Retry</button></p>}
    {loading && !ranking ? <p className="empty-state" role="status">Retrieving flight records…</p> : ranking?.entries.length ?
      <div className="table-scroll"><table>
        <thead><tr><th scope="col">Rank</th><th scope="col">Pilot</th><th scope="col" className="align-right">Score</th>{!compact && <th scope="col" className="completed-column">Completed</th>}</tr></thead>
        <tbody>{ranking.entries.map(entry => <tr key={entry.id}>
          <td><span className={`rank rank-${entry.rank}`}>{String(entry.rank).padStart(2, '0')}</span></td>
          <td className="pilot-name">{entry.player_name}</td><td className="score-cell">{number.format(entry.score)}</td>
          {!compact && <td className="date-cell">{new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(entry.played_at))}</td>}
        </tr>)}</tbody>
      </table></div> : !error && <div className="empty-state"><span aria-hidden="true">✦</span><p>No flights recorded yet.<br />Your first complete game starts the story.</p></div>}
    {!compact && ranking && ranking.total > limit && <div className="pagination">
      <button className="secondary-button" disabled={loading || page === 0} onClick={() => setPage(value => value - 1)}>Previous</button>
      <span>{page * limit + 1}–{Math.min((page + 1) * limit, ranking.total)} of {number.format(ranking.total)} flights</span>
      <button className="secondary-button" disabled={loading || (page + 1) * limit >= ranking.total} onClick={() => setPage(value => value + 1)}>Next</button>
    </div>}
  </section>;
}
