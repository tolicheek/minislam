import { createContext, useContext, useEffect, useReducer, useRef } from 'react';
import type { ReactNode } from 'react';
import { initialState, reducer, currentPoet } from '../lib/engine';
import type { SlamState, Action } from '../lib/engine';

/* ---------------- Звук (WebAudio, без внешних файлов) ---------------- */

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext | null {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    return audioCtx;
  } catch { return null; }
}
function tone(freq: number, dur: number, gainV: number, when = 0) {
  const c = ctx(); if (!c) return;
  const o = c.createOscillator(); const g = c.createGain();
  o.type = 'sine'; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(gainV, c.currentTime + when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + when + dur);
  o.connect(g); g.connect(c.destination);
  o.start(c.currentTime + when); o.stop(c.currentTime + when + dur + 0.05);
}
export const sfx = {
  tick: () => tone(880, 0.09, 0.05),
  timeUp: () => { tone(660, 0.18, 0.16); tone(660, 0.18, 0.16, 0.22); tone(880, 0.4, 0.18, 0.44); },
  vote: () => tone(520, 0.08, 0.05),
  reveal: () => { tone(523, 0.14, 0.1); tone(784, 0.22, 0.1, 0.13); },
  fanfare: () => { tone(523, 0.16, 0.12); tone(659, 0.16, 0.12, 0.16); tone(784, 0.16, 0.12, 0.32); tone(1047, 0.5, 0.14, 0.48); },
};

/* ---------------- Контекст ---------------- */

interface SlamCtx { state: SlamState; dispatch: React.Dispatch<Action>; }
const Ctx = createContext<SlamCtx | null>(null);

const BOT_WEIGHTS = [4, 5, 5, 5, 6, 6, 6, 6, 7, 7, 3, 5];

export function SlamProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  /* Таймер выступления: тик каждые 200 мс + звуковые отметки 3-2-1 */
  const lastWhole = useRef<number>(99);
  useEffect(() => {
    if (state.phase !== 'performing') { lastWhole.current = 99; return; }
    const iv = window.setInterval(() => dispatch({ type: 'TICK', dt: 0.2 }), 200);
    return () => window.clearInterval(iv);
  }, [state.phase, state.perfId]);

  useEffect(() => {
    if (state.phase !== 'performing') return;
    const whole = Math.ceil(state.timeLeft);
    if (whole !== lastWhole.current) {
      lastWhole.current = whole;
      if (whole <= 3 && whole > 0) sfx.tick();
    }
  }, [state.timeLeft, state.phase]);

  /* Время вышло → сигнал на всех устройствах */
  const prevPhase = useRef(state.phase);
  useEffect(() => {
    if (prevPhase.current === 'performing' && state.phase === 'voting') sfx.timeUp();
    if (state.phase === 'reveal') sfx.reveal();
    if (state.phase === 'final') sfx.fanfare();
    prevPhase.current = state.phase;
  }, [state.phase]);

  /* Боты-жюри голосуют с живой задержкой (имитация реальных людей в зале).
     Судья «Вы» голосует вручную с экрана смартфона. */
  useEffect(() => {
    if (state.phase !== 'voting') return;
    const timers: number[] = [];
    const s = stateRef.current;
    const poet = currentPoet(s);
    s.jury.forEach((jid, i) => {
      if (jid === 'you') return;
      if (s.votes[jid] !== undefined) return;
      const delay = 1200 + Math.random() * 5200 + i * 180;
      timers.push(window.setTimeout(() => {
        const cur = stateRef.current;
        if (cur.phase !== 'voting' || cur.votes[jid] !== undefined) return;
        const value = BOT_WEIGHTS[Math.floor(Math.random() * BOT_WEIGHTS.length)] + (poet && Math.random() > 0.6 ? 1 : 0);
        dispatch({ type: 'VOTE', judgeId: jid, value: Math.min(7, Math.max(1, value)) });
      }, delay));
    });
    return () => timers.forEach(t => window.clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.phase, state.perfId]);

  /* Авто-закрытие: проголосовали все — закрываем сразу; иначе — по дедлайну */
  useEffect(() => {
    if (state.phase !== 'voting') return;
    const voted = state.jury.filter(id => state.votes[id] !== undefined).length;
    if (voted >= state.jury.length && state.jury.length > 0) {
      const t = window.setTimeout(() => dispatch({ type: 'CLOSE_VOTING' }), 900);
      return () => window.clearTimeout(t);
    }
    const remain = state.voteDeadline - Date.now();
    if (remain <= 0) return;
    const t = window.setTimeout(() => {
      const cur = stateRef.current;
      const v = cur.jury.filter(id => cur.votes[id] !== undefined).length;
      if (cur.phase === 'voting' && v < cur.jury.length) dispatch({ type: 'CLOSE_VOTING' });
    }, remain);
    return () => window.clearTimeout(t);
  }, [state.phase, state.votes, state.jury, state.voteDeadline, state.perfId]);

  /* Показ балла -> следующий выступающий (автопереход, как в реальном эфире) */
  useEffect(() => {
    if (state.phase !== 'reveal') return;
    const t = window.setTimeout(() => dispatch({ type: 'NEXT' }), 3200);
    return () => window.clearTimeout(t);
  }, [state.phase, state.perfId]);

  return <Ctx.Provider value={{ state, dispatch }}>{children}</Ctx.Provider>;
}

export function useSlam(): SlamCtx {
  const v = useContext(Ctx);
  if (!v) throw new Error('useSlam outside provider');
  return v;
}
