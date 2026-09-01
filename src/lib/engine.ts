/* ============================================================
   «Мини-Слэм» — движок мероприятия (ядро бизнес-логики).
   В продакшене этот модуль живёт на сервере (NestJS / service layer),
   клиенты получают состояние по WebSocket. Здесь — та же логика,
   работающая как локальный «сервер» демо-прототипа.
   ============================================================ */

export interface EventCfg {
  title: string;
  description: string;
  dateLabel: string;
  venue: string;
  poetFee: number;
  spectatorFee: number;
  maxPoets: number | null;
  poetsCanJudge: boolean;
  maxJudges: number | null;
  durations: [number, number, number]; // сек, по умолчанию 15 / 30 / 60
  anonymousJury: boolean;
}

export interface Person {
  id: string;
  name: string;
  role: 'poet' | 'spectator';
  hue: number;
  poems?: [string, string, string];
  paid: boolean;
  checkedIn: boolean;
  wantsJudge: boolean;
}

export interface RoundScore {
  value: number;       // итоговый балл
  method: string;      // ветка алгоритма
  raw: number[];       // исходные оценки
  adjusted: number[];  // массив после сглаживания/отбрасывания
}

export interface Sponsor { id: string; name: string; amount: number; }
export interface FeedMsg { id: number; kind: 'ws' | 'sys' | 'pay'; text: string; }

export type Phase =
  | 'checkin'    // регистрация на входе (сканер QR)
  | 'ordering'   // порядок выступлений сформирован, можно тасовать
  | 'performing' // идёт выступление, таймер
  | 'voting'     // голосование жюри
  | 'reveal'     // показ итогового балла
  | 'roundEnd'   // таблица результатов тура
  | 'final'      // победитель определён
  | 'paid';      // фонд выплачен

export interface SlamState {
  cfg: EventCfg;
  people: Person[];
  jury: string[];                     // активные судьи (id)
  order: string[];                    // порядок поэтов (тур 1)
  round: number;                      // 1..3, 0 — не начат
  idx: number;                        // индекс выступающего в активном списке
  phase: Phase;
  timeLeft: number;
  perfId: number;                     // инкремент на каждое выступление (для эффектов/сокетов)
  votes: Record<string, number>;
  scores: Record<string, RoundScore[]>; // по турам
  kept: Record<number, string[]>;     // тур -> прошедшие дальше
  sponsors: Sponsor[];
  feed: FeedMsg[];
  winners: string[];
  payout: 'auto' | 'manual' | null;
  voteDeadline: number;               // автозакрытие голосования, epoch ms
}

export type Action =
  | { type: 'DEMO_START' }
  | { type: 'SCAN_NEXT' }
  | { type: 'TOGGLE_CHECKIN'; id: string }
  | { type: 'TOGGLE_PAID'; id: string }
  | { type: 'FORM_ORDER' }
  | { type: 'REORDER'; from: number; to: number }
  | { type: 'START_ROUND' }
  | { type: 'TICK'; dt: number }
  | { type: 'VOTE'; judgeId: string; value: number }
  | { type: 'CLOSE_VOTING' }
  | { type: 'EXTEND_VOTE' }
  | { type: 'NEXT' }
  | { type: 'ADD_SPONSOR'; name: string; amount: number }
  | { type: 'TOGGLE_JUROR'; id: string }
  | { type: 'SET_CFG'; patch: Partial<EventCfg> }
  | { type: 'PAYOUT'; method: 'auto' | 'manual' }
  | { type: 'REGISTER'; person: Person }
  | { type: 'PAY'; id: string }
  | { type: 'STOP_PERF' }
  | { type: 'RESET' };

/* ---------------- Алгоритм расчёта балла (ТЗ, п.4) ---------------- */

const avg = (a: number[]) => a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0;
const r2 = (x: number) => Math.round(x * 100) / 100;

export function computeScore(raw: number[]): RoundScore {
  const n = raw.length;
  if (n === 0) return { value: 0, method: 'нет голосов', raw, adjusted: [] };
  if (n < 5) {
    return { value: r2(avg(raw)), method: `среднее арифметическое · n=${n} < 5`, raw, adjusted: [...raw] };
  }
  if (n <= 6) {
    const s = [...raw].sort((a, b) => a - b);
    const adj = [...s];
    adj[0] = s[1];           // минимум → следующее за ним значение
    adj[n - 1] = s[n - 2];   // максимум → предпоследнее значение
    return { value: r2(avg(adj)), method: `сглаживание крайних · 5 ≤ n=${n} ≤ 6`, raw, adjusted: adj };
  }
  const k = Math.floor(n / 7);
  const s = [...raw].sort((a, b) => a - b);
  const adj = s.slice(k, n - k);
  return { value: r2(avg(adj)), method: `отброшено ${k} мин. и ${k} макс. · n=${n} > 6`, raw, adjusted: adj };
}

export function algoBranch(n: number): 1 | 2 | 3 {
  if (n < 5) return 1;
  if (n <= 6) return 2;
  return 3;
}

/* ---------------- Селекторы ---------------- */

export const poetsOf = (s: SlamState) => s.people.filter(p => p.role === 'poet');
export const activeIds = (s: SlamState, round: number): string[] =>
  round <= 1 ? s.order : s.kept[round - 1] ?? [];
export const currentPoet = (s: SlamState): Person | null => {
  const ids = activeIds(s, s.round);
  const id = ids[s.idx];
  return s.people.find(p => p.id === id) ?? null;
};
export const fund = (s: SlamState) =>
  s.people.filter(p => p.paid).reduce((sum, p) => sum + (p.role === 'poet' ? s.cfg.poetFee : s.cfg.spectatorFee), 0)
  + s.sponsors.reduce((sum, sp) => sum + sp.amount, 0);
export const fundBreakdown = (s: SlamState) => ({
  poets: s.people.filter(p => p.paid && p.role === 'poet').length * s.cfg.poetFee,
  spectators: s.people.filter(p => p.paid && p.role === 'spectator').length * s.cfg.spectatorFee,
  sponsors: s.sponsors.reduce((sum, sp) => sum + sp.amount, 0),
});
export const juryPool = (s: SlamState) =>
  s.people.filter(p =>
    p.wantsJudge && p.checkedIn && (p.role === 'spectator' || s.cfg.poetsCanJudge));
export const personById = (s: SlamState, id: string) => s.people.find(p => p.id === id);

export const PHASE_LABEL: Record<Phase, string> = {
  checkin: 'Регистрация на входе',
  ordering: 'Порядок выступлений',
  performing: 'Идёт выступление',
  voting: 'Голосование жюри',
  reveal: 'Итоговый балл',
  roundEnd: 'Результаты тура',
  final: 'Победитель!',
  paid: 'Слэм завершён',
};

/* ---------------- Утилиты ---------------- */

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

let feedSeq = 100;
const msg = (kind: FeedMsg['kind'], text: string): FeedMsg => ({ id: ++feedSeq, kind, text });
const pushFeed = (feed: FeedMsg[], m: FeedMsg) => [...feed.slice(-40), m];

/* ---------------- Демо-данные ---------------- */

export const DEMO_CFG: EventCfg = {
  title: 'Мини-Слэм #12 «Тёплый ламповый»',
  description: 'Три тура — 15, 30 и 60 секунд. Жюри оценивает по 7-балльной шкале. Победитель забирает весь фонд.',
  dateLabel: 'Сегодня · 19:30',
  venue: 'Бар «Кляча», ул. Рубинштейна, 7',
  poetFee: 500,
  spectatorFee: 200,
  maxPoets: 10,
  poetsCanJudge: false,
  maxJudges: null,
  durations: [15, 30, 60],
  anonymousJury: false,
};

const poet = (id: string, name: string, hue: number, poems: [string, string, string], paid = true): Person =>
  ({ id, name, role: 'poet', hue, poems, paid, checkedIn: false, wantsJudge: false });
const spec = (id: string, name: string, hue: number, wantsJudge: boolean, paid = true): Person =>
  ({ id, name, role: 'spectator', hue, paid, checkedIn: false, wantsJudge });

export function makeDemoPeople(): Person[] {
  return [
    poet('p1', 'Артём Груздев', 28, ['Троллейбус №7', 'Письмо К.', 'Бессонница']),
    poet('p2', 'Вера Светлова', 42, ['Мел', 'Северный вокзал', 'Ария']),
    poet('p3', 'Даниил Кротов', 16, ['Голуби Достоевского', 'Панельное небо', 'Соль']),
    poet('p4', 'Лиза Мятная', 96, ['Чертополох', 'Август-3000', 'Кафе «Волна»']),
    poet('p5', 'Марк Ильин', 204, ['Лифт', 'Рефрен', 'Кассета']),
    poet('p6', 'Соня Крылова', 330, ['Мотыльки', 'Полшага', 'Гипс']),
    poet('p7', 'Тимур Валеев', 60, ['Корица', 'Трамвайное депо', 'Эхо']),
    poet('p8', 'Полина Штерн', 262, ['Тише воды', 'Самолёт в январе', 'Мёд']),
    spec('j1', 'Марина Царёва', 350, true),
    spec('j2', 'Игорь Полонский', 210, true),
    spec('j3', 'Даша Ветрова', 26, true),
    spec('j4', 'Лев Барсуков', 130, true),
    spec('j5', 'Аня Ремизова', 48, true),
    spec('j6', 'Гриша Штиль', 182, true),
    spec('j7', 'Кира Ноль', 300, true),
    spec('s1', 'Олег Дымов', 80, false),
    spec('s2', 'Настя Клюева', 275, false),
    spec('s3', 'Пётр Галкин', 15, false, false), // взнос не оплачен
    spec('you', 'Вы (гость)', 44, true),
  ];
}

export function initialState(): SlamState {
  return {
    cfg: { ...DEMO_CFG },
    people: makeDemoPeople(),
    jury: [],
    order: [],
    round: 0,
    idx: 0,
    phase: 'checkin',
    timeLeft: DEMO_CFG.durations[0],
    perfId: 0,
    votes: {},
    scores: {},
    kept: {},
    sponsors: [{ id: 'sp1', name: 'Кафе «Кляча»', amount: 3000 }],
    feed: [
      msg('sys', 'Мероприятие создано организатором'),
      msg('pay', 'Спонсор «Кафе «Кляча»» внёс 3 000 ₽'),
      msg('ws', 'Канал event:live открыт, ожидается check-in'),
    ],
    winners: [],
    payout: null,
    voteDeadline: 0,
  };
}

/* ---------------- Редьюсер ---------------- */

function selectJury(s: SlamState): string[] {
  const pool = s.people.filter(p =>
    p.wantsJudge && p.checkedIn && (p.role === 'spectator' || s.cfg.poetsCanJudge));
  const cap = s.cfg.maxJudges ?? pool.length;
  return pool.slice(0, cap).map(p => p.id);
}

export function reducer(s: SlamState, a: Action): SlamState {
  switch (a.type) {
    case 'DEMO_START': {
      const people = s.people.map(p => (p.paid ? { ...p, checkedIn: true } : p));
      const next: SlamState = { ...s, people, feed: pushFeed(s.feed, msg('sys', 'Демо-режим: все участники отмечены на входе')) };
      return finishCheckin(next);
    }

    case 'SCAN_NEXT': {
      const target = s.people.find(p => p.paid && !p.checkedIn && p.role === 'poet')
        ?? s.people.find(p => p.paid && !p.checkedIn);
      if (!target) return { ...s, feed: pushFeed(s.feed, msg('ws', 'Сканер: все оплаченные билеты отмечены')) };
      return {
        ...s,
        people: s.people.map(p => p.id === target.id ? { ...p, checkedIn: true } : p),
        feed: pushFeed(s.feed, msg('ws', `QR принят: ${target.name} (${target.role === 'poet' ? 'поэт' : 'зритель'})`)),
      };
    }

    case 'TOGGLE_CHECKIN': {
      const t = s.people.find(p => p.id === a.id);
      if (!t || !t.paid) return s;
      return {
        ...s,
        people: s.people.map(p => p.id === a.id ? { ...p, checkedIn: !p.checkedIn } : p),
        feed: pushFeed(s.feed, msg('sys', `${t.name}: ${t.checkedIn ? 'отменён чек-ин' : 'отмечен вручную'}`)),
      };
    }

    case 'TOGGLE_PAID': {
      const t = s.people.find(p => p.id === a.id);
      if (!t) return s;
      const paid = !t.paid;
      return {
        ...s,
        people: s.people.map(p => p.id === a.id ? { ...p, paid, checkedIn: paid ? p.checkedIn : false } : p),
        feed: pushFeed(s.feed, msg('pay', `${t.name}: взнос ${paid ? 'подтверждён' : 'отменён'} (${t.role === 'poet' ? s.cfg.poetFee : s.cfg.spectatorFee} ₽)`)),
      };
    }

    case 'FORM_ORDER':
      return finishCheckin({ ...s, feed: pushFeed(s.feed, msg('sys', 'Порядок выступлений пересформирован случайно')) });

    case 'REORDER': {
      if (s.phase !== 'ordering') return s;
      const order = [...s.order];
      const [moved] = order.splice(a.from, 1);
      order.splice(a.to, 0, moved);
      return { ...s, order, feed: pushFeed(s.feed, msg('sys', `Порядок изменён: ${personById(s, moved)?.name ?? ''} → позиция ${a.to + 1}`)) };
    }

    case 'START_ROUND': {
      if (s.phase !== 'ordering' && s.phase !== 'roundEnd') return s;
      const round = s.phase === 'ordering' ? 1 : s.round + 1;
      return {
        ...s, round, idx: 0, votes: {}, perfId: s.perfId + 1,
        timeLeft: s.cfg.durations[round - 1] ?? 60,
        phase: 'performing',
        feed: pushFeed(s.feed, msg('ws', `🔔 Тур ${round} (${s.cfg.durations[round - 1]} c): на сцене ${personById(s, activeIds({ ...s, round }, round)[0])?.name ?? ''}`)),
      };
    }

    case 'TICK': {
      if (s.phase !== 'performing') return s;
      const t = Math.max(0, s.timeLeft - a.dt);
      if (t === 0) {
        const poet = currentPoet(s);
        return {
          ...s, timeLeft: 0, phase: 'voting', perfId: s.perfId + 1,
          voteDeadline: Date.now() + 18000,
          feed: pushFeed(s.feed, msg('ws', `⏱ Время вышло! «${poet?.poems?.[s.round - 1] ?? ''}» завершено — жюри голосует`)),
        };
      }
      return { ...s, timeLeft: t };
    }

    case 'VOTE': {
      if (s.phase !== 'voting' || s.votes[a.judgeId] !== undefined) return s;
      if (!s.jury.includes(a.judgeId)) return s;
      const j = personById(s, a.judgeId);
      return {
        ...s,
        votes: { ...s.votes, [a.judgeId]: a.value },
        feed: pushFeed(s.feed, msg('ws', `Оценка: ${j?.name ?? a.judgeId} → ${a.value}`)),
      };
    }

    case 'EXTEND_VOTE':
      if (s.phase !== 'voting') return s;
      return { ...s, voteDeadline: Date.now() + 20000, feed: pushFeed(s.feed, msg('sys', 'Голосование продлено организатором (+20 c)')) };

    case 'CLOSE_VOTING': {
      if (s.phase !== 'voting') return s;
      const poet = currentPoet(s);
      if (!poet) return s;
      const raw = s.jury.filter(id => s.votes[id] !== undefined).map(id => s.votes[id]);
      const res = computeScore(raw);
      const scores = { ...s.scores, [poet.id]: [...(s.scores[poet.id] ?? []), res] };
      return {
        ...s, scores, phase: 'reveal',
        feed: pushFeed(s.feed, msg('ws', `Итог «${poet.poems?.[s.round - 1] ?? ''}»: ${res.value.toFixed(2)} (${res.method})`)),
      };
    }

    case 'NEXT': {
      if (s.phase !== 'reveal') return s;
      const ids = activeIds(s, s.round);
      if (s.idx + 1 < ids.length) {
        const nextId = ids[s.idx + 1];
        return {
          ...s, idx: s.idx + 1, votes: {}, perfId: s.perfId + 1,
          timeLeft: s.cfg.durations[s.round - 1] ?? 60, phase: 'performing',
          feed: pushFeed(s.feed, msg('ws', `На сцене: ${personById(s, nextId)?.name ?? ''} — «${personById(s, nextId)?.poems?.[s.round - 1] ?? ''}»`)),
        };
      }
      // тур завершён — сортировка и отбор лучшей половины (округление вверх)
      const ranked = [...ids].sort((x, y) =>
        (s.scores[y]?.[s.round - 1]?.value ?? 0) - (s.scores[x]?.[s.round - 1]?.value ?? 0));
      const kept: SlamState['kept'] = { ...s.kept };
      let winners = s.winners;
      let phase: Phase;
      let feedText: string;
      if (s.round >= 3) {
        const top = s.scores[ranked[0]]?.[2]?.value ?? 0;
        winners = ranked.filter(id => (s.scores[id]?.[2]?.value ?? 0) === top);
        kept[3] = winners;
        phase = 'final';
        feedText = winners.length > 1
          ? `🏆 Ничья! Победители: ${winners.map(w => personById(s, w)?.name).join(', ')}`
          : `🏆 Победитель слэма: ${personById(s, winners[0])?.name ?? ''}`;
      } else {
        kept[s.round] = ranked.slice(0, Math.ceil(ranked.length / 2));
        phase = 'roundEnd';
        feedText = `Тур ${s.round} завершён: дальше проходят ${kept[s.round].length} из ${ranked.length}`;
      }
      return { ...s, kept, winners, phase, feed: pushFeed(s.feed, msg('sys', feedText)) };
    }

    case 'ADD_SPONSOR': {
      const sp: Sponsor = { id: `sp${Date.now()}`, name: a.name.trim() || 'Анонимный спонсор', amount: Math.max(0, Math.round(a.amount)) };
      if (sp.amount === 0) return s;
      return {
        ...s,
        sponsors: [...s.sponsors, sp],
        feed: pushFeed(s.feed, msg('pay', `Спонсор «${sp.name}» добавил ${sp.amount.toLocaleString('ru-RU')} ₽ — фонд обновлён у всех участников`)),
      };
    }

    case 'TOGGLE_JUROR': {
      if (s.phase === 'voting') return s; // состав суда не меняется во время голосования
      const inJury = s.jury.includes(a.id);
      if (inJury) {
        return { ...s, jury: s.jury.filter(id => id !== a.id), feed: pushFeed(s.feed, msg('sys', `${personById(s, a.id)?.name ?? ''} выведен(а) из жюри`)) };
      }
      const p = s.people.find(x => x.id === a.id);
      if (!p || !p.checkedIn || !p.wantsJudge) return s;
      if (p.role === 'poet' && !s.cfg.poetsCanJudge) return s;
      const cap = s.cfg.maxJudges ?? 99;
      if (s.jury.length >= cap) return { ...s, feed: pushFeed(s.feed, msg('sys', `Достигнут лимит судей (${cap})`)) };
      return { ...s, jury: [...s.jury, a.id], feed: pushFeed(s.feed, msg('sys', `${p.name} включён(а) в жюри`)) };
    }

    case 'SET_CFG': {
      if (a.patch.anonymousJury !== undefined && s.phase === 'voting') {
        return { ...s, feed: pushFeed(s.feed, msg('sys', 'Анонимность жюри нельзя менять во время голосования')) };
      }
      return { ...s, cfg: { ...s.cfg, ...a.patch }, feed: pushFeed(s.feed, msg('sys', 'Настройки мероприятия обновлены')) };
    }

    case 'REGISTER': {
      if (a.person.role === 'poet' && s.cfg.maxPoets) {
        const poets = s.people.filter(p => p.role === 'poet').length;
        if (poets >= s.cfg.maxPoets) {
          return { ...s, feed: pushFeed(s.feed, msg('sys', `Регистрация отклонена: лимит поэтов (${s.cfg.maxPoets}) исчерпан`)) };
        }
      }
      return {
        ...s, people: [...s.people, a.person],
        feed: pushFeed(s.feed, msg('ws', `Новая регистрация: ${a.person.name} (${a.person.role === 'poet' ? 'поэт' : 'зритель'})`)),
      };
    }

    case 'PAY': {
      const t = s.people.find(p => p.id === a.id);
      if (!t || t.paid) return s;
      const fee = t.role === 'poet' ? s.cfg.poetFee : s.cfg.spectatorFee;
      return {
        ...s, people: s.people.map(p => p.id === a.id ? { ...p, paid: true } : p),
        feed: pushFeed(s.feed, msg('pay', `${t.name}: взнос ${fee} ₽ оплачен через эквайринг, QR-билет выдан`)),
      };
    }

    case 'STOP_PERF': {
      if (s.phase !== 'performing') return s;
      const poet = currentPoet(s);
      return {
        ...s, timeLeft: 0, phase: 'voting', perfId: s.perfId + 1, voteDeadline: Date.now() + 18000,
        feed: pushFeed(s.feed, msg('sys', `Организатор остановил таймер: «${poet?.poems?.[s.round - 1] ?? ''}» — жюри голосует`)),
      };
    }

    case 'PAYOUT': {
      if (s.phase !== 'final' && s.phase !== 'paid') return s;
      return {
        ...s, phase: 'paid', payout: a.method,
        feed: pushFeed(s.feed, msg('pay', a.method === 'auto'
          ? `💸 Фонд ${fund(s).toLocaleString('ru-RU')} ₽ переведён победителю через сохранённые реквизиты`
          : `💸 Выплата отмечена организатором вручную (${fund(s).toLocaleString('ru-RU')} ₽)`)),
      };
    }

    case 'RESET':
      return { ...initialState(), feed: [msg('sys', 'Новая сессия: состояние сброшено')] };

    default:
      return s;
  }
}

/** Завершение check-in: случайный порядок поэтов + автонабор жюри. */
function finishCheckin(s: SlamState): SlamState {
  const checkedPoets = s.people.filter(p => p.role === 'poet' && p.checkedIn);
  if (checkedPoets.length < 2) return s;
  const order = shuffle(checkedPoets.map(p => p.id));
  const jury = selectJury(s);
  return {
    ...s, order, jury, round: 0, idx: 0, phase: 'ordering', scores: {}, kept: {}, winners: [], payout: null, votes: {},
    feed: pushFeed(s.feed, msg('sys', `Случайный порядок из ${order.length} поэтов сформирован · жюри: ${jury.length} чел.`)),
  };
}

/* ---------------- Прочее ---------------- */

/** Детерминированный «QR-код» для демо (визуальный). */
export function qrMatrix(seed: string, size = 21): boolean[][] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) / 4294967296); };
  const m: boolean[][] = Array.from({ length: size }, () => Array(size).fill(false));
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) m[y][x] = rnd() > 0.5;
  const finder = (ox: number, oy: number) => {
    for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
      const border = x === 0 || y === 0 || x === 6 || y === 6;
      const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
      m[oy + y][ox + x] = border || core;
    }
    for (let i = -1; i < 8; i++) {
      const gx = ox + i, gy = oy + i;
      if (m[oy - 1]?.[gx] !== undefined) m[oy - 1][gx] = false;
      if (m[oy + 7]?.[gx] !== undefined) m[oy + 7][gx] = false;
      if (m[gy]?.[ox - 1] !== undefined) m[gy][ox - 1] = false;
      if (m[gy]?.[ox + 7] !== undefined) m[gy][ox + 7] = false;
    }
  };
  finder(0, 0); finder(size - 7, 0); finder(0, size - 7);
  return m;
}

/** История для рейтинга (завершённые слэмы). */
export const HISTORY = [
  { event: 'Мини-Слэм #11 «Сквозняк»', place: '2 место', score: 6.42, poems: ['Гаражи', 'Февральская', 'Голос'] },
  { event: 'Мини-Слэм #10 «Оттепель»', place: '1 место', score: 6.71, poems: ['Капель', 'Последний снег', 'Вслух'] },
  { event: 'Мини-Слэм #8 «Черновик»', place: '4 место', score: 5.83, poems: ['Помарка', 'Рядом', 'Точка'] },
];

export const RATING = [
  { name: 'Вера Светлова', events: 9, wins: 3, avg: 6.48, delta: +0.12 },
  { name: 'Артём Груздев', events: 11, wins: 2, avg: 6.31, delta: +0.05 },
  { name: 'Полина Штерн', events: 6, wins: 2, avg: 6.19, delta: +0.21 },
  { name: 'Тимур Валеев', events: 8, wins: 1, avg: 5.97, delta: -0.04 },
  { name: 'Лиза Мятная', events: 5, wins: 1, avg: 5.90, delta: +0.15 },
  { name: 'Даниил Кротов', events: 7, wins: 0, avg: 5.62, delta: -0.08 },
  { name: 'Соня Крылова', events: 4, wins: 0, avg: 5.44, delta: +0.02 },
  { name: 'Марк Ильин', events: 3, wins: 0, avg: 5.12, delta: -0.11 },
];
