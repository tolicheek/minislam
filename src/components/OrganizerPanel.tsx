import { useEffect, useState } from 'react';
import { useSlam } from '../state/SlamContext';
import {
  activeIds, algoBranch, fund, fundBreakdown, juryPool, personById, poetsOf, PHASE_LABEL,
} from '../lib/engine';
import type { SlamState } from '../lib/engine';
import {
  Avatar, Btn, Card, Chip, Field, Money, Reveal, Stamp, TextInput, Toggle, fmtMoney,
  IconBolt, IconCheck, IconCoin, IconDoc, IconGavel, IconGrip, IconMic, IconPlay, IconQr, IconStar, IconUsers, IconX,
} from './bits';
import { LiveRoom, FundTab, ResultsTab, ArchTab } from './OrganizerStage';

/* ================= вкладки ================= */

const TABS = [
  { id: 'dash', label: 'Обзор', icon: IconBolt },
  { id: 'checkin', label: 'Check-in', icon: IconQr },
  { id: 'order', label: 'Порядок', icon: IconUsers },
  { id: 'jury', label: 'Жюри', icon: IconGavel },
  { id: 'live', label: 'Эфир', icon: IconMic },
  { id: 'fund', label: 'Фонд', icon: IconCoin },
  { id: 'results', label: 'Итоги', icon: IconStar },
  { id: 'arch', label: 'Архитектура', icon: IconDoc },
] as const;
export type TabId = (typeof TABS)[number]['id'];

export function OrganizerPanel({ tab, setTab }: { tab: TabId; setTab: (t: TabId) => void }) {
  const { state } = useSlam();
  const liveHot = state.phase === 'performing' || state.phase === 'voting' || state.phase === 'reveal';
  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.24em] text-stage-400">
            Веб-панель организатора
          </div>
          <h1 className="font-display text-2xl font-bold text-stage-50 sm:text-3xl">Пульт слэма</h1>
        </div>
        <div className="flex items-center gap-2">
          {state.round > 0 && state.round <= 3 && <Chip tone="plain">Тур {state.round} / 3 · {state.cfg.durations[state.round - 1]} c</Chip>}
          <Chip tone={liveHot ? 'live' : state.phase === 'paid' ? 'mint' : 'gold'}>
            {liveHot && <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-live-400" />}
            {PHASE_LABEL[state.phase]}
          </Chip>
        </div>
      </div>

      <nav className="scrollbar-none -mx-1 mb-5 flex gap-1.5 overflow-x-auto px-1 pb-1" aria-label="Разделы панели">
        {TABS.map(t => {
          const Active = tab === t.id;
          const hot = t.id === 'live' && liveHot;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`btn-press relative flex shrink-0 items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors ${
                Active ? 'bg-gold-500 text-stage-950' : 'border border-stage-700 bg-stage-850/70 text-stage-300 hover:border-gold-500/50 hover:text-gold-300'
              }`}
            >
              <t.icon size={15} />
              {t.label}
              {hot && !Active && <span className="live-dot absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full bg-live-500 ring-2 ring-stage-900" />}
            </button>
          );
        })}
      </nav>

      <div className="fade-up" key={tab}>
        {tab === 'dash' && <DashTab goTo={setTab} />}
        {tab === 'checkin' && <CheckInTab />}
        {tab === 'order' && <OrderTab />}
        {tab === 'jury' && <JuryTab />}
        {tab === 'live' && <LiveRoom />}
        {tab === 'fund' && <FundTab />}
        {tab === 'results' && <ResultsTab />}
        {tab === 'arch' && <ArchTab />}
      </div>
    </section>
  );
}

/* ================= Обзор ================= */

function NumField({ label, value, onCommit, min = 0 }: { label: string; value: number; onCommit: (n: number) => void; min?: number }) {
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  return (
    <Field label={label}>
      <TextInput
        type="number" min={min} value={v} inputMode="numeric"
        onChange={e => setV(e.target.value)}
        onBlur={() => onCommit(Math.max(min, Math.round(Number(v) || 0)))}
      />
    </Field>
  );
}

function TitleInput({ initial, onCommit }: { initial: string; onCommit: (t: string) => void }) {
  const [v, setV] = useState(initial);
  useEffect(() => setV(initial), [initial]);
  return (
    <TextInput
      value={v}
      onChange={e => setV(e.target.value)}
      onBlur={() => { const t = v.trim(); if (t && t !== initial) onCommit(t); else setV(initial); }}
    />
  );
}

function DashTab({ goTo }: { goTo: (t: TabId) => void }) {
  const { state, dispatch } = useSlam();
  const poets = poetsOf(state);
  const spectators = state.people.filter(p => p.role === 'spectator');
  const fb = fundBreakdown(state);

  const steps = [
    { label: 'Check-in', done: state.phase !== 'checkin', active: state.phase === 'checkin' },
    { label: 'Порядок и жюри', done: state.round > 0, active: state.phase === 'ordering' },
    { label: 'Туры 15 · 30 · 60', done: state.phase === 'final' || state.phase === 'paid', active: state.round > 0 && state.phase !== 'final' && state.phase !== 'paid' },
    { label: 'Выплата фонда', done: state.phase === 'paid', active: state.phase === 'final' },
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <div className="min-w-0 space-y-5">
        <Reveal>
          <Card className="flex items-center gap-2 overflow-x-auto px-4 py-3">
            {steps.map((s, i) => (
              <div key={s.label} className="flex shrink-0 items-center gap-2">
                <span
                  className={`grid h-6 w-6 place-items-center rounded-full font-mono text-[11px] font-bold ${
                    s.done ? 'bg-mint-500 text-stage-950' : s.active ? 'bg-gold-500 text-stage-950' : 'bg-stage-700 text-stage-400'
                  }`}
                >{s.done ? <IconCheck size={12} /> : i + 1}</span>
                <span className={`text-xs font-semibold ${s.active ? 'text-gold-300' : s.done ? 'text-mint-300' : 'text-stage-400'}`}>{s.label}</span>
                {i < steps.length - 1 && <span className="h-px w-5 bg-stage-600" />}
              </div>
            ))}
          </Card>
        </Reveal>

        <Reveal delay={60}>
          <Card className="card-hover p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-500">Мероприятие</div>
                <h2 className="mt-1 font-display text-xl font-bold text-stage-50">{state.cfg.title}</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-stage-300">{state.cfg.description}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-stage-400">
                  <Chip tone="plain">{state.cfg.dateLabel}</Chip>
                  <Chip tone="plain">{state.cfg.venue}</Chip>
                  <Chip tone="gold">Поэт {fmtMoney(state.cfg.poetFee)}</Chip>
                  <Chip tone="gold">Зритель {fmtMoney(state.cfg.spectatorFee)}</Chip>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono text-[10.5px] uppercase tracking-[0.18em] text-stage-400">Призовой фонд</div>
                <Money value={fund(state)} className="font-display text-3xl font-bold text-gold-400" />
                <div className="mt-1 flex items-center justify-end gap-1.5 text-[11px] text-mint-300">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-mint-400" /> live у всех участников
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {state.phase === 'checkin' && (
                <>
                  <Btn variant="gold" onClick={() => dispatch({ type: 'DEMO_START' })}><IconCheck size={16} /> Демо: допустить всех оплативших</Btn>
                  <Btn variant="ghost" onClick={() => goTo('checkin')}><IconQr size={15} /> Сканировать по одному</Btn>
                </>
              )}
              {state.phase === 'ordering' && (
                <Btn variant="live" size="lg" onClick={() => dispatch({ type: 'START_ROUND' })}><IconPlay size={15} /> Начать тур 1 · {state.cfg.durations[0]} c</Btn>
              )}
              {state.phase === 'roundEnd' && (
                <Btn variant="live" size="lg" onClick={() => dispatch({ type: 'START_ROUND' })}><IconPlay size={15} /> Начать тур {state.round + 1} · {state.cfg.durations[state.round] ?? 60} c</Btn>
              )}
              {(state.phase === 'performing' || state.phase === 'voting' || state.phase === 'reveal') && (
                <Btn variant="live" onClick={() => goTo('live')}><IconMic size={15} /> Перейти в эфир</Btn>
              )}
              {state.phase === 'final' && (
                <Btn variant="gold" size="lg" onClick={() => goTo('live')}><IconCoin size={16} /> Выплатить фонд победителю</Btn>
              )}
              {state.phase === 'paid' && (
                <Btn variant="dim" onClick={() => dispatch({ type: 'RESET' })}>Сбросить сессию и начать заново</Btn>
              )}
            </div>
          </Card>
        </Reveal>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Reveal delay={80}><StatBig label="Поэты" value={`${poets.filter(p => p.checkedIn).length}/${poets.length}`} hint="на площадке / заявок" /></Reveal>
          <Reveal delay={120}><StatBig label="Зрители" value={`${spectators.filter(p => p.checkedIn).length}`} hint={`из ${spectators.length} зарегистрированы`} accent="mint" /></Reveal>
          <Reveal delay={160}><StatBig label="Жюри" value={`${state.jury.length}`} hint={`ветвь алгоритма: ${algoBranch(state.jury.length)}`} accent="live" /></Reveal>
          <Reveal delay={200}><StatBig label="Сборы" value={fmtMoney(fb.poets + fb.spectators)} hint={`спонсоры ${fmtMoney(fb.sponsors)}`} /></Reveal>
        </div>

        <Reveal delay={100}>
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-display text-base font-bold text-stage-50">Настройки мероприятия</h3>
              <Chip tone="dim">изменения рассылаются по socket всем клиентам</Chip>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="sm:col-span-2 lg:col-span-4">
                <Field label="Название мероприятия">
                  <TitleInput initial={state.cfg.title} onCommit={t => dispatch({ type: 'SET_CFG', patch: { title: t } })} />
                </Field>
              </div>
              <NumField label="Взнос поэта, ₽" value={state.cfg.poetFee} onCommit={n => dispatch({ type: 'SET_CFG', patch: { poetFee: n } })} />
              <NumField label="Взнос зрителя, ₽" value={state.cfg.spectatorFee} onCommit={n => dispatch({ type: 'SET_CFG', patch: { spectatorFee: n } })} />
              <NumField label="Лимит поэтов (0 = без)" value={state.cfg.maxPoets ?? 0} onCommit={n => dispatch({ type: 'SET_CFG', patch: { maxPoets: n || null } })} />
              <NumField label="Лимит судей (0 = без)" value={state.cfg.maxJudges ?? 0} onCommit={n => dispatch({ type: 'SET_CFG', patch: { maxJudges: n || null } })} />
              <NumField label="Тур 1, сек" value={state.cfg.durations[0]} onCommit={n => dispatch({ type: 'SET_CFG', patch: { durations: [Math.max(5, n), state.cfg.durations[1], state.cfg.durations[2]] } })} />
              <NumField label="Тур 2, сек" value={state.cfg.durations[1]} onCommit={n => dispatch({ type: 'SET_CFG', patch: { durations: [state.cfg.durations[0], Math.max(5, n), state.cfg.durations[2]] } })} />
              <NumField label="Тур 3, сек" value={state.cfg.durations[2]} onCommit={n => dispatch({ type: 'SET_CFG', patch: { durations: [state.cfg.durations[0], state.cfg.durations[1], Math.max(5, n)] } })} />
              <div className="flex flex-col justify-end gap-2.5 pb-1">
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-stage-200">
                  Поэты могут судить
                  <Toggle on={state.cfg.poetsCanJudge} onChange={() => dispatch({ type: 'SET_CFG', patch: { poetsCanJudge: !state.cfg.poetsCanJudge } })} />
                </label>
                <label className="flex items-center justify-between gap-3 text-xs font-semibold text-stage-200">
                  Анонимное жюри
                  <Toggle on={state.cfg.anonymousJury} disabled={state.phase === 'voting'} onChange={() => dispatch({ type: 'SET_CFG', patch: { anonymousJury: !state.cfg.anonymousJury } })} />
                </label>
              </div>
            </div>
          </Card>
        </Reveal>
      </div>

      <FeedColumn feed={state.feed} />
    </div>
  );
}

function StatBig({ label, value, hint, accent = 'gold' }: { label: string; value: string; hint?: string; accent?: 'gold' | 'mint' | 'live' }) {
  const c = accent === 'mint' ? 'text-mint-300' : accent === 'live' ? 'text-live-400' : 'text-gold-400';
  return (
    <Card className="card-hover p-4">
      <div className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-stage-400">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-bold tabular-nums ${c}`}>{value}</div>
      {hint && <div className="mt-0.5 text-[11px] text-stage-400">{hint}</div>}
    </Card>
  );
}

export function FeedColumn({ feed }: { feed: SlamState['feed'] }) {
  return (
    <Card className="flex h-fit max-h-[640px] flex-col overflow-hidden">
      <div className="flex items-center justify-between border-b border-stage-700 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="live-dot h-2 w-2 rounded-full bg-mint-400" />
          <span className="font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-stage-200">Socket-лента</span>
        </div>
        <span className="font-mono text-[10px] text-stage-500">event:live</span>
      </div>
      <div className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {[...feed].reverse().map(m => (
          <div key={m.id} className="fade-up flex items-start gap-2 rounded-md px-2 py-1.5 text-[12px] leading-snug hover:bg-stage-800">
            <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${m.kind === 'pay' ? 'bg-mint-400' : m.kind === 'ws' ? 'bg-gold-500' : 'bg-stage-500'}`} />
            <span className="text-stage-200">{m.text}</span>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ================= Check-in ================= */

function CheckInTab() {
  const { state, dispatch } = useSlam();
  const [auto, setAuto] = useState(false);
  const scanning = state.phase === 'checkin';
  const pending = state.people.filter(p => p.paid && !p.checkedIn);

  useEffect(() => {
    if (!auto || !scanning || pending.length === 0) return;
    const iv = window.setInterval(() => dispatch({ type: 'SCAN_NEXT' }), 1500);
    return () => window.clearInterval(iv);
  }, [auto, scanning, pending.length, dispatch]);

  const checkedPoets = state.people.filter(p => p.role === 'poet' && p.checkedIn).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[360px_minmax(0,1fr)]">
      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-stage-50">QR-сканер</h3>
            <Chip tone={scanning ? 'mint' : 'dim'}>{scanning ? 'активен' : 'не нужен'}</Chip>
          </div>
          <div className="relative mx-auto aspect-square w-full max-w-[260px] overflow-hidden rounded-xl border border-stage-600 bg-stage-950">
            <div className="absolute inset-0 opacity-[0.35]" style={{ backgroundImage: 'radial-gradient(rgba(232,163,61,0.25) 1px, transparent 1px)', backgroundSize: '14px 14px' }} />
            {scanning && <div className="scan-line absolute left-[8%] right-[8%] h-0.5 rounded bg-gold-400 shadow-[0_0_18px_2px_rgba(232,163,61,0.8)]" />}
            {[[8, 8], [8, 92], [92, 8], [92, 92]].map(([x, y], i) => (
              <span key={i} className="absolute h-6 w-6 border-gold-500" style={{
                left: `${x}%`, top: `${y}%`,
                transform: 'translate(-50%,-50%)',
                borderLeft: x < 50 ? '2.5px solid' : 'none', borderTop: y < 50 ? '2.5px solid' : 'none',
                borderRight: x > 50 ? '2.5px solid' : 'none', borderBottom: y > 50 ? '2.5px solid' : 'none',
              }} />
            ))}
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <IconQr size={40} className="mx-auto text-stage-500" />
                <div className="mt-2 font-mono text-[10.5px] uppercase tracking-[0.2em] text-stage-500">
                  {scanning ? (pending.length ? 'наведите камеру' : 'все отмечены') : 'режим выключен'}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <Btn className="w-full" disabled={!scanning || pending.length === 0} onClick={() => dispatch({ type: 'SCAN_NEXT' })}>
              <IconQr size={15} /> Отсканировать следующий билет
            </Btn>
            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-xs font-semibold text-stage-300">
                <Toggle on={auto} disabled={!scanning} onChange={() => setAuto(a => !a)} /> автоскан каждые 1,5 c
              </label>
              <span className="font-mono text-xs text-stage-400">осталось: {pending.length}</span>
            </div>
            {scanning && checkedPoets >= 2 && state.order.length === 0 && (
              <Btn variant="mint" className="w-full" onClick={() => dispatch({ type: 'FORM_ORDER' })}>
                Сформировать случайный порядок ({checkedPoets} поэтов)
              </Btn>
            )}
          </div>
        </Card>
        <Card className="p-4 text-xs leading-relaxed text-stage-300">
          <span className="font-bold text-gold-300">Регламент:</span> участник показывает QR из приложения, система фиксирует
          присутствие. Для присутствующих поэтов формируется случайный порядок — его можно перетасовать вручную до старта
          первого тура. Пул жюри собирается из отметивших «хочу судить».
        </Card>
      </div>

      <Card className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-stage-700 px-4 py-3">
          <h3 className="font-display text-base font-bold text-stage-50">Участники</h3>
          <div className="flex gap-2">
            <Chip tone="mint">{state.people.filter(p => p.checkedIn).length} на площадке</Chip>
            <Chip tone="dim">{state.people.filter(p => !p.paid).length} не оплатили</Chip>
          </div>
        </div>
        <div className="max-h-[560px] divide-y divide-stage-800 overflow-y-auto">
          {state.people.map(p => (
            <div key={p.id} className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-stage-800/60 ${!p.paid ? 'opacity-70' : ''}`}>
              <Avatar person={p} size={34} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-stage-100">{p.name}</div>
                <div className="flex items-center gap-1.5 text-[11px] text-stage-400">
                  {p.role === 'poet' ? 'поэт' : 'зритель'}
                  {p.wantsJudge && <span className="text-gold-400">· хочет судить</span>}
                </div>
              </div>
              {p.paid ? <Stamp tone="mint">оплачено</Stamp> : (
                <Btn size="sm" variant="ghost" onClick={() => dispatch({ type: 'TOGGLE_PAID', id: p.id })}>
                  Подтвердить взнос {fmtMoney(p.role === 'poet' ? state.cfg.poetFee : state.cfg.spectatorFee)}
                </Btn>
              )}
              <button
                onClick={() => p.paid && dispatch({ type: 'TOGGLE_CHECKIN', id: p.id })}
                disabled={!p.paid || !scanning}
                className={`btn-press grid h-8 w-8 shrink-0 place-items-center rounded-lg border ${
                  p.checkedIn ? 'border-mint-500/60 bg-mint-500/15 text-mint-300' : 'border-stage-600 text-stage-500'
                } ${(!p.paid || !scanning) ? 'cursor-not-allowed opacity-40' : 'hover:border-mint-400'}`}
                title={p.checkedIn ? 'Отменить check-in' : 'Отметить присутствие'}
              >
                {p.checkedIn ? <IconCheck size={15} /> : <IconX size={15} />}
              </button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ================= Порядок выступлений ================= */

function OrderTab() {
  const { state, dispatch } = useSlam();
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [overIdx, setOverIdx] = useState<number | null>(null);
  const editable = state.phase === 'ordering';

  const ids = state.round > 0 ? activeIds(state, state.round) : state.order;

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stage-700 px-4 py-3">
          <div>
            <h3 className="font-display text-base font-bold text-stage-50">
              Порядок выступлений{state.round > 0 ? ` · тур ${state.round}` : ' · тур 1'}
            </h3>
            <p className="text-[11.5px] text-stage-400">
              {editable ? 'Перетащите строки, чтобы изменить порядок. Порядок сохраняется на все туры — выбывшие пропускаются.' : 'Порядок фиксируется на всё мероприятие после старта тура 1.'}
            </p>
          </div>
          {editable && (
            <Btn variant="ghost" size="sm" onClick={() => dispatch({ type: 'FORM_ORDER' })}>
              <IconBolt size={14} /> Перемешать случайно
            </Btn>
          )}
        </div>
        {ids.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-stage-400">
            Порядок появится после check-in поэтов. Перейдите на вкладку <span className="font-bold text-gold-300">Check-in</span>.
          </div>
        ) : (
          <ul className="divide-y divide-stage-800">
            {ids.map((id, i) => {
              const p = personById(state, id);
              if (!p) return null;
              const done = state.round > 0 && i < state.idx && (state.phase !== 'roundEnd' && state.phase !== 'final' && state.phase !== 'paid');
              const current = state.round > 0 && i === state.idx && (state.phase === 'performing' || state.phase === 'voting' || state.phase === 'reveal');
              return (
                <li
                  key={id}
                  draggable={editable}
                  onDragStart={() => setDragIdx(i)}
                  onDragOver={e => { e.preventDefault(); setOverIdx(i); }}
                  onDragLeave={() => setOverIdx(o => (o === i ? null : o))}
                  onDrop={() => {
                    if (dragIdx !== null && dragIdx !== i) dispatch({ type: 'REORDER', from: dragIdx, to: i });
                    setDragIdx(null); setOverIdx(null);
                  }}
                  onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${editable ? 'cursor-grab active:cursor-grabbing' : ''} ${
                    dragIdx === i ? 'drag-ghost' : ''} ${overIdx === i && dragIdx !== null && dragIdx !== i ? 'drag-over' : ''} ${current ? 'bg-gold-500/10' : 'hover:bg-stage-800/60'}`}
                >
                  {editable ? <IconGrip size={16} className="shrink-0 text-stage-500" /> : (
                    <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold ${
                      current ? 'bg-gold-500 text-stage-950' : done ? 'bg-stage-700 text-stage-400' : 'bg-stage-800 text-stage-300 border border-stage-600'
                    }`}>{i + 1}</span>
                  )}
                  <Avatar person={p} size={34} />
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-semibold ${done ? 'text-stage-500 line-through' : 'text-stage-100'}`}>{p.name}</div>
                    <div className="truncate text-[11.5px] text-stage-400">«{p.poems?.[(state.round > 0 ? state.round : 1) - 1]}»</div>
                  </div>
                  {current && <Chip tone="live"><span className="live-dot h-1.5 w-1.5 rounded-full bg-live-400" />на сцене</Chip>}
                  {done && <Chip tone="dim">выступил</Chip>}
                  {editable && <span className="font-mono text-[11px] text-stage-500">#{i + 1}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <div className="space-y-4">
        <Card className="p-4">
          <h4 className="font-display text-sm font-bold text-stage-50">Как формируется порядок</h4>
          <ol className="mt-2 list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-stage-300">
            <li>После check-in всех присутствующих поэтов система тасует случайно.</li>
            <li>Организатор правит drag-and-drop до старта тура 1.</li>
            <li>В турах 2 и 3 порядок — тот же, без выбывших (лучшая половина, округление вверх).</li>
            <li>Опоздавший поэт добавляется повторной жеребьёвкой на вкладке Check-in.</li>
          </ol>
        </Card>
        <Card className="p-4">
          <h4 className="font-display text-sm font-bold text-stage-50">Сетка выживания</h4>
          <div className="mt-2 space-y-1.5 font-mono text-xs text-stage-300">
            {[state.order.length || poetsOf(state).length].map(n => (
              <div key={n} className="space-y-1.5">
                <div className="flex justify-between"><span>Тур 1 · {state.cfg.durations[0]} c</span><span className="text-gold-400">{n} поэтов</span></div>
                <div className="flex justify-between"><span>Тур 2 · {state.cfg.durations[1]} c</span><span className="text-gold-400">{Math.ceil(n / 2)}</span></div>
                <div className="flex justify-between"><span>Тур 3 · {state.cfg.durations[2]} c</span><span className="text-gold-400">{Math.ceil(Math.ceil(n / 2) / 2)}</span></div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= Жюри ================= */

export function AlgoCards({ n }: { n: number }) {
  const active = algoBranch(n);
  const items = [
    { k: 1, title: 'n < 5', text: 'Среднее арифметическое всех оценок — без отбрасываний.' },
    { k: 2, title: '5 ≤ n ≤ 6', text: 'Сортировка; минимум заменяется следующим значением, максимум — предпоследним; среднее изменённого массива.' },
    { k: 3, title: 'n > 6', text: 'Отбрасываются k = ⌊n/7⌋ самых низких и k самых высоких; среднее по оставшимся n − 2k.' },
  ];
  return (
    <div className="grid gap-2.5 sm:grid-cols-3">
      {items.map(it => (
        <Card key={it.k} className={`p-3.5 ${active === it.k ? 'border-gold-500/60 bg-gold-500/5' : 'opacity-75'}`}>
          <div className="flex items-center justify-between">
            <span className="font-mono text-[11px] font-bold uppercase tracking-[0.14em] text-gold-400">{it.title}</span>
            {active === it.k && <Chip tone="gold">активна</Chip>}
          </div>
          <p className="mt-1.5 text-[12px] leading-relaxed text-stage-300">{it.text}</p>
        </Card>
      ))}
    </div>
  );
}

function JuryTab() {
  const { state, dispatch } = useSlam();
  const pool = juryPool(state);
  const n = state.jury.length;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <StatBig label="Судей в составе" value={`${n}`} hint={n === 0 ? 'наберите из пула справа' : `ветвь алгоритма ${algoBranch(n)} из 3`} />
        <StatBig label="Шкала" value="1–7" hint="целые баллы, одна оценка на выступление" accent="live" />
        <StatBig label="Анонимность" value={state.cfg.anonymousJury ? 'вкл' : 'выкл'} hint={state.cfg.anonymousJury ? 'участники видят только числа' : 'видны имена и фото судей'} accent="mint" />
      </div>

      <Reveal>
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="font-display text-base font-bold text-stage-50">Алгоритм итогового балла (ТЗ, п. 4)</h3>
            <span className="font-mono text-[11px] text-stage-400">пересчёт автоматический, без ручных расчётов</span>
          </div>
          <AlgoCards n={n} />
        </div>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stage-700 px-4 py-3">
            <h3 className="font-display text-base font-bold text-stage-50">Пул и состав жюри</h3>
            <Chip tone={state.phase === 'voting' ? 'live' : 'dim'}>{state.phase === 'voting' ? 'состав зафиксирован' : 'состав можно менять'}</Chip>
          </div>
          {pool.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-stage-400">
              Пул пуст: жюри набирается из участников с отметкой «хочу судить» после check-in.
              {state.cfg.poetsCanJudge || ' Поэты сейчас судить не могут — включите тумблер справа.'}
            </div>
          ) : (
            <ul className="divide-y divide-stage-800">
              {pool.map(p => {
                const inJury = state.jury.includes(p.id);
                return (
                  <li key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-stage-800/60">
                    <Avatar person={p} size={34} ring={inJury} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold text-stage-100">{p.name}</div>
                      <div className="text-[11px] text-stage-400">{p.role === 'poet' ? 'поэт-судья' : 'зритель'}</div>
                    </div>
                    {inJury ? <Chip tone="gold">судья</Chip> : <Chip tone="dim">в пуле</Chip>}
                    <button
                      onClick={() => dispatch({ type: 'TOGGLE_JUROR', id: p.id })}
                      disabled={state.phase === 'voting'}
                      className={`btn-press grid h-8 w-8 place-items-center rounded-lg border ${
                        inJury ? 'border-gold-500/60 bg-gold-500/15 text-gold-300' : 'border-stage-600 text-stage-500 hover:border-gold-500/50'
                      } ${state.phase === 'voting' ? 'cursor-not-allowed opacity-40' : ''}`}
                      title={inJury ? 'Вывести из жюри' : 'Включить в жюри'}
                    >
                      {inJury ? <IconCheck size={15} /> : <span className="font-mono text-sm font-bold">+</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <div className="space-y-4">
          <Card className="space-y-3.5 p-4">
            <h4 className="font-display text-sm font-bold text-stage-50">Правила судейства</h4>
            <label className="flex items-center justify-between gap-3 text-xs font-semibold text-stage-200">
              Поэты могут быть судьями
              <Toggle on={state.cfg.poetsCanJudge} onChange={() => dispatch({ type: 'SET_CFG', patch: { poetsCanJudge: !state.cfg.poetsCanJudge } })} />
            </label>
            <label className="flex items-center justify-between gap-3 text-xs font-semibold text-stage-200">
              Анонимные оценки
              <Toggle on={state.cfg.anonymousJury} disabled={state.phase === 'voting'} onChange={() => dispatch({ type: 'SET_CFG', patch: { anonymousJury: !state.cfg.anonymousJury } })} />
            </label>
            <p className="text-[11.5px] leading-relaxed text-stage-400">
              Анонимность меняется до мероприятия или между турами — во время голосования переключатель заблокирован.
              Организатор всегда видит, кто что поставил.
            </p>
          </Card>
          <Card className="p-4">
            <h4 className="font-display text-sm font-bold text-stage-50">Тайминг голосования</h4>
            <ul className="mt-2 space-y-1.5 text-xs leading-relaxed text-stage-300">
              <li>· открывается сразу после сигнала «время вышло»;</li>
              <li>· автозакрытие, когда проголосовали все судьи;</li>
              <li>· организатор может закрыть вручную или продлить.</li>
            </ul>
          </Card>
        </div>
      </div>
    </div>
  );
}

