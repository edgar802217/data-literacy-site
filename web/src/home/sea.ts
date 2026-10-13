/* 首頁的數字海：開場（數字整理成版面）、主視覺（指到的數字留下、其他數字讓開）、平台區的小長條圖。
   全部用 canvas 畫；減少動態時只畫靜止的最終狀態。 */

export type Cat = "A" | "B" | "T";
export interface SeaWords {
  /** 有意義的數字 → 說明 */
  mean: Record<string, string>;
  /** 數字屬於哪一種課程（被看懂時才染上該課程的顏色） */
  cat: Record<string, Cat>;
  /** 只當作原始資料的數字 */
  raw: string[];
}
interface P { x: number; y: number; vx: number; ph: number; tok: string; a0: number; kind?: string; tx?: number; ty?: number; sx?: number | null; sy?: number | null; dl?: number; size?: number; cat?: Cat; q?: number; ox?: number; oy?: number; s?: number; f?: number }

const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const HEAD = '"Chiron GoRound TC", "Noto Sans TC", sans-serif';
const SANS = '"Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif';
export const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const ease = (p: number) => (p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

function fit(cv: HTMLCanvasElement, w: number, h: number) {
  const d = Math.min(2, devicePixelRatio || 1);
  cv.width = Math.round(w * d); cv.height = Math.round(h * d);
  const x = cv.getContext("2d")!; x.setTransform(d, 0, 0, d, 0, 0); return x;
}
function colors(el: Element) {
  const cs = getComputedStyle(el), g = (n: string) => cs.getPropertyValue(n).trim();
  return { bg: g("--bg") || "#fff", ink: g("--ink"), soft: g("--soft"), sea: g("--sea") || "#7D8C99", line: g("--line"),
    A: g("--lv-a-tx"), B: g("--lv-b-tx"), T: g("--lv-t-tx"), act: g("--act"), la: g("--lv-a"), lb: g("--lv-b"), lt: g("--lv-t") };
}
type Colors = ReturnType<typeof colors>;
const pick = (w: SeaWords) => {
  const mk = Object.keys(w.mean);
  return () => (Math.random() < 0.45 ? mk[(Math.random() * mk.length) | 0] : w.raw[(Math.random() * w.raw.length) | 0]);
};
/** 數字緩慢往右流動、輕微上下起伏 */
function drift(p: P, dt: number, t: number, w: number, h: number) {
  p.x += p.vx * dt;
  p.y += Math.sin(t * 0.0005 + p.ph) * 0.006 * dt;
  if (p.x > w + 30) p.x -= w + 60;
  if (p.y < -20) p.y += h + 40; else if (p.y > h + 20) p.y -= h + 40;
}
/** 數字旁的說明 */
function label(x: CanvasRenderingContext2D, C: Colors, w: SeaWords, px: number, py: number, t: string, cw: number, al: number, sz: number) {
  const txt = w.mean[t]; if (!txt) return;
  x.save(); x.globalAlpha = al;
  x.font = `500 ${sz}px ${MONO}`; const nw = x.measureText(t).width;
  x.font = `13px ${SANS}`; const lw = x.measureText(txt).width;
  const bw = lw + 22, bh = 28, my = py - sz * 0.36;
  let bx = px + nw + 18;
  if (bx + bw > cw - 6) bx = px - bw - 18;
  const by = Math.max(4, my - bh / 2), col = C[w.cat[t]] || C.ink;
  x.strokeStyle = col; x.lineWidth = 1;
  x.beginPath(); x.moveTo(bx > px ? px + nw + 5 : px - 5, my); x.lineTo(bx > px ? bx : bx + bw, my); x.stroke();
  x.fillStyle = C.bg; x.fillRect(bx, by, bw, bh); x.strokeRect(bx + .5, by + .5, bw - 1, bh - 1);
  x.fillStyle = C.ink; x.font = `13px ${SANS}`; x.fillText(txt, bx + 11, by + 19);
  x.restore();
}

/* ---------- 開場 ---------- */
/** 數字海鋪滿畫面 → 排成版面的線、日期與文字區 → 內容浮現。回傳取消函式。
 *  scope 內：[data-ln] 是要畫出的細線（b/t/l/m），[data-tx] 是文字區，.hm-date time 是日期，.hm-sea 是主視覺方塊。 */
export function playIntro(scope: HTMLElement, words: SeaWords, onReveal: () => void, onDone: (slotSeed: P[]) => void) {
  const cv = document.createElement("canvas");
  cv.className = "hm-introcv"; cv.setAttribute("aria-hidden", "true");
  document.body.appendChild(cv);
  const W = innerWidth, H = innerHeight, x = fit(cv, W, H), C = colors(scope), tok = pick(words);
  const mobile = W < 768, K = mobile ? 0.75 : 1;
  const T: { x: number; y: number; kind: string; tok?: string; size?: number; cat?: Cat }[] = [];
  const vis = (b: DOMRect) => b.bottom > 0 && b.top < H && b.width > 0;
  scope.querySelectorAll<HTMLElement>(".hm-date time").forEach(el => {
    const b = el.getBoundingClientRect(); if (!vis(b)) return;
    T.push({ x: b.left, y: b.top + b.height * 0.8, kind: "date", tok: el.textContent!.trim(), size: parseFloat(getComputedStyle(el).fontSize), cat: el.closest<HTMLElement>("[data-c]")?.dataset.c as Cat });
  });
  document.querySelectorAll<HTMLElement>("[data-ln]").forEach(el => {
    const b = el.getBoundingClientRect(); if (!vis(b)) return;
    const s = el.dataset.ln; let x0: number, y0: number, x1: number, y1: number;
    if (s === "b") { x0 = b.left; x1 = b.right; y0 = y1 = b.bottom - .5; }
    else if (s === "t") { x0 = b.left; x1 = b.right; y0 = y1 = b.top + .5; }
    else if (s === "m") { x0 = b.left; x1 = b.right; y0 = y1 = b.top + b.height / 2; }
    else { x0 = x1 = b.left + .5; y0 = b.top; y1 = b.bottom; }
    if (y0 > H) return;
    const n = Math.max(2, Math.floor(Math.hypot(x1 - x0, y1 - y0) / 9));
    for (let i = 0; i <= n; i++) T.push({ x: x0 + (x1 - x0) * i / n, y: y0 + (y1 - y0) * i / n + 3, kind: "line" });
  });
  const box = scope.querySelector<HTMLElement>(".hm-sea");
  const bb = box?.getBoundingClientRect();
  if (bb && vis(bb)) for (let y = 16; y < bb.height - 4; y += 22) for (let xx = 6; xx < bb.width; xx += 30)
    T.push({ x: bb.left + xx + (Math.random() - .5) * 10, y: bb.top + y + (Math.random() - .5) * 6, kind: "slot" });
  scope.querySelectorAll<HTMLElement>("[data-tx]").forEach(el => {
    const b = el.getBoundingClientRect(); if (!vis(b)) return;
    for (let y = b.top + 13; y < b.bottom - 2; y += 20) for (let xx = b.left + 4; xx < b.right - 6; xx += 22) T.push({ x: xx, y, kind: "text" });
  });
  const N = Math.max(Math.round(W * H / (mobile ? 900 : 620)), Math.round(T.length * 1.12));
  const parts: P[] = Array.from({ length: N }, () => ({ x: Math.random() * W, y: Math.random() * H, vx: 0.006 + Math.random() * 0.012, ph: Math.random() * 6.28, tok: tok(), a0: 0.18 + Math.random() * 0.5, kind: "free", sx: null, sy: null, dl: Math.random() * 300, size: 11 }));
  // 每個目標找最近、還沒被分配的數字
  const cell = 56, cols = Math.ceil(W / cell) + 1, rows = Math.ceil(H / cell) + 1;
  const buckets: number[][] = Array.from({ length: cols * rows }, () => []);
  parts.forEach((p, i) => buckets[clamp((p.y / cell) | 0, 0, rows - 1) * cols + clamp((p.x / cell) | 0, 0, cols - 1)].push(i));
  for (const t of T) {
    const cx = clamp((t.x / cell) | 0, 0, cols - 1), cy = clamp((t.y / cell) | 0, 0, rows - 1);
    let best = -1, bd = Infinity, bk: number[] | null = null;
    for (let r = 0; r < Math.max(cols, rows) && best < 0; r++)
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const X = cx + dx, Y = cy + dy; if (X < 0 || Y < 0 || X >= cols || Y >= rows) continue;
        const k = buckets[Y * cols + X];
        for (let j = 0; j < k.length; j++) { const p = parts[k[j]]; const d = (p.x - t.x) ** 2 + (p.y - t.y) ** 2; if (d < bd) { bd = d; best = j; bk = k; } }
      }
    if (best < 0 || !bk) break;
    const p = parts[bk[best]]; bk.splice(best, 1);
    p.kind = t.kind; p.tx = t.x; p.ty = t.y;
    if (t.kind === "date") { p.tok = t.tok!; p.size = t.size; p.cat = t.cat; }
  }

  let raf = 0, revealed = false, over = false;
  const t0 = performance.now(); let last = t0;
  const M0 = 700, MD = 1000, R0 = 2150, END = 3050;
  const frame = (now: number) => {
    const t = (now - t0) / K, dt = Math.min(48, now - last); last = now;
    if (t > R0 && !revealed) { revealed = true; onReveal(); }
    const bgA = 1 - ease(clamp((t - R0) / 650, 0, 1));
    x.clearRect(0, 0, W, H);
    if (bgA > 0) { x.globalAlpha = bgA; x.fillStyle = C.bg; x.fillRect(0, 0, W, H); }
    const fadeIn = clamp(t / 450, 0, 1), gone = 1 - clamp((t - 2300) / 550, 0, 1);
    let font = "";
    for (const p of parts) {
      let a = p.a0 * fadeIn, sz = p.size!;
      if (p.kind === "free") { drift(p, dt, now, W, H); a *= 1 - clamp((t - 1300) / 900, 0, 1); }
      else {
        if (t < M0) drift(p, dt, now, W, H);
        else {
          if (p.sx === null) { p.sx = p.x; p.sy = p.y; }
          const q = ease(clamp((t - M0 - p.dl!) / MD, 0, 1));
          p.x = p.sx! + (p.tx! - p.sx!) * q; p.y = p.sy! + (p.ty! - p.sy!) * q;
          if (p.kind === "line") { sz = 11 - 3 * q; a += (0.75 - a) * q; }
          else if (p.kind === "text") { sz = 11 - q; a += (0.38 - a) * q; }
          else if (p.kind === "date") { sz = 11 + (p.size! - 11) * q; a += (1 - a) * q; p.q = q; }
          else if (p.kind === "slot") a += (0.42 - a) * q;
        }
        if (p.kind !== "slot") a *= gone;
      }
      if (a <= 0.01) continue;
      const f = p.kind === "date" && t > M0 ? `700 ${sz.toFixed(1)}px ${HEAD}` : `${sz.toFixed(1)}px ${MONO}`;
      if (f !== font) { x.font = f; font = f; }
      x.globalAlpha = a; x.fillStyle = p.kind === "date" && p.q! > 0.55 && p.cat ? C[p.cat] : C.sea;
      x.fillText(p.tok, p.x, p.y);
    }
    x.globalAlpha = 1;
    if (t >= END) return finish();
    raf = requestAnimationFrame(frame);
  };
  const SK = ["pointerdown", "keydown", "wheel", "touchstart"] as const;
  const skip = () => finish();
  function finish() {
    if (over) return; over = true;
    cancelAnimationFrame(raf); SK.forEach(e => removeEventListener(e, skip));
    if (!revealed) { revealed = true; onReveal(); }
    cv.remove();
    const b = box?.getBoundingClientRect();
    onDone(b ? parts.filter(p => p.kind === "slot").map(p => ({ x: p.x - b.left, y: p.y - b.top, vx: p.vx * .55, ph: p.ph, tok: p.tok, a0: p.a0 })) : []);
  }
  SK.forEach(e => addEventListener(e, skip, { passive: true }));
  raf = requestAnimationFrame(frame);
  return () => { if (over) return; over = true; cancelAnimationFrame(raf); SK.forEach(e => removeEventListener(e, skip)); cv.remove(); };
}

/* ---------- 主視覺：指到的數字留下，其他數字讓開 ---------- */
export function createSlot(box: HTMLElement, cv: HTMLCanvasElement, words: SeaWords, onKept: (cat: Cat | null) => void, seed?: P[]) {
  const PUSH = 92, SNAP = 64, tok = pick(words);
  let C = colors(box), x: CanvasRenderingContext2D, W = 0, H = 0, parts: P[] = [], raf = 0, last = 0, on = true;
  let ptr: { x: number; y: number } | null = null, kept: P | null = null, rowCat: Cat | null = null, keptCat: Cat | null = null;
  const seedGrid = () => {
    const out: P[] = [];
    for (let y = 16; y < H - 4; y += 22) for (let xx = 6; xx < W; xx += 30)
      out.push({ x: xx + (Math.random() - .5) * 10, y: y + (Math.random() - .5) * 6, vx: 0.004 + Math.random() * 0.006, ph: Math.random() * 6.28, tok: tok(), a0: 1 });
    return out;
  };
  function layout(s?: P[]) {
    const b = box.getBoundingClientRect(); W = b.width; H = b.height; if (!W) return false;
    x = fit(cv, W, H); C = colors(box);
    parts = (s && s.length ? s : seedGrid()).map(p => ({ ...p, ox: 0, oy: 0, s: 0, f: 0 }));
    kept = null; return true;
  }
  /* 只有講得出意義的數字會被留下；新的候選要明顯更近才換，避免抖動 */
  function pickKept() {
    if (!ptr) return null;
    let best: P | null = null, bd = SNAP * SNAP;
    for (const p of parts) {
      if (!words.mean[p.tok]) continue;
      const d2 = (p.x - ptr.x) ** 2 + (p.y - ptr.y) ** 2;
      if (d2 < bd) { bd = d2; best = p; }
    }
    if (kept && kept !== best) {
      const kd = (kept.x - ptr.x) ** 2 + (kept.y - ptr.y) ** 2;
      if (kd < (SNAP * 1.35) ** 2 && (!best || bd > kd * 0.5)) return kept;
    }
    return best;
  }
  function draw(now: number, dt: number) {
    const rm = reduced() || !dt, k1 = rm ? 1 : 1 - Math.exp(-dt / 90);
    kept = pickKept();
    const kc = kept ? words.cat[kept.tok] || null : null;
    if (kc !== keptCat) { keptCat = kc; onKept(kc); }
    const cx = kept ? kept.x : ptr ? ptr.x : 0, cy = kept ? kept.y : ptr ? ptr.y : 0;
    x.clearRect(0, 0, W, H);
    let font = "";
    for (const p of parts) {
      if (dt && p !== kept) drift(p, dt, now, W, H);
      let tox = 0, toy = 0, fade = 0;
      if (ptr && p !== kept) {
        const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1;
        if (d < PUSH) {
          if (!reduced()) { tox = dx / d * (PUSH - d) * 0.95; toy = dy / d * (PUSH - d) * 0.95; }
          fade = Math.min(1, (1 - d / PUSH) * 1.6);
        }
      }
      p.ox! += (tox - p.ox!) * k1; p.oy! += (toy - p.oy!) * k1; p.f! += (fade - p.f!) * k1;
      const hit = !!rowCat && words.cat[p.tok] === rowCat;
      p.s! += ((p === kept || hit ? 1 : 0) - p.s!) * k1;
      const sz = 11 + (p === kept ? 9 : 3) * p.s!;
      const col = p.s! > 0.35 ? C[words.cat[p.tok]] || C.ink : C.sea;
      const f = `${p.s! > 0.35 ? 500 : 400} ${sz.toFixed(1)}px ${MONO}`;
      if (f !== font) { x.font = f; font = f; }
      x.globalAlpha = (0.42 + 0.58 * p.s!) * (1 - 0.82 * p.f!); x.fillStyle = col;
      x.fillText(p.tok, p.x + p.ox!, p.y + p.oy!);
    }
    if (kept && kept.s! > 0.2) label(x, C, words, kept.x, kept.y, kept.tok, W, Math.min(1, kept.s! * 1.4), 20);
    x.globalAlpha = 1;
  }
  const frame = (now: number) => { const dt = Math.min(48, now - last); last = now; if (on) draw(now, dt); raf = requestAnimationFrame(frame); };
  const redraw = () => { if (reduced()) draw(0, 0); };
  const local = (e: PointerEvent) => { const b = box.getBoundingClientRect(); return { x: e.clientX - b.left, y: e.clientY - b.top }; };
  const move = (e: PointerEvent) => { if (e.pointerType === "mouse") { ptr = local(e); redraw(); } };
  const leave = (e: PointerEvent) => { if (e.pointerType === "mouse") { ptr = null; redraw(); } };
  const down = (e: PointerEvent) => { if (e.pointerType !== "mouse") { ptr = local(e); kept = null; redraw(); } };
  const away = (e: PointerEvent) => { if (e.pointerType !== "mouse" && !box.contains(e.target as Node)) { ptr = null; redraw(); } };
  const vis = () => { on = !document.hidden; };
  const io = "IntersectionObserver" in window ? new IntersectionObserver(es => { on = es[0].isIntersecting; }) : null;
  let rt = 0;
  const resize = () => { clearTimeout(rt); rt = window.setTimeout(() => { if (layout()) redraw(); }, 200); };
  box.addEventListener("pointermove", move); box.addEventListener("pointerleave", leave); box.addEventListener("pointerdown", down);
  document.addEventListener("pointerdown", away); document.addEventListener("visibilitychange", vis); addEventListener("resize", resize);
  io?.observe(box);
  if (layout(seed)) { last = performance.now(); if (reduced()) draw(0, 0); else raf = requestAnimationFrame(frame); }
  return {
    setRowCat(c: Cat | null) { rowCat = c; redraw(); },
    destroy() {
      cancelAnimationFrame(raf); clearTimeout(rt); io?.disconnect();
      box.removeEventListener("pointermove", move); box.removeEventListener("pointerleave", leave); box.removeEventListener("pointerdown", down);
      document.removeEventListener("pointerdown", away); document.removeEventListener("visibilitychange", vis); removeEventListener("resize", resize);
    },
  };
}

/* ---------- 平台區：散落的資料排成長條圖，一筆一格 ---------- */
export interface BarGroup { label: string; items: string[]; color: "act" | "la" | "lb" | "lt" }
export function createBars(cv: HTMLCanvasElement, groups: BarGroup[]) {
  const H = 168;
  let x: CanvasRenderingContext2D, W = 0, raf = 0, C = colors(cv);
  let cells: { col: string; d: string; x: number; w: number; y: number; sx: number; sy: number; dl: number }[] = [];
  let bars: { label: string; n: number; x: number; top: number; col: string }[] = [];
  function layout() {
    W = cv.getBoundingClientRect().width; if (!W) return false;
    x = fit(cv, W, H); C = colors(cv);
    const n = groups.length, gap = 12, bw = Math.min(58, (W - gap * (n - 1)) / n), x0 = (W - (bw * n + gap * (n - 1))) / 2;
    const row = Math.min(17, (H - 56) / Math.max(1, ...groups.map(g => g.items.length)));
    cells = []; bars = [];
    groups.forEach((g, i) => {
      const bx = x0 + i * (bw + gap);
      g.items.forEach((d, k) => cells.push({ col: C[g.color], d, x: bx, w: bw, y: H - 28 - (k + 1) * row, sx: Math.random() * (W - bw), sy: 6 + Math.random() * (H - 50), dl: i * 110 + k * 70 }));
      bars.push({ label: g.label, n: g.items.length, x: bx + bw / 2, top: H - 28 - g.items.length * row, col: C[g.color] });
    });
    return true;
  }
  function draw(t: number) {
    x.clearRect(0, 0, W, H);
    let all = true;
    for (const c of cells) {
      const q = ease(clamp((t - c.dl) / 760, 0, 1)); if (q < 1) all = false;
      const px = c.sx + (c.x - c.sx) * q, py = c.sy + (c.y - c.sy) * q, landed = q > 0.6;
      if (landed) { x.globalAlpha = 0.16 * (q - 0.6) / 0.4; x.fillStyle = c.col; x.fillRect(px, py, c.w, 15); }
      x.globalAlpha = landed ? 1 : 0.5; x.fillStyle = landed ? c.col : C.sea; x.font = `10.5px ${MONO}`;
      x.fillText(c.d, px + (landed ? (c.w - x.measureText(c.d).width) / 2 : 0), py + 11.5);
    }
    const la = clamp((t - 1100) / 400, 0, 1);
    x.globalAlpha = la; x.fillStyle = C.line; x.fillRect(0, H - 24, W, 1);
    x.textAlign = "center";
    for (const b of bars) {
      x.fillStyle = C.soft; x.font = `12px ${SANS}`; x.fillText(b.label, b.x, H - 6);
      x.fillStyle = b.col; x.font = `700 15px ${HEAD}`; x.fillText(String(b.n), b.x, b.top - 6);
    }
    x.textAlign = "start"; x.globalAlpha = 1;
    return all && la >= 1;
  }
  function run() {
    if (!layout()) return;
    cancelAnimationFrame(raf);
    if (reduced()) { draw(1e9); return; }
    const t0 = performance.now();
    const step = (now: number) => { if (!draw(now - t0)) raf = requestAnimationFrame(step); };
    raf = requestAnimationFrame(step);
  }
  let ran = false;
  const scatter = () => { if (layout()) draw(-1); };
  const io = "IntersectionObserver" in window && !reduced()
    ? new IntersectionObserver(es => { if (es[0].isIntersecting && !document.documentElement.classList.contains("hm-pre") && !ran) { ran = true; setTimeout(run, 200); } }, { threshold: 0.6 })
    : null;
  const click = () => { ran = true; run(); };
  const resize = () => { if (!layout()) return; draw(ran || reduced() ? 1e9 : -1); };
  cv.addEventListener("click", click); addEventListener("resize", resize);
  if (io) { scatter(); io.observe(cv); } else { ran = true; run(); }
  return {
    /** 開場結束後再檢查一次是否已在畫面上 */
    recheck() { if (io && !ran) { io.unobserve(cv); io.observe(cv); } },
    destroy() { cancelAnimationFrame(raf); io?.disconnect(); cv.removeEventListener("click", click); removeEventListener("resize", resize); },
  };
}
