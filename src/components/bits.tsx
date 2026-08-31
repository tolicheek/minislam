import { useEffect, useMemo, useRef, useState } from 'react';
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SVGProps } from 'react';
import { qrMatrix } from '../lib/engine';
import type { Person } from '../lib/engine';

/* ---------------- Иконки (inline SVG) ---------------- */

type IP = SVGProps<SVGSVGElement> & { size?: number };
const base = (p: IP) => {
  const { size = 18, ...rest } = p;
  return { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, ...rest };
};

export const IconMic = (p: IP) => (
  <svg {...base(p)}><rect x="9" y="2.5" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3.5M8.5 21.5h7" /></svg>
);
export const IconQr = (p: IP) => (
  <svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><path d="M14 14h3v3h-3zM21 14v.01M14 21v.01M17.5 17.5 21 21M21 17.5v.01M17.5 21v.01" /></svg>
);
export const IconTimer = (p: IP) => (
  <svg {...base(p)}><circle cx="12" cy="13.5" r="7.5" /><path d="M12 10v3.5l2.5 2M9.5 2.5h5M12 2.5V6" /></svg>
);
export const IconUsers = (p: IP) => (
  <svg {...base(p)}><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c.6-3.4 2.8-5.3 5.5-5.3s4.9 1.9 5.5 5.3M15.5 5.2a3.2 3.2 0 0 1 0 5.9M17.5 14.9c1.8.7 2.7 2.5 3 5.1" /></svg>
);
export const IconCoin = (p: IP) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5v9M9.3 9.7c0-1.2 1.2-2 2.7-2s2.7.8 2.7 2c0 2.8-5.4 1.8-5.4 4.6 0 1.2 1.2 2 2.7 2s2.7-.8 2.7-2" /></svg>
);
export const IconExport = (p: IP) => (
  <svg {...base(p)}><path d="M12 3v11M8 10.5 12 14l4-3.5M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
);
export const IconGrip = (p: IP) => (
  <svg {...base(p)}><circle cx="9" cy="6" r="1" fill="currentColor" /><circle cx="15" cy="6" r="1" fill="currentColor" /><circle cx="9" cy="12" r="1" fill="currentColor" /><circle cx="15" cy="12" r="1" fill="currentColor" /><circle cx="9" cy="18" r="1" fill="currentColor" /><circle cx="15" cy="18" r="1" fill="currentColor" /></svg>
);
export const IconCheck = (p: IP) => (<svg {...base(p)}><path d="m4.5 12.5 5 5 10-11" /></svg>);
export const IconX = (p: IP) => (<svg {...base(p)}><path d="m6 6 12 12M18 6 6 18" /></svg>);
export const IconStar = (p: IP) => (
  <svg {...base(p)}><path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 16.9l-5.2 2.8 1-5.9-4.3-4.1 5.9-.8z" /></svg>
);
export const IconBolt = (p: IP) => (<svg {...base(p)}><path d="M13 2.5 4.5 13.5H11l-1 8L19 10.5h-6.5z" /></svg>);
export const IconWave = (p: IP) => (
  <svg {...base(p)}><path d="M3 12c1.5 0 1.5-5 3-5s1.5 10 3 10 1.5-8 3-8 1.5 6 3 6 1.5-3 3-3 1.5 2 3 2" /></svg>
);
export const IconPlay = (p: IP) => (<svg {...base(p)}><path d="M7 4.5v15l12-7.5z" fill="currentColor" stroke="none" /></svg>);
export const IconDoc = (p: IP) => (
  <svg {...base(p)}><path d="M6 2.5h8L20 8v13.5H6z" /><path d="M14 2.5V8h6M9 12.5h6M9 16h6" /></svg>
);
export const IconPhone = (p: IP) => (
  <svg {...base(p)}><rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M10.5 5h3M11 18.5h2" /></svg>
);
export const IconGavel = (p: IP) => (
  <svg {...base(p)}><path d="m9 7 8 8M12.5 3.5 17 8l-3 3-4.5-4.5zM3.5 21.5h9M14 11.5 4.5 21" /></svg>
);

/* ---------------- Базовые блоки ---------------- */

export function Avatar({ person, size = 40, ring = false }: { person: Person; size?: number; ring?: boolean }) {
  const initials = person.name.split(' ').map(w => w[0]).slice(0, 2).join('');
  return (
    <div
      className={`grid shrink-0 place-items-center rounded-full font-bold text-stage-950 ${ring ? 'ring-2 ring-gold-500/70 ring-offset-2 ring-offset-stage-900' : ''}`}
      style={{
        width: size, height: size,
        fontSize: size * 0.36,
        background: `linear-gradient(135deg, hsl(${person.hue} 62% 62%), hsl(${person.hue + 24} 55% 45%))`,
      }}
      aria-hidden
    >{initials}</div>
  );
}

export function Stat({ label, value, accent = 'gold', hint }: { label: string; value: ReactNode; accent?: 'gold' | 'live' | 'mint' | 'plain'; hint?: string }) {
  const color = accent === 'gold' ? 'text-gold-400' : accent === 'live' ? 'text-live-400' : accent === 'mint' ? 'text-mint-400' : 'text-stage-100';
  return (
    <div className="rounded-xl border border-stage-700 bg-stage-850/80 p-4">
      <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stage-400">{label}</div>
      <div className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${color}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-stage-400">{hint}</div>}
    </div>
  );
}

export function Toggle({ on, onChange, disabled, label }: { on: boolean; onChange: () => void; disabled?: boolean; label?: string }) {
  return (
    <button
      type="button" onClick={onChange} disabled={disabled} aria-pressed={on} aria-label={label}
      className={`btn-press relative h-6 w-11 shrink-0 rounded-full border transition-colors ${on ? 'border-gold-500/60 bg-gold-500/80' : 'border-stage-600 bg-stage-700'} ${disabled ? 'cursor-not-allowed opacity-40' : 'cursor-pointer'}`}
    >
      <span className={`absolute top-[3px] h-4 w-4 rounded-full bg-stage-50 shadow transition-all duration-200 ${on ? 'left-[24px]' : 'left-[3px]'}`} />
    </button>
  );
}

export function SectionHead({ kicker, title, right }: { kicker: string; title: string; right?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="mb-1 font-mono text-[11px] font-medium uppercase tracking-[0.22em] text-gold-500">{kicker}</div>
        <h2 className="font-display text-xl font-bold text-stage-50 sm:text-2xl">{title}</h2>
      </div>
      {right}
    </div>
  );
}

/* ---------------- Таймер-кольцо ---------------- */

export function TimerRing({ total, left, size = 200, urgent }: { total: number; left: number; size?: number; urgent?: boolean }) {
  const r = (size - 18) / 2;
  const c = 2 * Math.PI * r;
  const frac = total > 0 ? left / total : 0;
  const secs = Math.ceil(left);
  const color = urgent ? '#e4572e' : frac < 0.35 ? '#ff7a52' : '#e8a33d';
  return (
    <div className={`relative inline-block ${urgent ? 'urgent-pulse rounded-full' : 'ring-glow'}`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#33271b" strokeWidth="7" fill="rgba(18,13,8,0.72)" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="7" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - frac)}
          style={{ transition: 'stroke-dashoffset 0.2s linear, stroke 0.4s' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="font-mono font-semibold tabular-nums leading-none" style={{ fontSize: size * 0.26, color }}>
          {secs}
        </div>
        <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-stage-400">сек</div>
      </div>
    </div>
  );
}

/* ---------------- QR ---------------- */

export function QRBox({ seed, size = 168, dark = '#17110b', light = '#f7f0e1' }: { seed: string; size?: number; dark?: string; light?: string }) {
  const m = useMemo(() => qrMatrix(seed), [seed]);
  const n = m.length;
  const cell = size / n;
  return (
    <svg width={size} height={size} style={{ background: light }} className="rounded-lg" role="img" aria-label={`QR-код участника ${seed}`}>
      {m.map((row, y) => row.map((on, x) => on
        ? <rect key={`${x}-${y}`} x={x * cell} y={y * cell} width={cell} height={cell} fill={dark} />
        : null))}
    </svg>
  );
}

/* ---------------- Scroll reveal ---------------- */

export function Reveal({ children, delay = 0, className = '' }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setInView(true); io.disconnect(); }
    }, { threshold: 0.12 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <div ref={ref} className={`${inView ? 'reveal-in' : 'reveal-init'} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ---------------- Конфетти ---------------- */

export function Confetti({ count = 42 }: { count?: number }) {
  const pieces = useMemo(() => Array.from({ length: count }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    color: ['#e8a33d', '#e4572e', '#6cc39a', '#f7f0e1', '#ffc96b'][i % 5],
    cx: `${(Math.random() - 0.5) * 160}px`,
    cr: `${300 + Math.random() * 500}deg`,
    cd: `${2.6 + Math.random() * 2.6}s`,
    cw: `${Math.random() * 2.4}s`,
    w: 5 + Math.random() * 7,
    h: 8 + Math.random() * 8,
    round: Math.random() > 0.6,
  })), [count]);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map(p => (
        <span
          key={p.id} className="confetti-piece absolute -top-6 block"
          style={{
            left: `${p.left}%`, width: p.w, height: p.round ? p.w : p.h,
            background: p.color, borderRadius: p.round ? '50%' : '2px',
            ['--cx' as string]: p.cx, ['--cr' as string]: p.cr, ['--cd' as string]: p.cd, ['--cw' as string]: p.cw,
          }}
        />
      ))}
    </div>
  );
}

/* ---------------- Формат ---------------- */

export const fmtMoney = (n: number) => `${n.toLocaleString('ru-RU')} ₽`;
export const fmtScore = (n: number) => n.toFixed(2).replace('.', ',');

/* ---------------- Кнопки / карточки / чипы ---------------- */

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'gold' | 'ghost' | 'live' | 'mint' | 'dim';
  size?: 'sm' | 'md' | 'lg';
};
export function Btn({ variant = 'gold', size = 'md', className = '', children, ...rest }: BtnProps) {
  const v = {
    gold: 'bg-gold-500 text-stage-950 hover:bg-gold-400 font-bold shadow-[0_6px_20px_-8px_rgba(232,163,61,0.7)]',
    ghost: 'border border-stage-600 text-stage-100 hover:border-gold-500/70 hover:text-gold-300',
    live: 'bg-live-500 text-stage-50 hover:bg-live-400 font-bold shadow-[0_6px_20px_-8px_rgba(228,87,46,0.8)]',
    mint: 'bg-mint-500 text-stage-950 hover:bg-mint-400 font-bold',
    dim: 'bg-stage-700 text-stage-200 hover:bg-stage-600',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2.5 text-sm', lg: 'px-6 py-3.5 text-[15px]' }[size];
  return (
    <button
      className={`btn-press inline-flex items-center justify-center gap-2 rounded-lg ${v} ${s} disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none ${className}`}
      {...rest}
    >{children}</button>
  );
}

export function Card({ className = '', children }: { className?: string; children: ReactNode }) {
  return <div className={`rounded-xl border border-stage-700 bg-stage-850/80 ${className}`}>{children}</div>;
}

export function Chip({ tone = 'gold', children, className = '' }: { tone?: 'gold' | 'mint' | 'live' | 'plain' | 'dim'; children: ReactNode; className?: string }) {
  const t = {
    gold: 'border-gold-500/40 bg-gold-500/10 text-gold-300',
    mint: 'border-mint-500/40 bg-mint-500/10 text-mint-300',
    live: 'border-live-500/50 bg-live-500/10 text-live-400',
    plain: 'border-stage-600 bg-stage-800 text-stage-200',
    dim: 'border-stage-700 bg-stage-850 text-stage-400',
  }[tone];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10.5px] font-semibold uppercase tracking-[0.12em] ${t} ${className}`}>
      {children}
    </span>
  );
}

/** «Штампованная» печать — для статусов оплаты/выплаты. */
export function Stamp({ children, tone = 'mint' }: { children: ReactNode; tone?: 'mint' | 'gold' | 'live' }) {
  const c = tone === 'mint' ? 'border-mint-400 text-mint-300' : tone === 'gold' ? 'border-gold-500 text-gold-400' : 'border-live-500 text-live-400';
  return (
    <span className={`inline-block -rotate-3 rounded border-2 border-dashed px-2.5 py-1 font-display text-[11px] font-bold uppercase tracking-[0.18em] ${c}`}>
      {children}
    </span>
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block font-mono text-[10.5px] font-semibold uppercase tracking-[0.16em] text-stage-400">{label}</span>
      {children}
    </label>
  );
}

export function TextInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = '', ...rest } = props;
  return (
    <input
      className={`w-full rounded-lg border border-stage-600 bg-stage-800 px-3 py-2 text-sm text-stage-50 outline-none transition-colors placeholder:text-stage-500 focus:border-gold-500/70 ${className}`}
      {...rest}
    />
  );
}

/* ---------------- Анимированные числа ---------------- */

export function useAnimatedNumber(value: number, dur = 650): number {
  const [disp, setDisp] = useState(value);
  const fromRef = useRef(value);
  useEffect(() => {
    const from = fromRef.current;
    if (from === value) return;
    fromRef.current = value;
    const t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const k = Math.min(1, (t - t0) / dur);
      const e = 1 - Math.pow(1 - k, 3);
      setDisp(from + (value - from) * e);
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, dur]);
  return disp;
}

export function Money({ value, className = '' }: { value: number; className?: string }) {
  const v = useAnimatedNumber(value);
  return <span className={`tabular-nums ${className}`}>{fmtMoney(Math.round(v))}</span>;
}

export function Bar({ frac, tone = 'gold', className = '' }: { frac: number; tone?: 'gold' | 'live' | 'mint'; className?: string }) {
  const c = tone === 'gold' ? 'bg-gold-500' : tone === 'live' ? 'bg-live-500' : 'bg-mint-500';
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-stage-700 ${className}`}>
      <div className={`h-full rounded-full ${c} transition-[width] duration-500`} style={{ width: `${Math.max(0, Math.min(1, frac)) * 100}%` }} />
    </div>
  );
}
