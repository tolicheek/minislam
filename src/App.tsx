import { useEffect, useState } from 'react';
import { SlamProvider, useSlam } from './state/SlamContext';
import { fund, PHASE_LABEL } from './lib/engine';
import { Chip, Money } from './components/bits';
import { IconMic, IconCoin, IconBolt, IconWave } from './components/bits';
import { OrganizerPanel } from './components/OrganizerPanel';
import type { TabId } from './components/OrganizerPanel';
import { PhoneClient } from './components/PhoneClient';

function Header() {
  const { state } = useSlam();
  const [ping, setPing] = useState(47);
  useEffect(() => {
    const iv = window.setInterval(() => setPing(34 + Math.floor(Math.random() * 60)), 2000);
    return () => window.clearInterval(iv);
  }, []);
  const liveHot = state.phase === 'performing' || state.phase === 'voting' || state.phase === 'reveal';

  return (
    <header className="sticky top-0 z-40 border-b border-stage-700/80 bg-stage-900/85 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1560px] items-center justify-between gap-3 px-4 py-3 lg:px-6">
        <div className="flex items-center gap-3">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold-500 text-stage-950 shadow-[0_8px_24px_-8px_rgba(232,163,61,0.8)]">
            <IconMic size={20} />
          </span>
          <div>
            <div className="font-display text-lg font-black leading-none tracking-tight text-stage-50">МИНИ-СЛЭМ</div>
            <div className="mt-1 font-mono text-[9.5px] font-medium uppercase tracking-[0.26em] text-stage-400">
              автоматизация поэтических слэмов
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="hidden items-center gap-1.5 rounded-full border border-mint-500/40 bg-mint-500/10 px-2.5 py-1 font-mono text-[10.5px] font-semibold text-mint-300 md:flex">
            <span className="live-dot h-1.5 w-1.5 rounded-full bg-mint-400" />
            wss · {ping} мс
          </span>
          <Chip tone={liveHot ? 'live' : state.phase === 'paid' ? 'mint' : 'gold'} className="hidden sm:inline-flex">
            {liveHot && <span className="live-dot h-1.5 w-1.5 rounded-full bg-live-400" />}
            {PHASE_LABEL[state.phase]}
          </Chip>
          <span className="flex items-center gap-1.5 rounded-full border border-gold-500/50 bg-gold-500/10 px-3 py-1">
            <IconCoin size={13} className="text-gold-400" />
            <Money value={fund(state)} className="font-mono text-[12px] font-bold text-gold-300" />
          </span>
        </div>
      </div>
      <Ticker />
    </header>
  );
}

function Ticker() {
  const { state } = useSlam();
  const items = [
    ...state.feed.slice(-6).map(m => m.text),
    'Призовой фонд обновляется в реальном времени',
    'Оценки жюри — шкала 1–7, итог считается автоматически',
    'Туры: 15 · 30 · 60 секунд',
  ];
  const row = items.map((t, i) => (
    <span key={i} className="flex items-center gap-3">
      <span className="text-gold-500">◆</span>
      <span>{t}</span>
    </span>
  ));
  return (
    <div className="overflow-hidden border-t border-stage-800 bg-stage-950/70 py-1.5">
      <div className="ticker-track flex w-max items-center gap-3 whitespace-nowrap font-mono text-[10.5px] uppercase tracking-[0.14em] text-stage-400">
        <div className="flex items-center gap-3 pr-3">{row}</div>
        <div className="flex items-center gap-3 pr-3" aria-hidden>{row}</div>
      </div>
    </div>
  );
}

function Shell() {
  const [tab, setTab] = useState<TabId>('dash');
  return (
    <div className="bg-stage-ambient relative min-h-screen overflow-x-clip">
      <div className="spotlight spot-a left-[-180px] top-[-160px] h-[520px] w-[520px] bg-gold-500/10" />
      <div className="spotlight spot-b right-[-140px] top-[220px] h-[460px] w-[460px] bg-live-500/10" />
      <div className="spotlight spot-a bottom-[-220px] left-[30%] h-[520px] w-[520px] bg-mint-500/5" />
      <div className="curtain-top absolute inset-x-0 top-0 h-16 opacity-40" aria-hidden />
      <div className="noise-overlay" aria-hidden />

      <Header />

      <main className="relative z-10 mx-auto grid max-w-[1560px] items-start gap-6 px-4 pb-20 pt-6 lg:px-6 xl:grid-cols-[minmax(0,1fr)_396px]">
        <OrganizerPanel tab={tab} setTab={setTab} />
        <aside className="xl:sticky xl:top-[110px]">
          <PhoneClient />
        </aside>
      </main>

      <footer className="relative z-10 border-t border-stage-800 bg-stage-950/60">
        <div className="mx-auto flex max-w-[1560px] flex-wrap items-center justify-between gap-3 px-4 py-5 lg:px-6">
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-stage-500">
            <IconBolt size={13} className="text-gold-500" />
            прототип: backend (NestJS) и socket-комната эмулируются в браузере · задержка обновления &lt; 1 c
          </div>
          <div className="flex items-center gap-2 font-mono text-[10.5px] uppercase tracking-[0.16em] text-stage-500">
            <IconWave size={14} className="text-live-400" />
            боевая архитектура, API и план MVP — вкладка «Архитектура»
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <SlamProvider>
      <Shell />
    </SlamProvider>
  );
}
