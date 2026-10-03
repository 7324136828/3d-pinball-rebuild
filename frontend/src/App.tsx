import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { Playfield, type PlayfieldControl } from './components/Playfield';
import { Leaderboard } from './components/Leaderboard';
import type { GameSnapshot } from './pinball/engine.js';
import { finishGame, startGame, type FinalScore, type GameResult, type GameSession } from './services/api';

const format = new Intl.NumberFormat();
type PendingScore = { session: GameSession; payload: FinalScore };
type Submission = 'idle' | 'saving' | 'saved' | 'error' | 'unranked';
function storedName() {
  try {
    // Keep existing saved nicknames when upgrading from the former app name.
    return (localStorage.getItem('modern-3d-pinball.player-name') || localStorage.getItem('genesis.player-name'))?.slice(0, 32) || 'Cadet';
  } catch { return 'Cadet'; }
}
function cleanText(value: string | undefined, fallback: string) { return value?.trim().replace(/\r/g, '') || fallback; }

export default function App() {
  const game = useRef<PlayfieldControl>(null);
  const activeSession = useRef<{ session: GameSession; startedAt: number } | null>(null);
  const startingRef = useRef(false);
  const savingRef = useRef(false);
  const pendingRef = useRef<PendingScore | null>(null);
  const briefingRef = useRef<HTMLDialogElement>(null);
  const [ready, setReady] = useState(false);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [view, setView] = useState<'play' | 'rankings'>('play');
  const [names, setNames] = useState<string[]>([storedName(), 'Pilot 2', 'Pilot 3', 'Pilot 4']);
  const [playerCount, setPlayerCount] = useState(1);
  const [session, setSession] = useState<GameSession | null>(null);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState('');
  const [submission, setSubmission] = useState<Submission>('idle');
  const [saveError, setSaveError] = useState('');
  const [result, setResult] = useState<GameResult | null>(null);
  const [ended, setEnded] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [sound, setSound] = useState(false);
  const [camera, setCamera] = useState<'cabinet' | 'overhead'>('cabinet');
  const [soundError, setSoundError] = useState('');
  const [heldButtons, setHeldButtons] = useState<Set<string>>(new Set());

  const paused = Boolean(snapshot?.paused);
  const running = Boolean(session && !ended);
  const score = (snapshot?.scoreBillions || 0) * 1_000_000_000 + (snapshot?.score || 0);
  const power = Math.max(0, Math.min(1, snapshot?.plungerCharge || 0));
  const waitingBall = snapshot?.balls.some(ball => ball.active && ball.x < -6 && ball.y > 9 && ball.speed < 3);
  const busy = starting || submission === 'saving' || submission === 'error';

  async function submitScores(pending: PendingScore) {
    if (savingRef.current) return;
    savingRef.current = true;
    setSubmission('saving');
    setSaveError('');
    try {
      const completed = await finishGame(pending.session.id, pending.payload);
      setResult(completed);
      pendingRef.current = null;
      setSubmission('saved');
      setRefresh(value => value + 1);
    } catch (failure) {
      setSubmission('error');
      setSaveError(failure instanceof Error ? failure.message : 'The score could not be saved.');
    } finally { savingRef.current = false; }
  }

  function gameOver(state: GameSnapshot) {
    const active = activeSession.current;
    if (!active) return;
    activeSession.current = null;
    setEnded(true);
    setHeldButtons(new Set());
    if (state.cheatsUsed) { setSubmission('unranked'); return; }
    const pending = { session: active.session, payload: {
      scores: state.playerScores.map(value => Math.max(0, Math.trunc(value))),
      duration_ms: Math.max(0, Math.round(performance.now() - active.startedAt)),
    } };
    pendingRef.current = pending;
    void submitScores(pending);
  }

  async function newGame() {
    if (!ready || startingRef.current || savingRef.current || pendingRef.current) return;
    const playerNames = names.slice(0, playerCount).map(name => name.trim());
    if (playerNames.some(name => name.length < 1 || name.length > 32)) { setStartError('Enter a pilot name of 1–32 characters for each player.'); return; }
    startingRef.current = true;
    setStarting(true);
    setStartError('');
    try {
      const created = await startGame(playerNames);
      activeSession.current = { session: created, startedAt: performance.now() };
      game.current?.start(playerNames.length);
      setSession(created);
      setEnded(false);
      setSubmission('idle');
      setResult(null);
      setView('play');
      setHeldButtons(new Set());
      try { localStorage.setItem('modern-3d-pinball.player-name', playerNames[0]); } catch { /* Storage is optional. */ }
    } catch (failure) {
      setStartError(`Could not start a ranked flight. ${failure instanceof Error ? failure.message : 'Check the backend connection.'}`);
    } finally { startingRef.current = false; setStarting(false); }
  }

  function navigate(next: 'play' | 'rankings') {
    if (next === 'rankings' && running) game.current?.pause(true);
    setView(next);
  }
  function showBriefing() {
    if (running) game.current?.pause(true);
    setHeldButtons(new Set());
    briefingRef.current?.showModal();
  }
  async function toggleSound() {
    try { setSound(await game.current?.sound(!sound) || false); setSoundError(''); }
    catch { setSoundError('Audio could not start. Try enabling sound again.'); }
  }
  function toggleCamera() {
    const next = camera === 'cabinet' ? 'overhead' : 'cabinet';
    game.current?.camera(next); setCamera(next);
  }
  function hold(event: PointerEvent<HTMLButtonElement>, action: string) {
    event.preventDefault();
    if (!running || paused) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    game.current?.input(action, true, `pointer:${event.pointerId}`);
    setHeldButtons(current => new Set(current).add(action));
  }
  function release(event: PointerEvent<HTMLButtonElement>, action: string) {
    game.current?.input(action, false, `pointer:${event.pointerId}`);
    setHeldButtons(current => { const next = new Set(current); next.delete(action); return next; });
  }
  useEffect(() => { if (paused || !running) setHeldButtons(new Set()); }, [paused, running]);

  function holdControl(action: string, label: string, shortcut: string) {
    return <button className={`hold-button ${heldButtons.has(action) ? 'is-held' : ''}`} disabled={!running || paused}
      aria-label={label} onPointerDown={event => hold(event, action)} onPointerUp={event => release(event, action)}
      onPointerCancel={event => release(event, action)} onLostPointerCapture={event => release(event, action)}
      onContextMenu={event => event.preventDefault()}
      onKeyDown={event => { if (event.code === 'Enter') { event.preventDefault(); game.current?.input(action, true, `button:${action}`); } }}
      onKeyUp={event => { if (event.code === 'Enter') { event.preventDefault(); game.current?.input(action, false, `button:${action}`); } }}>
      <span>{label}</span><kbd>{shortcut}</kbd>
    </button>;
  }

  return <main className="app-shell">
    <header className="site-header">
      <a className="brand" href="#play" onClick={event => { event.preventDefault(); navigate('play'); }} aria-label="Modern 3D Pinball home">
        <span className="brand-mark" aria-hidden="true">✦</span><span className="brand-name"><span>Modern 3D</span>{' '}<span>Pinball</span><small>SPACE CADET REIMAGINED</small></span>
      </a>
      <nav aria-label="Main navigation"><button className={view === 'play' ? 'active' : ''} onClick={() => navigate('play')}>Play</button><button className={view === 'rankings' ? 'active' : ''} onClick={() => navigate('rankings')}>Rankings</button></nav>
      <div className="header-meta"><span className={`status-dot ${ready ? 'online' : ''}`} aria-hidden="true" />{ready ? 'Table ready' : 'Connecting'}</div>
    </header>

    <div className="page-heading"><div><span className="eyebrow">{view === 'play' ? 'The arcade, reimagined' : 'A place in the stars'}</span><h1>{view === 'play' ? 'Your next mission starts here.' : 'Every flight leaves a mark.'}</h1></div><p>{view === 'play' ? 'The classic table. A new perspective.' : 'Local rankings. Real pinball scores.'}</p></div>

    <div className={`play-layout ${view !== 'play' ? 'view-hidden' : ''}`}>
      <section className="cabinet" aria-label="Playable pinball cabinet">
        <div className="cabinet-top"><span className="eyebrow">SPACE CADET</span><span className="flight-status">{snapshot?.tilted ? 'TILT' : paused && running ? 'PAUSED' : ended ? 'FLIGHT COMPLETE' : running ? 'IN FLIGHT' : 'AWAITING PILOT'}</span></div>
        <div className="game-surface">
          <Playfield ref={game} visible={view === 'play'} onReady={setReady} onState={setSnapshot} onGameOver={gameOver} onNewGame={newGame} />
          {ready && !session && <div className="welcome-prompt"><span>01 / PREPARE FOR LAUNCH</span><h2>A little gravity.<br />A lot of possibility.</h2><p>Enter your pilot name, then start a flight.</p></div>}
          {running && paused && <div className="table-overlay pause-overlay"><span className="eyebrow">Mission on hold</span><h2>Take a breath.</h2><p>Your flight pauses when you leave the table.</p><button onClick={() => game.current?.pause(false)}>Resume flight <span aria-hidden="true">→</span></button></div>}
          {running && !paused && waitingBall && power < 0.01 && <div className="launch-hint">Hold <kbd>Space</kbd> then release to launch</div>}
        </div>
        <div className="table-toolbar">
          <button disabled={!running} onClick={() => game.current?.pause(!paused)}>{paused ? '▶ Resume' : 'Ⅱ Pause'}<kbd>P</kbd></button>
          <button disabled={!ready} onClick={toggleCamera} aria-label={`Switch to ${camera === 'cabinet' ? 'overhead' : 'cabinet'} view`}>◇ {camera === 'cabinet' ? 'Overhead' : 'Cabinet'}</button>
          <button disabled={!ready} onClick={toggleSound} aria-pressed={sound}>{sound ? '♫ Sound on' : '♪ Sound off'}</button>
          <button onClick={showBriefing}>? Controls</button>
        </div>
        <div className="touch-controls" aria-label="Touch game controls">
          {holdControl('left', 'Left flipper', 'Z / ←')}
          {holdControl('plunger', 'Hold to launch', 'SPACE')}
          {holdControl('right', 'Right flipper', '/ / →')}
        </div>
        <div className="nudge-row"><button disabled={!running || paused} onClick={() => {
          game.current?.input('nudge-bottom', true, 'tap:nudge');
          window.setTimeout(() => game.current?.input('nudge-bottom', false, 'tap:nudge'), 120);
        }}>Nudge <kbd>↑</kbd></button><span>Use gently. Too much movement causes tilt.</span></div>
        {soundError && <p className="message error" role="alert">{soundError}</p>}
      </section>

      <aside className="flight-panel">
        <section className="scoreboard" aria-label="Flight status">
          <div className="score-heading"><span className="eyebrow">{running ? `PILOT ${Number(snapshot?.currentPlayer || 0) + 1}` : ended ? 'FINAL SCORE' : 'CURRENT SCORE'}</span><span className="score-name">{session?.player_names[snapshot?.currentPlayer || 0] || 'Ready when you are'}</span></div>
          <strong className="main-score" data-testid="score">{format.format(score).padStart(7, '0')}</strong>
          <div className="score-details"><div><span className="metric-label">BALLS LEFT</span><strong className="ball-counter" aria-label={`${running ? snapshot?.ballCount ?? 3 : ended ? 0 : 3} balls left`}>{[0, 1, 2].map(i => <i key={i} className={i < (running ? snapshot?.ballCount ?? 3 : ended ? 0 : 3) ? 'available' : ''} />)}</strong></div><div><span className="metric-label">MULTIPLIER</span><strong>{Math.max(1, snapshot?.scoreMultiplier || 1)}<small>×</small></strong></div></div>
          <div className="mission"><span className="metric-label">MISSION CONTROL</span><p>{cleanText(snapshot?.mission, 'Awaiting deployment')}</p><span>{cleanText(snapshot?.info, 'Your first mission: reach for the stars.')}</span></div>
          <div className="power"><div><span className="metric-label">LAUNCH POWER</span><span>{Math.round(power * 100)}%</span></div><div className="power-track"><div style={{ width: `${power * 100}%` }} /></div></div>
          {session && session.player_names.length > 1 && <div className="crew-scores">{session.player_names.map((name, index) => <div key={index} className={index === snapshot?.currentPlayer ? 'current' : ''}><span>{index + 1}. {name}</span><strong>{format.format(snapshot?.playerScores[index] || 0)}</strong></div>)}</div>}
        </section>

        <section className="launch-panel" aria-labelledby="launch-title"><div className="section-title"><div><span className="eyebrow">Join the flight</span><h2 id="launch-title">Ready, cadet?</h2></div><span className="tiny-orbit" aria-hidden="true">↗</span></div>
          <form onSubmit={event => { event.preventDefault(); void newGame(); }}>
            <div className="form-row"><label htmlFor="player-count">Crew size</label><select id="player-count" value={playerCount} disabled={starting} onChange={event => setPlayerCount(Number(event.target.value))}>{[1, 2, 3, 4].map(count => <option key={count} value={count}>{count} {count === 1 ? 'pilot' : 'pilots'}</option>)}</select></div>
            {names.slice(0, playerCount).map((name, index) => <label className="name-field" key={index}>Pilot {index + 1} name<input name={`pilot-${index + 1}`} autoComplete="nickname" maxLength={32} required value={name} disabled={starting} onChange={event => setNames(current => current.map((item, i) => i === index ? event.target.value : item))} /></label>)}
            <button className="primary-button new-game" type="submit" disabled={!ready || busy}>{starting ? 'Opening flight…' : running ? 'Restart flight' : 'Start new flight'}<span aria-hidden="true">↗</span></button>
          </form>
          <p className="fine-print">{running ? 'Restarting abandons this flight. Only finished games enter the rankings.' : 'Three balls per pilot. Play in turns with up to four pilots.'}</p>
          {startError && <p className="message error" role="alert">{startError}</p>}
          {submission !== 'idle' && <div className={`completion completion-${submission}`} role="status" aria-live="polite">
            <strong>{submission === 'saving' ? 'Saving flight records…' : submission === 'saved' ? 'Flight complete. Score recorded.' : submission === 'error' ? 'Your score is waiting to be saved.' : 'Practice flight complete.'}</strong>
            {result && <p>{result.results.map(entry => `${entry.player_name} · #${entry.rank} · ${format.format(entry.score)}`).join(' / ')}</p>}
            {submission === 'unranked' && <p>Games using cheats do not enter the rankings.</p>}
            {submission === 'error' && <><p>{saveError}</p><button className="secondary-button" onClick={() => { if (pendingRef.current) void submitScores(pendingRef.current); }}>Retry saving score</button><button className="text-button" onClick={() => { pendingRef.current = null; setSubmission('idle'); }}>Discard unsaved score</button></>}
          </div>}
        </section>
        <Leaderboard compact refresh={refresh} visible={view === 'play'} />
        <button className="all-rankings" onClick={() => navigate('rankings')}>Explore all flight records <span aria-hidden="true">→</span></button>
      </aside>
    </div>
    {view === 'rankings' && <div className="ranking-page"><Leaderboard refresh={refresh} /><div className="ranking-callout"><span className="eyebrow">Your name belongs here</span><h2>The next great flight<br />could be yours.</h2><button className="primary-button" onClick={() => navigate('play')}>Back to the table →</button></div></div>}
    <footer><span>Built for the joy of one more game.</span><span>Original Space Cadet rules · Modern 3D playfield · <a href="/attribution.html" target="_blank" rel="noreferrer">Attribution & licenses ↗</a></span></footer>

    <dialog ref={briefingRef} className="controls-dialog" aria-labelledby="controls-title"><button className="dialog-close icon-button" aria-label="Close controls" onClick={() => briefingRef.current?.close()}>×</button><span className="eyebrow">Flight briefing</span><h2 id="controls-title">Meet your controls.</h2><p>Hit targets, complete missions, and keep the ball in play. Your score is saved after the last pilot's last ball.</p><dl>
      <div><dt>Left flipper</dt><dd><kbd>Z</kbd> or <kbd>←</kbd></dd></div><div><dt>Right flipper</dt><dd><kbd>/</kbd> or <kbd>→</kbd></dd></div><div><dt>Launch the ball</dt><dd>Hold <kbd>Space</kbd>, then release</dd></div><div><dt>Nudge the cabinet</dt><dd><kbd>X</kbd> · <kbd>.</kbd> · <kbd>↑</kbd></dd></div><div><dt>Pause / resume</dt><dd><kbd>P</kbd> or <kbd>Esc</kbd> / <kbd>F3</kbd></dd></div><div><dt>Restart flight</dt><dd><kbd>N</kbd> / <kbd>F2</kbd></dd></div>
    </dl><p className="muted">On a touchscreen, hold the flipper and launch buttons below the table. Excessive nudging tilts the table and disables scoring for that ball.</p><button className="primary-button" onClick={() => briefingRef.current?.close()}>Got it. Let's fly. →</button></dialog>
  </main>;
}
