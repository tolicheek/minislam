import { useEffect, useState } from 'react';
import { useSlam } from '../state/SlamContext';
import {
  activeIds, currentPoet, fund, fundBreakdown, personById, PHASE_LABEL, RATING,
} from '../lib/engine';
import type { SlamState } from '../lib/engine';
import {
  Avatar, Bar, Btn, Card, Chip, Confetti, Field, Money, Reveal, Stamp, TextInput, TimerRing, fmtMoney, fmtScore,
  IconCheck, IconCoin, IconGavel, IconMic, IconPlay, IconStar, IconTimer, IconUsers, IconExport,
} from './bits';
import { AlgoCards } from './OrganizerPanel';

/* ================= Эфир ================= */

function QueueStrip({ state }: { state: SlamState }) {
  const ids = activeIds(state, state.round);
  const inProgress = state.phase === 'performing' || state.phase === 'voting' || state.phase === 'reveal';
  return (
    <div className="flex flex-wrap gap-1.5">
      {ids.map((id, i) => {
        const p = personById(state, id);
        const cur = inProgress && i === state.idx;
        const done = (inProgress && i < state.idx) || state.phase === 'roundEnd' || state.phase === 'final' || state.phase === 'paid';
        return (
          <span key={id} className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[11px] font-semibold ${
            cur ? 'border-live-500/60 bg-live-500/10 text-live-400' : done ? 'border-stage-700 bg-stage-850 text-stage-500' : 'border-stage-700 bg-stage-850 text-stage-300'
          }`}>
            <span className="font-mono">{i + 1}</span>
            {p?.name.split(' ')[0]}
            {cur && <span className="live-dot h-1.5 w-1.5 rounded-full bg-live-400" />}
          </span>
        );
      })}
    </div>
  );
}

export function LiveRoom() {
  const { state, dispatch } = useSlam();
  const poet = currentPoet(state);
  const dur = state.cfg.durations[(state.round || 1) - 1] ?? 60;

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Chip tone="live"><span className="live-dot h-1.5 w-1.5 rounded-full bg-live-400" />эфир</Chip>
          <Chip tone="plain">{state.round > 0 ? `Тур ${state.round} / 3 · ${dur} c` : 'Подготовка'}</Chip>
          <Chip tone={state.phase === 'voting' ? 'gold' : 'dim'}>{PHASE_LABEL[state.phase]}</Chip>
        </div>
        {state.round > 0 && <QueueStrip state={state} />}
      </Card>

      {(state.phase === 'ordering' || state.phase === 'checkin') && (
        <Card className="p-8 text-center">
          <IconMic size={34} className="mx-auto text-gold-500" />
          <h3 className="mt-3 font-display text-xl font-bold text-stage-50">Эфир ещё не начат</h3>
          <p className="mx-auto mt-2 max-w-md text-sm text-stage-300">
            {state.phase === 'checkin'
              ? 'Сначала завершите check-in и сформируйте порядок выступлений.'
              : `Порядок из ${state.order.length} поэтов готов. Нажмите старт — на всех устройствах появится сцена с таймером.`}
          </p>
          {state.phase === 'ordering' && (
            <Btn variant="live" size="lg" className="mt-5" onClick={() => dispatch({ type: 'START_ROUND' })}>
              <IconPlay size={16} /> Начать тур 1 · {state.cfg.durations[0]} c
            </Btn>
          )}
        </Card>
      )}

      {state.phase === 'performing' && poet && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card className="relative overflow-hidden p-6">
            <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(560px 260px at 30% 0%, rgba(232,163,61,0.14), transparent 70%)' }} />
            <div className="relative">
              <div className="flex items-center gap-2">
                <Chip tone="live"><span className="live-dot h-1.5 w-1.5 rounded-full bg-live-400" />на сцене</Chip>
                <Chip tone="plain">«{poet.poems?.[state.round - 1]}»</Chip>
              </div>
              <div className="mt-4 flex items-center gap-4">
                <Avatar person={poet} size={72} ring />
                <div>
                  <h3 className="font-display text-2xl font-bold text-stage-50 sm:text-3xl">{poet.name}</h3>
                  <p className="mt-1 text-sm text-stage-300">Тур {state.round} · читает стихотворение «{poet.poems?.[state.round - 1]}»</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap items-center gap-3">
                <Btn variant="live" onClick={() => dispatch({ type: 'STOP_PERF' })}><IconTimer size={15} /> Остановить досрочно</Btn>
                <span className="text-xs text-stage-400">По нулю таймера — звуковой сигнал на всех устройствах и автооткрытие голосования.</span>
              </div>
            </div>
          </Card>
          <Card className="grid place-items-center p-6">
            <TimerRing total={dur} left={state.timeLeft} size={230} urgent={state.timeLeft <= 5} />
            <div className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-stage-400">обратный отсчёт</div>
          </Card>
        </div>
      )}

      {state.phase === 'voting' && poet && <VotingBoard poetId={poet.id} />}
      {state.phase === 'reveal' && poet && <RevealCard poetId={poet.id} />}
      {(state.phase === 'roundEnd' || state.phase === 'final' || state.phase === 'paid') && state.round > 0 && <RoundTable />}
    </div>
  );
}

function VotingBoard({ poetId }: { poetId: string }) {
  const { state, dispatch } = useSlam();
  const poet = personById(state, poetId);
  const [, force] = useState(0);
  useEffect(() => {
    const iv = window.setInterval(() => force(x => x + 1), 400);
    return () => window.clearInterval(iv);
  }, []);
  const voted = state.jury.filter(id => state.votes[id] !== undefined);
  const secs = Math.max(0, Math.ceil((state.voteDeadline - Date.now()) / 1000));

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stage-700 px-4 py-3">
        <div className="flex items-center gap-3">
          {poet && <Avatar person={poet} size={38} />}
          <div>
            <div className="font-display text-base font-bold text-stage-50">Голосование · «{poet?.poems?.[state.round - 1]}»</div>
            <div className="text-[11.5px] text-stage-400">организатор видит полные данные{state.cfg.anonymousJury ? ' · для участников анонимно' : ''}</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Chip tone="gold">{voted.length}/{state.jury.length}</Chip>
          <Chip tone={secs <= 5 ? 'live' : 'plain'}>автозакрытие через {secs} c</Chip>
        </div>
      </div>
      <div className="px-4 pt-3">
        <Bar frac={state.jury.length ? voted.length / state.jury.length : 0} />
      </div>
      <ul className="grid gap-1.5 p-4 sm:grid-cols-2">
        {state.jury.map(jid => {
          const j = personById(state, jid);
          const v = state.votes[jid];
          return (
            <li key={jid} className={`flex items-center gap-3 rounded-lg border px-3 py-2 ${v !== undefined ? 'border-stage-700 bg-stage-800/70' : 'border-stage-700/60 bg-stage-850'}`}>
              {j && <Avatar person={j} size={30} />}
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stage-200">{j?.name ?? jid}</span>
              {v !== undefined ? (
                <span className="pop-in grid h-8 w-8 place-items-center rounded-lg bg-gold-500 font-mono text-sm font-bold text-stage-950">{v}</span>
              ) : (
                <span className="flex items-center gap-1.5 text-[11px] text-stage-500">
                  <span className="live-dot h-1.5 w-1.5 rounded-full bg-stage-500" /> ждём
                </span>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap gap-2 border-t border-stage-700 px-4 py-3">
        <Btn variant="live" onClick={() => dispatch({ type: 'CLOSE_VOTING' })}><IconGavel size={15} /> Закрыть голосование</Btn>
        <Btn variant="ghost" onClick={() => dispatch({ type: 'EXTEND_VOTE' })}>Продлить +20 c</Btn>
        <span className="ml-auto self-center text-[11px] text-stage-400">оценка отправляется одним нажатием · шкала 1–7</span>
      </div>
    </Card>
  );
}

function RevealCard({ poetId }: { poetId: string }) {
  const { state } = useSlam();
  const poet = personById(state, poetId);
  const res = state.scores[poetId]?.[state.round - 1];
  if (!poet || !res) return null;
  return (
    <Card className="relative overflow-hidden p-6">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(620px 300px at 70% 0%, rgba(232,163,61,0.16), transparent 70%)' }} />
      <div className="relative grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
        <div>
          <Chip tone="gold">итоговый балл · автоматический расчёт</Chip>
          <div className="mt-2 flex items-center gap-4">
            <Avatar person={poet} size={56} />
            <div>
              <div className="font-display text-lg font-bold text-stage-50">{poet.name}</div>
              <div className="text-sm text-stage-300">«{poet.poems?.[state.round - 1]}»</div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-stage-400">сырые:</span>
              {res.raw.map((v, i) => <span key={i} className="grid h-7 w-7 place-items-center rounded-md border border-stage-600 bg-stage-800 font-mono text-xs text-stage-200">{v}</span>)}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-1 font-mono text-[10.5px] uppercase tracking-[0.16em] text-stage-400">учтены:</span>
              {res.adjusted.map((v, i) => <span key={i} className="grid h-7 w-7 place-items-center rounded-md border border-gold-500/40 bg-gold-500/10 font-mono text-xs text-gold-300">{v}</span>)}
            </div>
            <p className="pt-1 text-[12px] text-stage-400">{res.method}</p>
          </div>
        </div>
        <div className="grid place-items-center">
          <div className="score-reveal text-center">
            <div className="font-display text-7xl font-black text-gold-400">{fmtScore(res.value)}</div>
            <div className="mt-1 font-mono text-[11px] uppercase tracking-[0.24em] text-stage-400">из 7,00</div>
          </div>
        </div>
      </div>
    </Card>
  );
}

function RoundTable() {
  const { state, dispatch } = useSlam();
  const r = state.round;
  const ids = activeIds(state, r);
  const rows = [...ids].sort((a, b) => (state.scores[b]?.[r - 1]?.value ?? 0) - (state.scores[a]?.[r - 1]?.value ?? 0));
  const passed = new Set(state.kept[r] ?? []);
  const isFinal = state.phase === 'final' || state.phase === 'paid';
  const winners = new Set(state.winners);

  return (
    <div className="space-y-5">
      {isFinal && (
        <Card className="relative overflow-hidden p-6 text-center">
          <Confetti count={36} />
          <div className="relative">
            <Chip tone="gold">победитель слэма</Chip>
            <div className="mt-3 flex flex-wrap items-center justify-center gap-4">
              {state.winners.map(w => {
                const p = personById(state, w);
                return p ? (
                  <div key={w} className="flex items-center gap-3">
                    <Avatar person={p} size={64} ring />
                    <div className="text-left">
                      <div className="font-display text-2xl font-bold text-stage-50">{p.name}</div>
                      <div className="font-mono text-sm text-gold-400">{fmtScore(state.scores[w]?.[2]?.value ?? 0)} в финале</div>
                    </div>
                  </div>
                ) : null;
              })}
            </div>
            <div className="mt-4 font-mono text-sm text-stage-300">
              Призовой фонд: <Money value={fund(state)} className="font-display text-2xl font-bold text-gold-400" />
              {state.winners.length > 1 && <span className="ml-2 text-stage-400">· делится поровну ({fmtMoney(Math.floor(fund(state) / state.winners.length))} каждому)</span>}
            </div>
            {state.payout ? (
              <div className="mt-4"><Stamp tone="mint">выплачено · {state.payout === 'auto' ? 'перевод по реквизитам' : 'вручную'}</Stamp></div>
            ) : (
              <div className="mt-5 flex flex-wrap justify-center gap-2">
                <Btn variant="gold" size="lg" onClick={() => dispatch({ type: 'PAYOUT', method: 'auto' })}><IconCoin size={16} /> Перевести по сохранённым реквизитам</Btn>
                <Btn variant="ghost" size="lg" onClick={() => dispatch({ type: 'PAYOUT', method: 'manual' })}>Отметить выплату вручную</Btn>
              </div>
            )}
            {state.phase === 'paid' && (
              <Btn variant="dim" className="mt-4" onClick={() => dispatch({ type: 'RESET' })}>Новый слэм</Btn>
            )}
          </div>
        </Card>
      )}

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stage-700 px-4 py-3">
          <h3 className="font-display text-base font-bold text-stage-50">Таблица тура {r}</h3>
          {!isFinal && (
            <Chip tone="mint">дальше: {passed.size} из {rows.length} · лучшая половина, округление вверх</Chip>
          )}
        </div>
        <ul className="divide-y divide-stage-800">
          {rows.map((id, i) => {
            const p = personById(state, id);
            const sc = state.scores[id]?.[r - 1];
            const ok = isFinal ? winners.has(id) : passed.has(id);
            return (
              <li key={id} className={`fade-up flex items-center gap-3 px-4 py-2.5 ${ok ? '' : 'opacity-60'}`} style={{ animationDelay: `${i * 60}ms` }}>
                <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[11px] font-bold ${
                  i === 0 ? 'bg-gold-500 text-stage-950' : 'bg-stage-800 text-stage-300 border border-stage-600'
                }`}>{i + 1}</span>
                {p && <Avatar person={p} size={34} />}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold text-stage-100">{p?.name}</div>
                  <div className="truncate font-mono text-[10.5px] text-stage-500">{sc?.raw.join(' · ') ?? '—'}</div>
                </div>
                {isFinal ? (
                  winners.has(id) ? <Stamp tone="gold">победитель</Stamp> : <Chip tone="dim">финалист</Chip>
                ) : ok ? <Chip tone="mint"><IconCheck size={11} /> проходит</Chip> : <Chip tone="live">выбывает</Chip>}
                <span className="w-16 text-right font-mono text-lg font-bold tabular-nums text-gold-400">{sc ? fmtScore(sc.value) : '—'}</span>
              </li>
            );
          })}
        </ul>
        {state.phase === 'roundEnd' && (
          <div className="flex flex-wrap items-center gap-3 border-t border-stage-700 px-4 py-3">
            <Btn variant="live" onClick={() => dispatch({ type: 'START_ROUND' })}>
              <IconPlay size={15} /> Начать тур {r + 1} · {state.cfg.durations[r] ?? 60} c
            </Btn>
            <span className="text-[11.5px] text-stage-400">проходят: {rows.filter(x => passed.has(x)).map(x => personById(state, x)?.name.split(' ')[0]).join(', ')}</span>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ================= Фонд ================= */

export function FundTab() {
  const { state, dispatch } = useSlam();
  const fb = fundBreakdown(state);
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('1000');

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(640px 260px at 20% 0%, rgba(232,163,61,0.18), transparent 70%)' }} />
          <div className="relative flex flex-wrap items-end justify-between gap-4">
            <div>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.22em] text-gold-500">Призовой фонд · live</div>
              <Money value={fund(state)} className="mt-1 block font-display text-5xl font-black text-gold-400" />
              <div className="mt-2 flex items-center gap-2 text-[11.5px] text-mint-300">
                <span className="live-dot h-1.5 w-1.5 rounded-full bg-mint-400" />
                обновляется на экранах всех участников при каждом взносе и спонсоре
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                { l: 'Поэты', v: fb.poets }, { l: 'Зрители', v: fb.spectators }, { l: 'Спонсоры', v: fb.sponsors },
              ].map(x => (
                <div key={x.l} className="rounded-lg border border-stage-700 bg-stage-900/70 px-3 py-2 text-center">
                  <div className="font-mono text-[9.5px] uppercase tracking-[0.16em] text-stage-400">{x.l}</div>
                  <div className="font-mono text-sm font-bold text-stage-100">{fmtMoney(x.v)}</div>
                </div>
              ))}
            </div>
          </div>
        </Card>

        <Card className="overflow-hidden">
          <div className="border-b border-stage-700 px-4 py-3">
            <h3 className="font-display text-base font-bold text-stage-50">Спонсорские взносы</h3>
          </div>
          <ul className="divide-y divide-stage-800">
            {state.sponsors.map(sp => (
              <li key={sp.id} className="flex items-center gap-3 px-4 py-2.5">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-mint-500/15 text-mint-300"><IconCoin size={15} /></span>
                <span className="flex-1 text-sm font-semibold text-stage-100">{sp.name}</span>
                <span className="font-mono text-sm font-bold text-mint-300">+{fmtMoney(sp.amount)}</span>
              </li>
            ))}
            {state.sponsors.length === 0 && <li className="px-4 py-6 text-center text-sm text-stage-400">Спонсоров пока нет</li>}
          </ul>
          <div className="flex flex-wrap items-end gap-2 border-t border-stage-700 px-4 py-3">
            <div className="min-w-[160px] flex-1">
              <Field label="Имя спонсора"><TextInput value={name} onChange={e => setName(e.target.value)} placeholder="Кафе «Кляча»" /></Field>
            </div>
            <div className="w-28">
              <Field label="Сумма, ₽"><TextInput type="number" min={0} value={amount} onChange={e => setAmount(e.target.value)} /></Field>
            </div>
            <div className="flex gap-1.5 pb-0.5">
              {[500, 1000, 3000].map(v => (
                <button key={v} onClick={() => setAmount(String(v))} className={`btn-press rounded-md border px-2 py-1 font-mono text-[11px] ${amount === String(v) ? 'border-gold-500/60 text-gold-300' : 'border-stage-600 text-stage-400 hover:text-stage-200'}`}>{v}</button>
              ))}
            </div>
            <Btn
              onClick={() => { dispatch({ type: 'ADD_SPONSOR', name, amount: Math.max(0, Math.round(Number(amount) || 0)) }); setName(''); }}
            >Добавить в фонд</Btn>
          </div>
        </Card>
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <h4 className="font-display text-sm font-bold text-stage-50">Формула фонда</h4>
          <div className="mt-2 space-y-1.5 font-mono text-xs text-stage-300">
            <div className="flex justify-between"><span>поэты × взнос</span><span>{fmtMoney(fb.poets)}</span></div>
            <div className="flex justify-between"><span>зрители × взнос</span><span>{fmtMoney(fb.spectators)}</span></div>
            <div className="flex justify-between"><span>спонсоры</span><span>{fmtMoney(fb.sponsors)}</span></div>
            <div className="flex justify-between border-t border-stage-700 pt-1.5 font-bold text-gold-400"><span>итого</span><Money value={fund(state)} /></div>
          </div>
        </Card>
        <Card className="p-4 text-xs leading-relaxed text-stage-300">
          <span className="font-bold text-gold-300">Выплата:</span> после финала система сама предложит перевести фонд
          победителю по сохранённым реквизитам (через платёжного провайдера) или отметить выплату вручную.
          При ничьей фонд делится поровну между победителями.
        </Card>
      </div>
    </div>
  );
}

/* ================= Итоги и экспорт ================= */

function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\r\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

export function ResultsTab() {
  const { state } = useSlam();

  const exportResults = () => {
    const rows: (string | number)[][] = [['Поэт', 'Тур', 'Стихотворение', 'Оценки', 'Итог', 'Метод']];
    for (let r = 1; r <= state.round; r++) {
      for (const id of activeIds(state, r)) {
        const p = personById(state, id);
        const sc = state.scores[id]?.[r - 1];
        if (!p || !sc) continue;
        rows.push([p.name, r, p.poems?.[r - 1] ?? '', sc.raw.join(' '), sc.value.toFixed(2), sc.method]);
      }
    }
    downloadCSV('mini-slam-results.csv', rows);
  };

  const exportPeople = () => {
    const rows: (string | number)[][] = [['Имя', 'Роль', 'Хочет судить', 'Взнос оплачен', 'Check-in', 'В жюри']];
    for (const p of state.people) {
      rows.push([p.name, p.role === 'poet' ? 'поэт' : 'зритель', p.wantsJudge ? 'да' : 'нет', p.paid ? 'да' : 'нет', p.checkedIn ? 'да' : 'нет', state.jury.includes(p.id) ? 'да' : 'нет']);
    }
    downloadCSV('mini-slam-participants.csv', rows);
  };

  return (
    <div className="space-y-5">
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <h3 className="font-display text-base font-bold text-stage-50">Статистика и экспорт</h3>
          <p className="text-[11.5px] text-stage-400">Все результаты сохраняются и доступны в истории после завершения.</p>
        </div>
        <div className="flex gap-2">
          <Btn variant="ghost" size="sm" onClick={exportResults} disabled={state.round === 0}><IconExport size={14} /> CSV: результаты</Btn>
          <Btn variant="ghost" size="sm" onClick={exportPeople}><IconExport size={14} /> CSV: участники</Btn>
        </div>
      </Card>

      {state.round === 0 ? (
        <Card className="p-10 text-center text-sm text-stage-400">
          Туры ещё не проводились — таблицы появятся после первого выступления.
        </Card>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: state.round }, (_, i) => i + 1).map(r => {
            const ids = [...activeIds(state, r)].sort((a, b) => (state.scores[b]?.[r - 1]?.value ?? 0) - (state.scores[a]?.[r - 1]?.value ?? 0));
            const passed = new Set(state.kept[r] ?? []);
            return (
              <Card key={r} className="overflow-hidden">
                <div className="flex items-center justify-between border-b border-stage-700 px-4 py-2.5">
                  <h4 className="font-display text-sm font-bold text-stage-50">Тур {r} · {state.cfg.durations[r - 1]} c</h4>
                  <Chip tone="plain">{ids.length} выступлений</Chip>
                </div>
                <ul className="divide-y divide-stage-800">
                  {ids.map((id, i) => {
                    const p = personById(state, id);
                    const sc = state.scores[id]?.[r - 1];
                    return (
                      <li key={id} className="flex items-center gap-3 px-4 py-2">
                        <span className="w-5 font-mono text-[11px] text-stage-500">{i + 1}</span>
                        {p && <Avatar person={p} size={28} />}
                        <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-stage-200">{p?.name}</span>
                        {r < 3 && (passed.has(id) ? <Chip tone="mint">дальше</Chip> : <Chip tone="dim">выбыл</Chip>)}
                        <span className="w-14 text-right font-mono text-sm font-bold text-gold-400">{sc ? fmtScore(sc.value) : '—'}</span>
                      </li>
                    );
                  })}
                </ul>
              </Card>
            );
          })}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-stage-700 px-4 py-3">
            <h3 className="font-display text-base font-bold text-stage-50">Общий рейтинг поэтов</h3>
            <Chip tone="gold">все завершённые слэмы</Chip>
          </div>
          <ul className="divide-y divide-stage-800">
            {RATING.map((r, i) => (
              <li key={r.name} className="flex items-center gap-3 px-4 py-2.5">
                <span className={`grid h-7 w-7 place-items-center rounded-full font-mono text-[11px] font-bold ${i === 0 ? 'bg-gold-500 text-stage-950' : i < 3 ? 'bg-stage-700 text-gold-300' : 'bg-stage-800 text-stage-400 border border-stage-700'}`}>{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-semibold text-stage-100">{r.name}</span>
                <span className="hidden font-mono text-[11px] text-stage-400 sm:block">{r.events} слэмов · {r.wins} побед</span>
                <span className={`font-mono text-[11px] font-semibold ${r.delta >= 0 ? 'text-mint-300' : 'text-live-400'}`}>{r.delta >= 0 ? '+' : ''}{r.delta.toFixed(2)}</span>
                <span className="w-14 text-right font-mono text-sm font-bold text-gold-400">{r.avg.toFixed(2)}</span>
              </li>
            ))}
          </ul>
        </Card>
        <Card className="p-4">
          <h4 className="font-display text-sm font-bold text-stage-50">Формула рейтинга</h4>
          <p className="mt-2 text-xs leading-relaxed text-stage-300">
            score = победы × 100 + участия × 20 + средний балл × 10. Рейтинг пересчитывается после каждого
            завершённого слэма; история каждого участника хранится в профиле.
          </p>
          <div className="mt-3 flex items-center gap-2">
            <IconUsers size={16} className="text-gold-500" />
            <span className="text-[11.5px] text-stage-400">экспортируется вместе с результатами</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ================= Архитектура ================= */

function ArchBox({ title, sub, tone = 'plain' }: { title: string; sub?: string; tone?: 'plain' | 'gold' | 'mint' | 'live' }) {
  const t = tone === 'gold' ? 'border-gold-500/50 bg-gold-500/5' : tone === 'mint' ? 'border-mint-500/40 bg-mint-500/5' : tone === 'live' ? 'border-live-500/40 bg-live-500/5' : 'border-stage-600 bg-stage-850';
  return (
    <div className={`rounded-lg border px-3 py-2 text-center ${t}`}>
      <div className="text-[12px] font-bold text-stage-100">{title}</div>
      {sub && <div className="mt-0.5 font-mono text-[9.5px] uppercase tracking-wider text-stage-400">{sub}</div>}
    </div>
  );
}

const Arrow = () => (
  <svg width="22" height="14" viewBox="0 0 22 14" className="shrink-0 text-stage-500" aria-hidden>
    <path d="M1 7h17M14 2.5 19.5 7 14 11.5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export function ArchTab() {
  const { state } = useSlam();
  const dbs: { t: string; cols: string }[] = [
    { t: 'users', cols: 'id · name · role · phone · payout_details · created_at' },
    { t: 'events', cols: 'id · organizer_id · title · cfg jsonb (взносы, туры, жюри) · status' },
    { t: 'registrations', cols: 'event_id · user_id · role · wants_jury · paid · checked_in · qr_token' },
    { t: 'poems', cols: 'registration_id · round 1..3 · title' },
    { t: 'rounds', cols: 'event_id · n · order jsonb · started_at' },
    { t: 'performances', cols: 'round_id · poet_id · started_at · duration_fact' },
    { t: 'votes', cols: 'performance_id · judge_id · value 1..7 · created_at (uniq)' },
    { t: 'payments', cols: 'id · registration_id · amount · provider · status · idempotency_key' },
    { t: 'sponsors', cols: 'event_id · name · amount · created_at' },
    { t: 'results', cols: 'event_id · poet_id · round · raw jsonb · final · place' },
  ];
  const rest = [
    'POST /auth/register · POST /auth/login (JWT + роли)',
    'POST /events · GET /events · GET /events/:id',
    'POST /events/:id/register {role, wants_jury, poems[3]}',
    'POST /payments/checkout → redirect провайдер · webhook',
    'POST /events/:id/checkin {qr_token}',
    'PATCH /events/:id/order {order: id[]}',
    'POST /events/:id/rounds/:n/start · /close-voting',
    'POST /performances/:id/votes {value 1..7}',
    'GET /events/:id/results.csv · GET /me/history',
  ];
  const ws = [
    'round:start · performance:start',
    'performance:timeup (звук на клиентах)',
    'voting:open · vote:cast · voting:close',
    'round:results {table, kept[]}',
    'fund:update {total} — у всех участников',
    'event:finished {winners[]}',
  ];
  return (
    <div className="space-y-5">
      <Reveal>
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="font-mono text-[10.5px] font-semibold uppercase tracking-[0.2em] text-gold-500">production-схема</div>
              <h3 className="font-display text-lg font-bold text-stage-50">Архитектура системы</h3>
            </div>
            <Chip tone="dim">этот прототип эмулирует сервер и socket в браузере</Chip>
          </div>
          <div className="flex flex-col items-stretch gap-2 lg:flex-row lg:items-center">
            <div className="grid flex-1 gap-2">
              <ArchBox title="Flutter · iOS / Android" sub="поэт · зритель · жюри" tone="live" />
              <ArchBox title="React · веб-панель организатора" sub="этот интерфейс" tone="gold" />
              <ArchBox title="Экран проектора (опц.)" sub="сцена для зала" />
            </div>
            <div className="flex justify-center lg:px-1"><Arrow /></div>
            <div className="flex flex-1 flex-col gap-2">
              <ArchBox title="API Gateway · Nginx" sub="TLS · rate-limit" />
              <ArchBox title="NestJS" sub="auth · events · payments · scoring · realtime" tone="gold" />
              <ArchBox title="Socket.io + Redis adapter" sub="pub/sub · задержка < 1 c" tone="mint" />
            </div>
            <div className="flex justify-center lg:px-1"><Arrow /></div>
            <div className="grid flex-1 gap-2">
              <ArchBox title="PostgreSQL" sub="транзакции · история" tone="mint" />
              <ArchBox title="Redis" sub="очереди · presence · кэш" />
              <ArchBox title="S3 / локальное хранилище" sub="фото · тексты стихов" />
              <ArchBox title="ЮKassa / Stripe" sub="взносы · выплаты · webhooks" tone="gold" />
            </div>
          </div>
        </Card>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal delay={60}>
          <Card className="h-full p-5">
            <h3 className="font-display text-base font-bold text-stage-50">REST API</h3>
            <ul className="mt-3 space-y-1.5">
              {rest.map(r => <li key={r} className="rounded-md bg-stage-900/80 px-3 py-1.5 font-mono text-[11.5px] text-stage-300">{r}</li>)}
            </ul>
          </Card>
        </Reveal>
        <Reveal delay={120}>
          <Card className="h-full p-5">
            <h3 className="font-display text-base font-bold text-stage-50">WebSocket-события (комната event:live)</h3>
            <ul className="mt-3 space-y-1.5">
              {ws.map(r => <li key={r} className="rounded-md bg-stage-900/80 px-3 py-1.5 font-mono text-[11.5px] text-stage-300">{r}</li>)}
            </ul>
            <h3 className="mt-5 font-display text-base font-bold text-stage-50">База данных</h3>
            <div className="mt-3 grid gap-1.5">
              {dbs.map(d => (
                <div key={d.t} className="flex flex-wrap items-baseline gap-x-2 rounded-md bg-stage-900/80 px-3 py-1.5">
                  <span className="font-mono text-[11.5px] font-bold text-gold-400">{d.t}</span>
                  <span className="font-mono text-[10.5px] text-stage-400">{d.cols}</span>
                </div>
              ))}
            </div>
          </Card>
        </Reveal>
      </div>

      <Reveal delay={80}>
        <Card className="p-5">
          <h3 className="font-display text-base font-bold text-stage-50">Алгоритм расчёта балла — три ветви</h3>
          <p className="mb-3 mt-1 text-xs text-stage-400">живой пример: сейчас в жюри {state.jury.length} чел., работает ветвь {state.jury.length ? (state.jury.length < 5 ? 1 : state.jury.length <= 6 ? 2 : 3) : '—'}</p>
          <AlgoCards n={state.jury.length || 7} />
        </Card>
      </Reveal>

      <div className="grid gap-5 lg:grid-cols-2">
        <Reveal delay={60}>
          <Card className="h-full p-5">
            <h3 className="font-display text-base font-bold text-stage-50">Рекомендации по стеку</h3>
            <ul className="mt-3 space-y-2.5 text-[12.5px] leading-relaxed text-stage-300">
              <li><b className="text-gold-300">Backend — NestJS (TypeScript).</b> Модули под домены (auth, events, payments, scoring, realtime), guards для ролей, один язык с веб-панелью. Альтернатива — FastAPI, если команда на Python.</li>
              <li><b className="text-gold-300">Мобайл — Flutter + Riverpod + socket_io_client.</b> Одна кодовая база iOS/Android, нативный доступ к камере для QR-сканера (пакет mobile_scanner).</li>
              <li><b className="text-gold-300">Realtime — Socket.io c Redis-адаптером.</b> Масштабирование на несколько инстансов, авто-reconnect, комнаты на мероприятие.</li>
              <li><b className="text-gold-300">Платежи — ЮKassa или Stripe.</b> Webhook с проверкой подписи, идемпотентные ключи, холд и возврат при отмене.</li>
              <li><b className="text-gold-300">QR-билеты —</b> сервер подписывает токен (HMAC), клиент рисует QR (qr_flutter), сканер валидирует токен офлайн-подписью.</li>
            </ul>
          </Card>
        </Reveal>
        <Reveal delay={120}>
          <Card className="h-full p-5">
            <h3 className="font-display text-base font-bold text-stage-50">Офлайн-режим и план MVP</h3>
            <p className="mt-3 text-[12.5px] leading-relaxed text-stage-300">
              <b className="text-gold-300">Офлайн:</b> NestJS-сервер одним бинарником поднимается на ноутбуке организатора
              (SQLite вместо PostgreSQL), телефоны подключаются к LAN по QR с адресом. Все события пишутся в append-only
              журнал; при появлении интернета журнал синхронизируется с облаком (сервер авторитетен, конфликтов нет —
              событие у каждого выступления одно).
            </p>
            <div className="mt-4 grid gap-2">
              {[
                ['Спринт 1', 'Аутентификация, мероприятия, роли, платежи и QR-билеты'],
                ['Спринт 2', 'Check-in, сканер, жеребьёвка порядка, drag-and-drop, жюри'],
                ['Спринт 3', 'Live-туры: таймер, звуковые сигналы, голосование, алгоритм балла'],
                ['Спринт 4', 'Фонд, выплаты, рейтинги, история, CSV-экспорт, офлайн-синхронизация'],
              ].map(([t, d]) => (
                <div key={t} className="flex items-start gap-2.5 rounded-lg border border-stage-700 bg-stage-900/60 px-3 py-2">
                  <span className="mt-0.5 shrink-0 rounded bg-gold-500/15 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-gold-400">{t}</span>
                  <span className="text-[12px] leading-snug text-stage-300">{d}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-2 text-[11px] text-stage-400">
              <IconStar size={14} className="text-gold-500" />
              Требование ТЗ «задержка ≤ 1 c» проверяется нагрузочным тестом socket-комнаты на 300 клиентов.
            </div>
          </Card>
        </Reveal>
      </div>
    </div>
  );
}
