import { useEffect, useState } from 'react';
import { useSlam, sfx } from '../state/SlamContext';
import {
  activeIds, currentPoet, fund, personById, PHASE_LABEL, HISTORY, RATING,
} from '../lib/engine';
import type { Person } from '../lib/engine';
import {
  Avatar, Bar, Btn, Chip, Confetti, Money, QRBox, Stamp, TimerRing, fmtMoney, fmtScore,
  IconCheck, IconCoin, IconGavel, IconMic, IconQr, IconStar, IconUsers, IconTimer,
} from './bits';

type PTab = 'stage' | 'jury' | 'results' | 'ticket' | 'profile';

const NAV: { id: PTab; label: string; icon: (p: { size?: number; className?: string }) => React.ReactNode }[] = [
  { id: 'stage', label: 'Сцена', icon: p => <IconMic {...p} /> },
  { id: 'jury', label: 'Жюри', icon: p => <IconGavel {...p} /> },
  { id: 'results', label: 'Итоги', icon: p => <IconStar {...p} /> },
  { id: 'ticket', label: 'Билет', icon: p => <IconQr {...p} /> },
  { id: 'profile', label: 'Профиль', icon: p => <IconUsers {...p} /> },
];

export function PhoneClient() {
  const { state, dispatch } = useSlam();
  const [tab, setTab] = useState<PTab>('stage');
  const [userId, setUserId] = useState('you');
  const [ping, setPing] = useState(58);
  useEffect(() => {
    const iv = window.setInterval(() => setPing(36 + Math.floor(Math.random() * 58)), 2400);
    return () => window.clearInterval(iv);
  }, []);

  const user = personById(state, userId) ?? state.people[0];
  const isJudge = state.jury.includes(user.id);
  const liveHot = state.phase === 'performing' || state.phase === 'voting' || state.phase === 'reveal';
  const needVote = state.phase === 'voting' && isJudge && state.votes[user.id] === undefined;

  const switchIds = ['you', 'p1', 'j1', ...state.people.filter(p => p.id.startsWith('u')).map(p => p.id)];

  const addGuest = (role: 'poet' | 'spectator') => {
    const id = `u${Date.now()}`;
    const n = state.people.filter(p => p.id.startsWith('u')).length + 1;
    dispatch({
      type: 'REGISTER',
      person: {
        id,
        name: role === 'poet' ? `Поэт-гость ${n}` : `Гость фестиваля ${n}`,
        role,
        hue: Math.floor(Math.random() * 360),
        poems: role === 'poet' ? ['Голос', 'Черновик', 'Финал'] : undefined,
        paid: false,
        checkedIn: false,
        wantsJudge: role === 'spectator',
      },
    });
    setUserId(id);
    setTab('ticket');
  };

  return (
    <div className="mx-auto w-full max-w-[378px]">
      <div className="rounded-[2.9rem] border border-stage-600/80 bg-[#0a0705] p-2.5 shadow-[0_40px_90px_-32px_rgba(0,0,0,0.95)]">
        <div className="relative flex h-[694px] flex-col overflow-hidden rounded-[2.3rem] border border-stage-800 bg-stage-950">
          <div className="absolute left-1/2 top-2 z-30 h-[20px] w-28 -translate-x-1/2 rounded-full bg-[#0a0705]" />

          {/* статус-бар */}
          <div className="flex items-center justify-between px-6 pb-0.5 pt-2.5 text-[10px] font-semibold text-stage-300">
            <span className="font-mono">19:42</span>
            <span className="flex items-center gap-1.5">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="currentColor" aria-hidden><rect x="0" y="6" width="2.4" height="4" rx="0.6" /><rect x="3.8" y="4" width="2.4" height="6" rx="0.6" /><rect x="7.6" y="2" width="2.4" height="8" rx="0.6" /><rect x="11.4" y="0" width="2.4" height="10" rx="0.6" opacity="0.4" /></svg>
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden><path d="M1.5 3.5a8 8 0 0 1 11 0M3.5 5.8a5 5 0 0 1 7 0M5.6 8a2 2 0 0 1 2.8 0" strokeLinecap="round" /></svg>
              <svg width="20" height="10" viewBox="0 0 20 10" aria-hidden><rect x="0.5" y="0.5" width="16" height="9" rx="2.5" fill="none" stroke="currentColor" /><rect x="2" y="2" width="11" height="6" rx="1.2" fill="#6cc39a" /><rect x="17.5" y="3" width="2" height="4" rx="1" fill="currentColor" /></svg>
            </span>
          </div>

          {/* шапка приложения */}
          <div className="border-b border-stage-800/80 px-4 pb-2.5 pt-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-gold-500 text-stage-950"><IconMic size={15} /></span>
                <div>
                  <div className="font-display text-[13px] font-bold leading-tight text-stage-50">МИНИ-СЛЭМ</div>
                  <div className="font-mono text-[8.5px] uppercase tracking-[0.18em] text-stage-500">{state.cfg.title.replace('Мини-Слэм #12 ', '')}</div>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                {liveHot && <Chip tone="live"><span className="live-dot h-1.5 w-1.5 rounded-full bg-live-400" />live</Chip>}
                <span className="flex items-center gap-1 font-mono text-[9px] text-mint-300">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-mint-400" />{ping} мс
                </span>
              </div>
            </div>
            <div className="scrollbar-none mt-2 flex gap-1.5 overflow-x-auto">
              {switchIds.map(id => {
                const p = personById(state, id);
                if (!p) return null;
                const me = id === user.id;
                return (
                  <button
                    key={id}
                    onClick={() => setUserId(id)}
                    className={`btn-press flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-[10.5px] font-semibold ${
                      me ? 'border-gold-500/70 bg-gold-500/15 text-gold-300' : 'border-stage-700 bg-stage-900 text-stage-400 hover:text-stage-200'
                    }`}
                  >
                    <Avatar person={p} size={18} />
                    {id === 'you' ? 'вы' : p.name.split(' ')[0]}
                  </button>
                );
              })}
              <button onClick={() => addGuest('spectator')} className="btn-press shrink-0 rounded-full border border-dashed border-stage-600 px-2.5 py-1 text-[10.5px] font-semibold text-stage-400 hover:border-gold-500/60 hover:text-gold-300">+ зритель</button>
              <button onClick={() => addGuest('poet')} className="btn-press shrink-0 rounded-full border border-dashed border-stage-600 px-2.5 py-1 text-[10.5px] font-semibold text-stage-400 hover:border-gold-500/60 hover:text-gold-300">+ поэт</button>
            </div>
          </div>

          {/* экран */}
          <div className="scrollbar-none flex-1 overflow-y-auto px-3.5 pb-3">
            {tab === 'stage' && <PhoneStage user={user} goTo={setTab} />}
            {tab === 'jury' && <PhoneJury user={user} />}
            {tab === 'results' && <PhoneResults />}
            {tab === 'ticket' && <PhoneTicket user={user} />}
            {tab === 'profile' && <PhoneProfile user={user} />}
          </div>

          {/* нижняя навигация */}
          <nav className="grid grid-cols-5 border-t border-stage-800 bg-stage-900/95 px-1 pb-2.5 pt-1.5">
            {NAV.map(n => {
              const active = tab === n.id;
              const badge = n.id === 'jury' && needVote;
              return (
                <button key={n.id} onClick={() => setTab(n.id)} className={`btn-press relative flex flex-col items-center gap-0.5 py-1 ${active ? 'text-gold-400' : 'text-stage-500 hover:text-stage-300'}`}>
                  <span className="relative">
                    {n.icon({ size: 19 })}
                    {badge && <span className="live-dot absolute -right-1.5 -top-1 h-2 w-2 rounded-full bg-live-500 ring-2 ring-stage-900" />}
                  </span>
                  <span className="text-[8.5px] font-bold uppercase tracking-wider">{n.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
      <p className="mt-3 text-center font-mono text-[10.5px] uppercase tracking-[0.18em] text-stage-500">
        мобильный клиент · live-превью участника
      </p>
    </div>
  );
}

/* ================= Сцена ================= */

function PhoneStage({ user, goTo }: { user: Person; goTo: (t: PTab) => void }) {
  const { state } = useSlam();
  const poet = currentPoet(state);
  const ids = state.round > 0 ? activeIds(state, state.round) : [];
  const isPoet = user.role === 'poet';
  const iAmNext = state.phase === 'performing' && ids[state.idx + 1] === user.id;
  const votedCount = state.jury.filter(id => state.votes[id] !== undefined).length;

  return (
    <div className="space-y-3 pt-2.5">
      <div className="rounded-xl border border-gold-500/30 bg-gradient-to-br from-gold-500/10 via-transparent to-transparent p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-gold-500">призовой фонд</span>
          <span className="flex items-center gap-1 font-mono text-[9px] text-mint-300"><span className="live-dot h-1.5 w-1.5 rounded-full bg-mint-400" />live</span>
        </div>
        <Money value={fund(state)} className="font-display text-[26px] font-bold leading-tight text-gold-400" />
      </div>

      {state.round === 0 && (
        <div className="rounded-xl border border-stage-700 bg-stage-900/80 p-4">
          <div className="font-display text-sm font-bold text-stage-50">{PHASE_LABEL[state.phase]}</div>
          {!user.paid ? (
            <>
              <p className="mt-1.5 text-[12px] leading-relaxed text-stage-300">Оплатите взнос, чтобы получить QR-билет и попасть на слэм.</p>
              <Btn size="sm" className="mt-3" onClick={() => goTo('ticket')}><IconCoin size={14} /> Оплатить взнос</Btn>
            </>
          ) : !user.checkedIn ? (
            <>
              <p className="mt-1.5 text-[12px] leading-relaxed text-stage-300">Покажите QR-билет организатору на входе — система отметит присутствие.</p>
              <Btn size="sm" variant="ghost" className="mt-3" onClick={() => goTo('ticket')}><IconQr size={14} /> Открыть билет</Btn>
            </>
          ) : (
            <>
              <p className="mt-1.5 text-[12px] leading-relaxed text-stage-300">
                Вы на площадке. Организатор формирует порядок — выступления начнутся с минуты на минуту.
              </p>
              {isPoet && user.poems && (
                <div className="mt-3 space-y-1.5">
                  <div className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-stage-400">ваши стихи на сегодня</div>
                  {user.poems.map((t, i) => (
                    <div key={i} className="flex items-center justify-between rounded-lg border border-stage-700 bg-stage-850 px-3 py-1.5">
                      <span className="text-[12px] font-semibold text-stage-100">«{t}»</span>
                      <span className="font-mono text-[10px] text-stage-400">тур {i + 1} · {state.cfg.durations[i]} c</span>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {state.phase === 'performing' && poet && (
        <>
          {(user.id === poet.id || iAmNext) && (
            <div className={`pop-in rounded-xl border p-3 text-center ${user.id === poet.id ? 'border-gold-500/60 bg-gold-500/10' : 'border-live-500/50 bg-live-500/10'}`}>
              <span className={`font-display text-[13px] font-bold ${user.id === poet.id ? 'text-gold-300' : 'text-live-400'}`}>
                {user.id === poet.id ? 'Сейчас ваш выход — на сцену!' : 'Вы следующий — готовьтесь'}
              </span>
            </div>
          )}
          <div className="rounded-xl border border-stage-700 bg-stage-900/80 p-4 text-center">
            <Chip tone="live"><span className="live-dot h-1.5 w-1.5 rounded-full bg-live-400" />тур {state.round} · {state.cfg.durations[state.round - 1]} c</Chip>
            <div className="mt-3 flex justify-center"><Avatar person={poet} size={64} ring /></div>
            <div className="mt-2 font-display text-lg font-bold text-stage-50">{poet.name}</div>
            <div className="text-[12px] text-stage-300">читает «{poet.poems?.[state.round - 1]}»</div>
            <div className="mt-3 flex justify-center">
              <TimerRing total={state.cfg.durations[state.round - 1]} left={state.timeLeft} size={148} urgent={state.timeLeft <= 5} />
            </div>
            <div className="mt-2 font-mono text-[9.5px] uppercase tracking-[0.18em] text-stage-500">сигнал прозвучит на всех устройствах</div>
          </div>
        </>
      )}

      {state.phase === 'voting' && poet && (
        <div className="rounded-xl border border-stage-700 bg-stage-900/80 p-4">
          <div className="flex items-center justify-between">
            <Chip tone="gold">идёт оценка</Chip>
            <span className="font-mono text-[10.5px] text-stage-400">{votedCount}/{state.jury.length}</span>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <Avatar person={poet} size={38} />
            <div>
              <div className="text-[13px] font-bold text-stage-50">{poet.name}</div>
              <div className="text-[11px] text-stage-400">«{poet.poems?.[state.round - 1]}»</div>
            </div>
          </div>
          <Bar frac={state.jury.length ? votedCount / state.jury.length : 0} className="mt-3" />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {state.jury.map((jid, i) => {
              const v = state.votes[jid];
              const j = personById(state, jid);
              return (
                <span key={jid} className={`rounded-md border px-2 py-1 font-mono text-[10.5px] font-bold ${v !== undefined ? 'border-gold-500/40 bg-gold-500/10 text-gold-300' : 'border-stage-700 text-stage-600'}`}>
                  {v !== undefined ? (state.cfg.anonymousJury ? v : `${j?.name.split(' ')[0]} ${v}`) : '···'}
                </span>
              );
            })}
          </div>
          {state.cfg.anonymousJury && <div className="mt-2 font-mono text-[9.5px] uppercase tracking-wider text-stage-500">анонимный режим: только числа</div>}
          {state.jury.includes(user.id) && state.votes[user.id] === undefined && (
            <Btn size="sm" className="mt-3 w-full" onClick={() => goTo('jury')}><IconGavel size={14} /> Оценить сейчас</Btn>
          )}
          {state.jury.includes(user.id) && state.votes[user.id] !== undefined && (
            <div className="mt-3 text-center"><Stamp tone="mint">ваш голос учтён</Stamp></div>
          )}
        </div>
      )}

      {state.phase === 'reveal' && poet && (
        <div className="rounded-xl border border-gold-500/40 bg-stage-900/80 p-5 text-center">
          <Chip tone="gold">итог выступления</Chip>
          <div className="score-reveal mt-3 font-display text-6xl font-black text-gold-400">
            {fmtScore(state.scores[poet.id]?.[state.round - 1]?.value ?? 0)}
          </div>
          <div className="mt-1 text-[12px] text-stage-300">{poet.name} · «{poet.poems?.[state.round - 1]}»</div>
          <div className="mt-1 font-mono text-[9.5px] uppercase tracking-wider text-stage-500">{state.scores[poet.id]?.[state.round - 1]?.method}</div>
        </div>
      )}

      {(state.phase === 'roundEnd' || state.phase === 'final' || state.phase === 'paid') && state.round > 0 && (
        <PhoneRoundCard user={user} />
      )}

      {state.round > 0 && (
        <div className="rounded-xl border border-stage-700 bg-stage-900/60 p-3">
          <div className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-stage-400">очередь тура {state.round}</div>
          <div className="flex flex-wrap gap-1.5">
            {ids.map((id, i) => {
              const p = personById(state, id);
              const cur = i === state.idx && (state.phase === 'performing' || state.phase === 'voting' || state.phase === 'reveal');
              return (
                <span key={id} className={`rounded-md border px-2 py-0.5 text-[10.5px] font-semibold ${
                  id === user.id ? 'border-gold-500/70 text-gold-300' : cur ? 'border-live-500/50 text-live-400' : 'border-stage-700 text-stage-400'
                }`}>{i + 1}. {p?.name.split(' ')[0]}</span>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function PhoneRoundCard({ user }: { user: Person }) {
  const { state } = useSlam();
  const r = state.round;
  const ids = [...activeIds(state, r)].sort((a, b) => (state.scores[b]?.[r - 1]?.value ?? 0) - (state.scores[a]?.[r - 1]?.value ?? 0));
  const passed = new Set(state.kept[r] ?? []);
  const isFinal = state.phase === 'final' || state.phase === 'paid';
  const meIn = ids.includes(user.id);
  const meOk = isFinal ? state.winners.includes(user.id) : passed.has(user.id);

  return (
    <div className="relative overflow-hidden rounded-xl border border-stage-700 bg-stage-900/80 p-4">
      {isFinal && <Confetti count={20} />}
      <div className="relative">
        <div className="flex items-center justify-between">
          <Chip tone={isFinal ? 'gold' : 'plain'}>{isFinal ? 'победитель' : `итоги тура ${r}`}</Chip>
          {isFinal && <span className="font-mono text-[10px] text-gold-400"><Money value={fund(state)} /></span>}
        </div>
        {isFinal ? (
          <div className="mt-2.5 space-y-1.5">
            {state.winners.map(w => {
              const p = personById(state, w);
              return p ? (
                <div key={w} className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${w === user.id ? 'border-gold-500/70 bg-gold-500/10' : 'border-stage-700'}`}>
                  <Avatar person={p} size={30} ring />
                  <span className="flex-1 text-[13px] font-bold text-stage-50">{p.name}{w === user.id ? ' — это вы!' : ''}</span>
                  <span className="font-mono text-[12px] font-bold text-gold-400">{fmtScore(state.scores[w]?.[2]?.value ?? 0)}</span>
                </div>
              ) : null;
            })}
          </div>
        ) : (
          <ul className="mt-2.5 space-y-1.5">
            {ids.slice(0, 4).map((id, i) => {
              const p = personById(state, id);
              return p ? (
                <li key={id} className={`flex items-center gap-2.5 rounded-lg border px-3 py-1.5 ${id === user.id ? 'border-gold-500/60 bg-gold-500/5' : 'border-stage-800'}`}>
                  <span className="w-4 font-mono text-[10.5px] text-stage-500">{i + 1}</span>
                  <span className="flex-1 truncate text-[12.5px] font-semibold text-stage-100">{p.name}</span>
                  {passed.has(id) ? <IconCheck size={13} className="text-mint-300" /> : null}
                  <span className="font-mono text-[12px] font-bold text-gold-400">{fmtScore(state.scores[id]?.[r - 1]?.value ?? 0)}</span>
                </li>
              ) : null;
            })}
          </ul>
        )}
        {user.role === 'poet' && meIn && !isFinal && (
          <div className={`mt-3 rounded-lg border p-2 text-center text-[11.5px] font-bold ${meOk ? 'border-mint-500/50 bg-mint-500/10 text-mint-300' : 'border-live-500/50 bg-live-500/10 text-live-400'}`}>
            {meOk ? 'Вы проходите в следующий тур!' : 'Вы выбываете — спасибо за стихи!'}
          </div>
        )}
      </div>
    </div>
  );
}

/* ================= Жюри ================= */

function PhoneJury({ user }: { user: Person }) {
  const { state, dispatch } = useSlam();
  const isJudge = state.jury.includes(user.id);
  const poet = currentPoet(state);
  const myVote = state.votes[user.id];
  const votedCount = state.jury.filter(id => state.votes[id] !== undefined).length;

  if (!isJudge) {
    return (
      <div className="space-y-3 pt-2.5">
        <div className="rounded-xl border border-stage-700 bg-stage-900/80 p-4 text-center">
          <IconGavel size={28} className="mx-auto text-stage-500" />
          <div className="mt-2 font-display text-sm font-bold text-stage-50">Вы не в составе жюри</div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stage-300">
            {user.wantsJudge
              ? 'Вы в пуле кандидатов — организатор набирает состав на вкладке «Жюри».'
              : 'Отметьте «хочу судить» при регистрации на следующий слэм.'}
            {user.role === 'poet' && !state.cfg.poetsCanJudge && ' На этом слэме поэты не судят.'}
          </p>
        </div>
      </div>
    );
  }

  if (state.phase !== 'voting') {
    return (
      <div className="space-y-3 pt-2.5">
        <div className="rounded-xl border border-gold-500/30 bg-stage-900/80 p-4">
          <Chip tone="gold">вы — судья</Chip>
          <p className="mt-2 text-[12px] leading-relaxed text-stage-300">
            Состав: {state.jury.length} чел. Экран оценки активируется автоматически, как только истечёт время выступления.
            Шкала 1–7, одна оценка на выступление, отправка одним нажатием.
          </p>
        </div>
        {state.phase === 'performing' && poet && (
          <div className="rounded-xl border border-stage-700 bg-stage-900/60 p-3 text-center text-[11.5px] text-stage-400">
            Сейчас слушаете: {poet.name} — «{poet.poems?.[state.round - 1]}»
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2.5">
      {poet && (
        <div className="rounded-xl border border-gold-500/40 bg-stage-900/80 p-4">
          <div className="flex items-center justify-between">
            <Chip tone="live"><span className="live-dot h-1.5 w-1.5 rounded-full bg-live-400" />оцените</Chip>
            <span className="font-mono text-[10px] text-stage-400">{votedCount}/{state.jury.length}</span>
          </div>
          <div className="mt-2.5 flex items-center gap-2.5">
            <Avatar person={poet} size={40} />
            <div>
              <div className="text-[13.5px] font-bold text-stage-50">{poet.name}</div>
              <div className="text-[11px] text-stage-400">«{poet.poems?.[state.round - 1]}» · тур {state.round}</div>
            </div>
          </div>

          {myVote === undefined ? (
            <>
              <div className="mt-3.5 grid grid-cols-7 gap-1.5">
                {[1, 2, 3, 4, 5, 6, 7].map(v => (
                  <button
                    key={v}
                    onClick={() => { dispatch({ type: 'VOTE', judgeId: user.id, value: v }); sfx.vote(); }}
                    className="btn-press h-11 rounded-lg border border-stage-600 bg-stage-800 font-mono text-[15px] font-bold text-stage-100 hover:border-gold-500 hover:bg-gold-500/15 hover:text-gold-300 active:bg-gold-500 active:text-stage-950"
                  >{v}</button>
                ))}
              </div>
              <p className="mt-2 text-center text-[10px] text-stage-500">оценка отправляется сразу · изменить нельзя</p>
            </>
          ) : (
            <div className="pop-in mt-3.5 rounded-xl border border-mint-500/50 bg-mint-500/10 p-3 text-center">
              <div className="font-mono text-[9.5px] uppercase tracking-[0.2em] text-mint-300">ваша оценка</div>
              <div className="font-display text-4xl font-black text-mint-300">{myVote}</div>
            </div>
          )}
        </div>
      )}
      <div className="rounded-xl border border-stage-700 bg-stage-900/60 p-3">
        <div className="mb-1.5 flex items-center justify-between">
          <span className="font-mono text-[9.5px] font-bold uppercase tracking-[0.18em] text-stage-400">как голосуют остальные</span>
          {state.cfg.anonymousJury && <span className="font-mono text-[9px] text-stage-500">анонимно</span>}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {state.jury.map(jid => {
            const v = state.votes[jid];
            const j = personById(state, jid);
            return (
              <span key={jid} className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-bold ${v !== undefined ? 'border-gold-500/40 bg-gold-500/10 text-gold-300' : 'border-stage-700 text-stage-600'}`}>
                {v !== undefined ? (state.cfg.anonymousJury ? String(v) : `${j?.name.split(' ')[0]} · ${v}`) : '···'}
              </span>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ================= Итоги ================= */

function PhoneResults() {
  const { state } = useSlam();
  if (state.round === 0) {
    return (
      <div className="pt-2.5">
        <div className="rounded-xl border border-stage-700 bg-stage-900/80 p-6 text-center">
          <IconStar size={26} className="mx-auto text-stage-500" />
          <p className="mt-2 text-[12px] text-stage-300">Таблицы появятся после первого тура — они обновляются в реальном времени.</p>
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3 pt-2.5">
      {Array.from({ length: state.round }, (_, i) => i + 1).map(r => {
        const ids = [...activeIds(state, r)].sort((a, b) => (state.scores[b]?.[r - 1]?.value ?? 0) - (state.scores[a]?.[r - 1]?.value ?? 0));
        const passed = new Set(state.kept[r] ?? []);
        return (
          <div key={r} className="rounded-xl border border-stage-700 bg-stage-900/80 p-3.5">
            <div className="mb-2 flex items-center justify-between">
              <span className="font-display text-[12.5px] font-bold text-stage-50">Тур {r} · {state.cfg.durations[r - 1]} c</span>
              <Chip tone="plain">{ids.length}</Chip>
            </div>
            <ul className="space-y-1">
              {ids.map((id, i) => {
                const p = personById(state, id);
                return p ? (
                  <li key={id} className="flex items-center gap-2 rounded-lg px-1.5 py-1">
                    <span className="w-4 font-mono text-[10px] text-stage-500">{i + 1}</span>
                    <Avatar person={p} size={22} />
                    <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-stage-200">{p.name}</span>
                    {r < 3 && (passed.has(id) ? <IconCheck size={12} className="text-mint-300" /> : <span className="h-1 w-1 rounded-full bg-live-500/70" />)}
                    <span className="font-mono text-[11.5px] font-bold text-gold-400">{fmtScore(state.scores[id]?.[r - 1]?.value ?? 0)}</span>
                  </li>
                ) : null;
              })}
            </ul>
          </div>
        );
      })}
    </div>
  );
}

/* ================= Билет ================= */

function PhoneTicket({ user }: { user: Person }) {
  const { state, dispatch } = useSlam();
  const [paying, setPaying] = useState(false);
  const fee = user.role === 'poet' ? state.cfg.poetFee : state.cfg.spectatorFee;

  if (!user.paid) {
    return (
      <div className="space-y-3 pt-2.5">
        <div className="rounded-xl border border-gold-500/40 bg-stage-900/80 p-4">
          <Chip tone="gold">взнос к оплате</Chip>
          <div className="mt-3 space-y-2">
            {[
              ['Участник', user.name],
              ['Роль', user.role === 'poet' ? 'поэт · 3 стихотворения' : 'зритель'],
              ['Жюри', user.wantsJudge ? 'хочу судить' : '—'],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between text-[12px]"><span className="text-stage-400">{k}</span><span className="font-semibold text-stage-100">{v}</span></div>
            ))}
            <div className="flex justify-between border-t border-stage-700 pt-2 text-[13px]">
              <span className="text-stage-300">Сумма</span>
              <span className="font-mono font-bold text-gold-400">{fmtMoney(fee)}</span>
            </div>
          </div>
          <div className="mt-3 rounded-lg border border-stage-700 bg-stage-850 px-3 py-2 font-mono text-[11.5px] text-stage-400">4242 ·· ·· ·· 4242</div>
          <Btn
            className="mt-3 w-full"
            disabled={paying}
            onClick={() => {
              setPaying(true);
              window.setTimeout(() => { dispatch({ type: 'PAY', id: user.id }); sfx.reveal(); setPaying(false); }, 1300);
            }}
          >
            {paying ? (
              <><span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-stage-950 border-t-transparent" /> обрабатываем…</>
            ) : (
              <><IconCoin size={15} /> Оплатить {fmtMoney(fee)}</>
            )}
          </Btn>
          <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-wider text-stage-500">эквайринг · после оплаты выдаётся QR-билет</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2.5">
      <div className="pop-in overflow-hidden rounded-2xl bg-stage-50 text-stage-950 shadow-[0_18px_50px_-20px_rgba(0,0,0,0.8)]">
        <div className="px-4 pb-3 pt-4 text-center">
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-stage-500">мини-слэм · билет</div>
          <div className="mt-0.5 font-display text-[15px] font-bold leading-tight">{state.cfg.title}</div>
          <div className="mt-0.5 text-[10px] text-stage-500">{state.cfg.dateLabel} · {state.cfg.venue}</div>
        </div>
        <div className="flex justify-center px-4 pb-3">
          <div className="rounded-xl border-4 border-stage-950/10 p-2">
            <QRBox seed={`${user.id}|${state.cfg.title}`} size={150} />
          </div>
        </div>
        <div className="relative mx-4 border-t-2 border-dashed border-stage-950/20">
          <span className="absolute -left-[26px] -top-2.5 h-5 w-5 rounded-full bg-stage-950" />
          <span className="absolute -right-[26px] -top-2.5 h-5 w-5 rounded-full bg-stage-950" />
        </div>
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <div className="text-[13px] font-bold">{user.name}</div>
            <div className="font-mono text-[9.5px] uppercase tracking-wider text-stage-500">{user.role === 'poet' ? 'поэт' : 'зритель'}{user.wantsJudge ? ' · пул жюри' : ''}</div>
          </div>
          <span className="-rotate-3 rounded border-2 border-dashed border-mint-500 px-2 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-mint-500">
            оплачено
          </span>
        </div>
      </div>
      <div className={`rounded-xl border p-3 text-center text-[11.5px] font-bold ${user.checkedIn ? 'border-mint-500/50 bg-mint-500/10 text-mint-300' : 'border-gold-500/40 bg-gold-500/5 text-gold-300'}`}>
        {user.checkedIn ? 'Вы отмечены на входе' : 'Покажите QR организатору на входе'}
      </div>
    </div>
  );
}

/* ================= Профиль ================= */

function PhoneProfile({ user }: { user: Person }) {
  const { state } = useSlam();
  const rating = RATING.find(r => r.name === user.name);
  const isJudge = state.jury.includes(user.id);

  return (
    <div className="space-y-3 pt-2.5">
      <div className="rounded-xl border border-stage-700 bg-stage-900/80 p-4">
        <div className="flex items-center gap-3">
          <Avatar person={user} size={56} ring />
          <div className="min-w-0">
            <div className="truncate font-display text-[15px] font-bold text-stage-50">{user.name}</div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              <Chip tone="plain">{user.role === 'poet' ? 'поэт' : 'зритель'}</Chip>
              {isJudge && <Chip tone="gold">жюри</Chip>}
              {user.checkedIn && <Chip tone="mint">на площадке</Chip>}
            </div>
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[
            { l: 'слэмов', v: rating?.events ?? (user.role === 'poet' ? HISTORY.length : 4) },
            { l: 'побед', v: rating?.wins ?? (user.role === 'poet' ? 1 : '—') },
            { l: 'ср. балл', v: rating?.avg.toFixed(2) ?? (user.role === 'poet' ? '6,14' : 'жюри') },
          ].map(x => (
            <div key={x.l} className="rounded-lg border border-stage-700 bg-stage-850 px-2 py-1.5 text-center">
              <div className="font-mono text-[14px] font-bold text-gold-400">{x.v}</div>
              <div className="font-mono text-[8.5px] uppercase tracking-wider text-stage-500">{x.l}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-stage-700 bg-stage-900/80 p-4">
        <div className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-stage-400">
          {user.role === 'poet' ? 'моя история' : 'работа в жюри'}
        </div>
        {(user.role === 'poet' ? HISTORY : [
          { event: 'Мини-Слэм #11 «Сквозняк»', place: 'жюри', score: 21, poems: ['оценок выставлено'] },
          { event: 'Мини-Слэм #9 «Штиль»', place: 'жюри', score: 18, poems: ['оценок выставлено'] },
          { event: 'Мини-Слэм #8 «Черновик»', place: 'жюри', score: 24, poems: ['оценок выставлено'] },
        ]).map(h => (
          <div key={h.event} className="flex items-center gap-2.5 border-b border-stage-800 py-2 last:border-0">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold text-stage-100">{h.event}</div>
              <div className="truncate font-mono text-[9.5px] text-stage-500">{h.poems.join(' · ')}</div>
            </div>
            {h.place.startsWith('1') ? <Stamp tone="gold">победа</Stamp> : <Chip tone="plain">{h.place}</Chip>}
            <span className="w-10 text-right font-mono text-[12px] font-bold text-gold-400">{typeof h.score === 'number' && h.score < 8 ? fmtScore(h.score) : h.score}</span>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-stage-700 bg-stage-900/80 p-4">
        <div className="mb-2 font-mono text-[9.5px] font-bold uppercase tracking-[0.2em] text-stage-400">рейтинг поэтов · топ-5</div>
        {RATING.slice(0, 5).map((r, i) => (
          <div key={r.name} className={`flex items-center gap-2 py-1.5 ${r.name === user.name ? 'text-gold-300' : ''}`}>
            <span className={`grid h-5 w-5 place-items-center rounded-full font-mono text-[9.5px] font-bold ${i === 0 ? 'bg-gold-500 text-stage-950' : 'bg-stage-800 text-stage-400'}`}>{i + 1}</span>
            <span className="min-w-0 flex-1 truncate text-[11.5px] font-semibold text-stage-200">{r.name}</span>
            <span className="font-mono text-[10px] text-stage-500">{r.wins} поб.</span>
            <span className="w-9 text-right font-mono text-[11px] font-bold text-gold-400">{r.avg.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
