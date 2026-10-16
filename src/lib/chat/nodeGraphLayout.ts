/* ============================================================
 * Aidee STEP 2 — 커스터마이징 노드 그래프 배치
 * 프롬프트 SECTION_4_2_STEP_2 의 [5] 오른쪽 노드 그래프를 그대로 구현한 모듈.
 *
 * 좌표계는 401 x 515 고정. 화면에 그릴 때 크기가 다르면
 * 컨테이너 전체를 같은 비율로 확대·축소해서 쓴다.
 * 원 지름과 붙이는 거리는 이 좌표계 기준 값이므로 개별로 조정하지 않는다.
 * ============================================================ */

export const GRAPH_W = 401;
export const GRAPH_H = 515;
export const CENTER_D = 138;

const CX = GRAPH_W / 2;
const CY = GRAPH_H / 2;
const CAT_DIST = 95;    // 중앙 원 중심 → 카테고리 원 중심
const TEXT = 0.7;       // 원의 안쪽 70%를 글자 영역으로 본다
const INSIDE = 0.7;     // 경계를 넘을 때 영역 안에 남아야 하는 면적 비율
const CENTER_GAP = 6;   // 중앙 원과의 최소 간격

/** 키워드 원 지름. 선택한 시점에 하나를 가져가고, 해제될 때까지 유지한다. */
const SIZES = [54, 72, 60, 78, 54, 66, 48, 70, 54, 62, 74, 52, 68, 58];

export type SectionKey = 'region' | 'field' | 'skill' | 'job';

export interface SectionDef {
  key: SectionKey;
  title: string;
  /** 카테고리 원 지름 */
  d: number;
  /** 사분면 방향 [x, y] — 음수는 왼쪽/위 */
  dir: [number, number];
}

/** 사분면: 좌측 상단 활동 영역, 우측 상단 보유 기술, 좌측 하단 전문 분야, 우측 하단 전문 직업 */
export const SECTIONS: SectionDef[] = [
  { key: 'region', title: '활동 영역', d: 106, dir: [-1, -1] },
  { key: 'field', title: '전문 분야', d: 82, dir: [-1, 1] },
  { key: 'skill', title: '보유 기술', d: 85, dir: [1, -1] },
  { key: 'job', title: '전문 직업', d: 106, dir: [1, 1] },
];

export interface Circle {
  x: number;
  y: number;
  d: number;
  /** 붙은 방향. ③ 18도 규칙에서 쓴다. */
  ang: number;
}

export interface KeywordCircle extends Circle {
  label: string;
  /** 가져간 지름 값의 인덱스. 해제되면 비고, 다음에 새로 선택하는 키워드가 이어받는다. */
  slot: number;
}

/** 배열 순서 = 그 카테고리에서 선택한 순서. null = 자리를 못 찾아 배치되지 않은 키워드. */
export type GraphState = Record<SectionKey, (KeywordCircle | null)[]>;

/** 카테고리별로 선택된 키워드 목록 */
export type Selection = Record<SectionKey, string[]>;

export function createState(): GraphState {
  return { region: [], field: [], skill: [], job: [] };
}

/** 카테고리 원의 중심 좌표 */
export function catCenter(sec: SectionDef): { x: number; y: number } {
  const n = Math.hypot(sec.dir[0], sec.dir[1]);
  return { x: CX + (sec.dir[0] / n) * CAT_DIST, y: CY + (sec.dir[1] / n) * CAT_DIST };
}

const catCircle = (sec: SectionDef): Circle => ({ ...catCenter(sec), d: sec.d, ang: 0 });
const catCircles = (): Circle[] => SECTIONS.map(catCircle);

/** 활동 영역만 3개, 나머지는 4개가 카테고리 원에 직접 부착된다 */
const firstCount = (sec: SectionDef) => (sec.key === 'region' ? 3 : 4);

/** 서로 상대의 글자 영역을 덮지 않는 최소 중심거리 */
function attach(d1: number, d2: number): number {
  const r1 = d1 / 2;
  const r2 = d2 / 2;
  return Math.max(r1 + TEXT * r2, r2 + TEXT * r1);
}

/** 원이 그래프 영역 안에 남는 면적 비율 */
function insideRatio(x: number, y: number, d: number, n = 12): number {
  const r = d / 2;
  let tot = 0;
  let inn = 0;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const px = x - r + ((i + 0.5) * 2 * r) / n;
      const py = y - r + ((j + 0.5) * 2 * r) / n;
      if ((px - x) ** 2 + (py - y) ** 2 <= r * r) {
        tot++;
        if (px >= 0 && px <= GRAPH_W && py >= 0 && py <= GRAPH_H) inn++;
      }
    }
  }
  return tot === 0 ? 0 : inn / tot;
}

const quadBox = (dir: [number, number]) => ({
  x0: dir[0] < 0 ? 0 : CX,
  x1: dir[0] < 0 ? CX : GRAPH_W,
  y0: dir[1] < 0 ? 0 : CY,
  y1: dir[1] < 0 ? CY : GRAPH_H,
});

/** A: 원 전체가 자기 사분면 안 */
function inQuad(x: number, y: number, d: number, dir: [number, number]): boolean {
  const r = d / 2;
  const q = quadBox(dir);
  return x - r >= q.x0 && x + r <= q.x1 && y - r >= q.y0 && y + r <= q.y1;
}

/** B: 원이 가로·세로 중앙선을 넘지 않음 */
function noDivider(x: number, y: number, d: number, dir: [number, number]): boolean {
  const r = d / 2;
  return (dir[0] > 0 ? x - r >= CX : x + r <= CX) && (dir[1] > 0 ? y - r >= CY : y + r <= CY);
}

/** C: 원 중심이 자기 사분면 안 */
const centerInQuad = (x: number, y: number, dir: [number, number]): boolean =>
  (dir[0] > 0 ? x >= CX : x <= CX) && (dir[1] > 0 ? y >= CY : y <= CY);

/**
 * 겹침 검사. 그래프 안의 모든 원(카테고리 원 4개 + 이미 놓인 모든 키워드 원)을
 * 대상으로 하며, 다른 사분면의 원도 포함한다.
 */
function noCollide(x: number, y: number, d: number, all: Circle[], skip: Circle[] = []): boolean {
  for (const c of all) {
    if (skip.indexOf(c) !== -1) continue;
    if (Math.hypot(x - c.x, y - c.y) < attach(d, c.d) - 0.6) return false;
  }
  return Math.hypot(x - CX, y - CY) >= (CENTER_D + d) / 2 + CENTER_GAP;
}

/** 허용 범위 A → B → C → D */
type RangeTest = (x: number, y: number, d: number, dir: [number, number]) => boolean;

const TESTS: RangeTest[] = [
  (x, y, d, dir) => inQuad(x, y, d, dir),
  (x, y, d, dir) => noDivider(x, y, d, dir) && insideRatio(x, y, d) >= INSIDE,
  (x, y, d, dir) => centerInQuad(x, y, dir) && insideRatio(x, y, d) >= INSIDE,
  (x, y, d) => insideRatio(x, y, d) >= INSIDE,
];

/** 두 원에 동시에 닿는 자리 (끼움 자리) */
function tangentPoints(c1: Circle, c2: Circle, d: number): { x: number; y: number }[] {
  const r1 = attach(d, c1.d);
  const r2 = attach(d, c2.d);
  const dx = c2.x - c1.x;
  const dy = c2.y - c1.y;
  const D = Math.hypot(dx, dy);
  if (D === 0 || D > r1 + r2 || D < Math.abs(r1 - r2)) return [];
  const a = (r1 * r1 - r2 * r2 + D * D) / (2 * D);
  const h2 = r1 * r1 - a * a;
  if (h2 < 0) return [];
  const h = Math.sqrt(h2);
  const mx = c1.x + (a * dx) / D;
  const my = c1.y + (a * dy) / D;
  return [
    { x: mx + (h * dy) / D, y: my - (h * dx) / D },
    { x: mx - (h * dy) / D, y: my + (h * dx) / D },
  ];
}

/** 카테고리 원에 직접 부착. A단계(사분면 안)만 허용한다. */
function directSpot(
  i: number,
  d: number,
  sec: SectionDef,
  cat: Circle,
  all: Circle[],
): Circle | null {
  const dir = sec.dir;
  const base = Math.atan2(dir[1], dir[0]);
  const angs = firstCount(sec) === 3 ? [-45, 0, 45] : [-60, -20, 20, 60];
  const r = attach(d, sec.d);
  for (let e = 0; e < 60; e++) {
    for (const s of [1, -1]) {
      const a = base + ((angs[i] + s * e * 3) * Math.PI) / 180;
      const x = cat.x + Math.cos(a) * r;
      const y = cat.y + Math.sin(a) * r;
      if (noCollide(x, y, d, all, [cat]) && inQuad(x, y, d, dir)) return { x, y, d, ang: a };
    }
  }
  return null;
}

interface SpotOptions {
  /** 지금 자리. 여기서 maxMove 이내의 자리만 후보로 본다. */
  from?: Circle;
  maxMove?: number;
  /** 카테고리 원 중심까지 거리가 이 값 이하인 자리만 후보로 본다. */
  maxDist?: number;
}

/**
 * ① 끼움 자리 → ② 카테고리 중심에서 가까운 후보 → ③ 18도 → ④ 4도 → ⑤ 사분면 안 빈 자리.
 * 이 순서를 허용 범위 A~D 순으로 적용하고, 앞 단계에서 찾으면 뒤 단계로 넘어가지 않는다.
 */
function findSpot(
  d: number,
  cat: Circle,
  dir: [number, number],
  mine: Circle[],
  all: Circle[],
  opt: SpotOptions = {},
): Circle | null {
  const okMove = (x: number, y: number) =>
    (!opt.from || opt.maxMove === undefined ||
      Math.hypot(x - opt.from.x, y - opt.from.y) <= opt.maxMove) &&
    (opt.maxDist === undefined || Math.hypot(x - cat.x, y - cat.y) <= opt.maxDist);

  for (const test of TESTS) {
    let best: { sc: number; x: number; y: number; d: number; ang: number } | null = null;
    const take = (x: number, y: number, ang: number) => {
      const sc = Math.hypot(x - cat.x, y - cat.y);
      if (!best || sc < best.sc) best = { sc, x, y, d, ang };
    };

    // ① 끼움 자리 → ② 카테고리 중심에서 가장 가까운 후보
    const pool = mine.concat([cat]);
    for (let p = 0; p < pool.length; p++) {
      for (let q = p + 1; q < pool.length; q++) {
        for (const pt of tangentPoints(pool[p], pool[q], d)) {
          if (
            okMove(pt.x, pt.y) &&
            noCollide(pt.x, pt.y, d, all, [pool[p], pool[q]]) &&
            test(pt.x, pt.y, d, dir)
          ) {
            take(pt.x, pt.y, Math.atan2(pt.y - cat.y, pt.x - cat.x));
          }
        }
      }
    }

    // ③ 앞 원에 18도씩 → ④ 4도씩 추가 회전, 붙을 상대 변경
    if (!best) {
      const order = mine
        .slice()
        .sort(
          (m, n) => Math.hypot(m.x - cat.x, m.y - cat.y) - Math.hypot(n.x - cat.x, n.y - cat.y),
        );
      for (const pv of order) {
        for (let e = 0; e < 60 && !best; e++) {
          for (const sg of [1, -1]) {
            const ang = pv.ang + (sg * (18 + e * 4) * Math.PI) / 180;
            const r = attach(d, pv.d);
            const x = pv.x + Math.cos(ang) * r;
            const y = pv.y + Math.sin(ang) * r;
            if (okMove(x, y) && noCollide(x, y, d, all, [pv]) && test(x, y, d, dir)) {
              take(x, y, ang);
              break;
            }
          }
        }
        if (best) break;
      }
    }

    // ⑤ 사분면 안의 빈 자리
    if (!best) {
      const q = quadBox(dir);
      for (let y = q.y0 - d; y <= q.y1 + d; y += 4) {
        for (let x = q.x0 - d; x <= q.x1 + d; x += 4) {
          if (okMove(x, y) && noCollide(x, y, d, all) && test(x, y, d, dir)) {
            take(x, y, Math.atan2(y - cat.y, x - cat.x));
          }
        }
      }
    }

    if (best) return best;
  }
  return null;
}

const placedOf = (state: GraphState, key: SectionKey): KeywordCircle[] =>
  (state[key] || []).filter((n): n is KeywordCircle => n !== null);

/**
 * 전체 배치. 팝업을 열어 기존 선택을 한 번에 그릴 때만 쓴다.
 * 이때는 직접 부착 자리에 A단계 공간이 없으면 그 키워드를 순서 맨 뒤로 미룬다.
 */
export function layoutAll(sel: Selection): GraphState {
  const cats = catCircles();
  const all: Circle[] = cats.slice();
  const out = createState();

  SECTIONS.forEach((sec, si) => {
    const words = sel[sec.key] || [];
    if (!words.length) return;
    const cat = cats[si];
    const dir = sec.dir;
    const first = firstCount(sec);
    const mine: Circle[] = [];
    const place: Record<number, Circle> = {};
    const deferred: number[] = [];

    for (let i = 0; i < Math.min(first, words.length); i++) {
      const d = SIZES[i % SIZES.length];
      const hit = directSpot(i, d, sec, cat, all);
      if (hit) {
        mine.push(hit);
        all.push(hit);
        place[i] = hit;
      } else {
        deferred.push(i);
      }
    }

    const queue: number[] = [];
    for (let i = first; i < words.length; i++) queue.push(i);
    deferred.forEach((i) => queue.push(i));

    queue.forEach((i) => {
      const d = SIZES[i % SIZES.length];
      const best = findSpot(d, cat, dir, mine, all);
      if (!best) return;
      mine.push(best);
      all.push(best);
      place[i] = best;
    });

    out[sec.key] = words.map((w, i) =>
      place[i] ? { label: w, slot: i, ...place[i] } : null,
    );
  });

  return out;
}

/**
 * 키워드를 새로 선택했을 때. 이미 배치된 원의 위치는 바꾸지 않고 새 원 하나만 놓는다.
 * 기존 원을 움직일 수 없으므로 직접 부착 자리가 없으면 뒤로 미루지 않고 바로 ①~⑤로 붙인다.
 * state 를 제자리에서 수정한다.
 */
export function addKeyword(state: GraphState, key: SectionKey, label: string): void {
  const si = SECTIONS.findIndex((s) => s.key === key);
  const sec = SECTIONS[si];
  const cats = catCircles();
  const cat = cats[si];
  const all: Circle[] = cats.slice();
  SECTIONS.forEach((s) => placedOf(state, s.key).forEach((n) => all.push(n)));

  const list = state[key];
  const mine = placedOf(state, key);

  // 해제로 비어 있는 지름 값을 이어받는다
  const used = new Set(mine.map((n) => n.slot));
  let slot = 0;
  while (used.has(slot)) slot++;
  const d = SIZES[slot % SIZES.length];

  let spot: Circle | null =
    mine.length < firstCount(sec) ? directSpot(mine.length, d, sec, cat, all) : null;
  if (!spot) spot = findSpot(d, cat, sec.dir, mine, all);

  list.push(spot ? { label, slot, ...spot } : null);
}

/**
 * 키워드를 해제했을 때. index 는 그 카테고리 안에서의 선택 순서.
 * 해제한 원보다 카테고리 원에 가까운 원과 다른 카테고리의 원은 움직이지 않고,
 * 더 바깥에 있는 원만 가까운 것부터 차례로 안쪽 빈자리로 당긴다.
 * 당기는 거리는 그 원의 지름을 넘지 않으며, 그 범위에 자리가 없으면 제자리에 둔다.
 * state 를 제자리에서 수정한다.
 */
export function removeKeyword(state: GraphState, key: SectionKey, index: number): void {
  const si = SECTIONS.findIndex((s) => s.key === key);
  const sec = SECTIONS[si];
  const cats = catCircles();
  const cat = cats[si];
  const list = state[key];
  const removed = list[index];
  list.splice(index, 1);
  if (!removed) return;

  const dk = Math.hypot(removed.x - cat.x, removed.y - cat.y);

  const fixedOther: Circle[] = [];
  SECTIONS.forEach((s) => {
    if (s.key === key) return;
    placedOf(state, s.key).forEach((n) => fixedOther.push(n));
  });

  const near: KeywordCircle[] = [];
  const far: KeywordCircle[] = [];
  placedOf(state, key).forEach((n) => {
    (Math.hypot(n.x - cat.x, n.y - cat.y) <= dk ? near : far).push(n);
  });
  far.sort(
    (m, n) => Math.hypot(m.x - cat.x, m.y - cat.y) - Math.hypot(n.x - cat.x, n.y - cat.y),
  );

  const mine: Circle[] = near.slice();
  far.forEach((n) => {
    const all = cats.concat(fixedOther, mine);
    const cur = Math.hypot(n.x - cat.x, n.y - cat.y);
    const spot = findSpot(n.d, cat, sec.dir, mine, all, {
      from: n,
      maxMove: n.d,
      maxDist: cur - 1,
    });
    if (spot) {
      n.x = spot.x;
      n.y = spot.y;
      n.ang = spot.ang;
    }
    mine.push(n);
  });
}

/**
 * 원 안 글자. 안쪽 70% 영역에 들어가게 하고,
 * 한 줄로 넘치면 두 줄로 나누고, 두 줄로도 넘치면 글자 크기를 줄인다(최소 9px).
 */
export function fitLabel(text: string, d: number): { lines: string[]; fontSize: number } {
  const units = (s: string) =>
    s.split('').reduce((t, ch) => t + (ch.charCodeAt(0) > 0x1100 ? 1 : 0.55), 0);
  const words = text.split(' ');
  let lines = [text];

  if (words.length > 1 && units(text) > TEXT / 0.18) {
    let bi = 1;
    let bd = Infinity;
    for (let k = 1; k < words.length; k++) {
      const diff = Math.abs(
        units(words.slice(0, k).join(' ')) - units(words.slice(k).join(' ')),
      );
      if (diff < bd) {
        bd = diff;
        bi = k;
      }
    }
    lines = [words.slice(0, bi).join(' '), words.slice(bi).join(' ')];
  }

  const mx = Math.max(...lines.map(units));
  return { lines, fontSize: Math.max(9, Math.min(d * 0.18, (TEXT * d) / mx)) };
}
