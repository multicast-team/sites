/* Idle Frontline — интерактив сайта: общая шапка, подсказки, лайтбокс,
   лента сессии, кольцо петли, каталог проблем, графики экономики, матрица и план. */
(function () {
  "use strict";
  const D = window.IF;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const NS = "http://www.w3.org/2000/svg";
  const SESSION = 3765; // 1:02:45

  /* ---------- утилиты ---------- */
  function sec(t) {
    const p = String(t).split("–")[0].trim().split(":").map(Number);
    return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : p[0] * 60 + p[1];
  }
  function range(t) {
    const [a, b] = String(t).split("–");
    return [sec(a), b ? sec(b) : sec(a)];
  }
  function esc(s) {
    return String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  }
  function el(tag, attrs = {}, parent) {
    const n = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) if (v !== undefined && v !== null) n.setAttribute(k, v);
    if (parent) parent.appendChild(n);
    return n;
  }
  function txt(parent, x, y, s, attrs = {}) {
    const n = el("text", Object.assign({ x, y }, attrs), parent);
    n.textContent = s;
    return n;
  }
  const fmt = n => n.toLocaleString("ru-RU", { maximumFractionDigits: 3 });
  const byId = Object.fromEntries(D.ITEMS.map(i => [i.id, i]));
  const sysById = Object.fromEntries(D.SYSTEMS.map(s => [s.id, s]));
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* значки систем — условные знаки карты */
  const ICON = {
    goal: '<path d="M7 1 13 7 7 13 1 7Z" fill="#F2B51D" stroke="#1D2A21" stroke-width="1.4"/>',
    flag: '<path d="M3 13V1.5" stroke="#1D2A21" stroke-width="1.6"/><path d="M3.8 2h8l-2 2.6 2 2.6h-8Z" fill="#14866F"/>',
    cross: '<path d="M2.5 2.5l9 9M11.5 2.5l-9 9" stroke="#C93F2F" stroke-width="2.2" stroke-linecap="round"/>',
    house: '<path d="M2 6.5 7 2l5 4.5V12H2Z" fill="none" stroke="#1D2A21" stroke-width="1.5"/><rect x="5.5" y="8" width="3" height="4" fill="#1D2A21"/>',
    person: '<circle cx="7" cy="4.2" r="2.6" fill="#1D2A21"/><path d="M2 13c.6-3 2.6-4.6 5-4.6S11.4 10 12 13Z" fill="#1D2A21"/>',
    hex: '<path d="M7 1.2 12.2 4.1v5.8L7 12.8 1.8 9.9V4.1Z" fill="none" stroke="#5B4FB0" stroke-width="1.7"/><circle cx="7" cy="7" r="1.8" fill="#5B4FB0"/>',
  };
  const icon = id => `<svg viewBox="0 0 14 14" aria-hidden="true">${ICON[id]}</svg>`;
  const sysLabel = s => `<span class="sys">${icon(sysById[s].icon)}${esc(sysById[s].name)}</span>`;
  const priLabel = p => `<span class="pri pri--${p}">${p === "P0" ? "P0 блокер" : p}</span>`;

  /* ---------- шапка ---------- */
  const toggle = $(".nav-toggle");
  if (toggle) toggle.addEventListener("click", () => {
    const nav = $(".nav");
    const open = nav.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", open);
  });

  /* ---------- подсказка ---------- */
  const tip = document.createElement("div");
  tip.className = "tip";
  tip.hidden = true;
  tip.setAttribute("role", "tooltip");
  tip.id = "tip";
  document.body.appendChild(tip);
  let tipOwner = null;
  function showTip(owner, html, ev) {
    tipOwner = owner;
    tip.innerHTML = html;
    tip.hidden = false;
    const r = owner.getBoundingClientRect();
    const tw = tip.offsetWidth, th = tip.offsetHeight;
    let x = (ev && ev.clientX) || r.left + r.width / 2;
    let y = r.top;
    let left = Math.min(Math.max(8, x - tw / 2), innerWidth - tw - 8);
    let top = y - th - 12;
    if (top < 70) top = r.bottom + 12;
    tip.style.left = left + "px";
    tip.style.top = top + "px";
  }
  function hideTip() { tip.hidden = true; tipOwner = null; }
  document.addEventListener("keydown", e => { if (e.key === "Escape") hideTip(); });
  document.addEventListener("click", e => {
    if (tipOwner && !tip.contains(e.target) && !tipOwner.contains(e.target)) hideTip();
  });
  addEventListener("scroll", () => { if (tipOwner && !tip.matches(":hover")) hideTip(); }, { passive: true });
  function bindTip(node, html) {
    node.addEventListener("mouseenter", e => showTip(node, html(), e));
    node.addEventListener("mouseleave", () => setTimeout(() => { if (!tip.matches(":hover") && tipOwner === node) hideTip(); }, 120));
    node.addEventListener("focus", () => showTip(node, html()));
    node.addEventListener("blur", () => setTimeout(() => { if (!tip.contains(document.activeElement)) hideTip(); }, 150));
    node.addEventListener("click", e => { e.stopPropagation(); showTip(node, html(), e); });
    node.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); showTip(node, html()); } });
  }
  tip.addEventListener("mouseleave", hideTip);
  const itemTip = it => () => `<div class="tip__meta"><span class="idtag" style="color:#fff">${it.id}</span>${priLabel(it.p)}<span>${esc(it.t)}</span></div>
    <b>${esc(it.title)}</b>${it.quote ? `<q>${esc(it.quote.text)}</q>` : ""}
    <a href="problems.html#${it.id}">Подробнее и правка</a>`;

  /* ---------- лайтбокс для кадров ---------- */
  const box = document.createElement("dialog");
  box.className = "lightbox";
  box.innerHTML = '<figure style="margin:0"><img alt=""><figcaption></figcaption></figure><button type="button" aria-label="Закрыть">×</button>';
  document.body.appendChild(box);
  box.querySelector("button").addEventListener("click", () => box.close());
  box.addEventListener("click", e => { if (e.target === box) box.close(); });
  document.addEventListener("click", e => {
    const t = e.target.closest("[data-zoom]");
    if (!t) return;
    e.preventDefault();
    box.querySelector("img").src = t.dataset.zoom;
    box.querySelector("img").alt = t.dataset.caption || "";
    box.querySelector("figcaption").textContent = t.dataset.caption || "";
    box.showModal();
  });

  const page = document.body.dataset.page;

  /* =========================================================
     ОБЗОР: лента сессии
     ========================================================= */
  function renderStrip(host) {
    const W = 1200, L = 170, R = 24;
    const X = s => L + (s / SESSION) * (W - L - R);
    const rows = D.SYSTEMS.length;
    const top = 14, lostH = 24, rowH = 36, gap = 18;
    const yLost = top;
    const yRows = yLost + lostH + gap;
    const yGood = yRows + rows * rowH + 8;
    const yAgree = yGood + rowH;
    const yAxis = yAgree + rowH + 4;
    const H = yAxis + 76;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "strip__svg", role: "group", "aria-labelledby": "strip-title" });
    const defs = el("defs", {}, svg);
    const pat = el("pattern", { id: "hatch", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("rect", { width: 7, height: 7, fill: "#F4DED8" }, pat);
    el("rect", { width: 2.4, height: 7, fill: "#C93F2F" }, pat);

    // сетка минут
    for (let m = 0; m <= 60; m += 5) {
      const x = X(m * 60);
      el("line", { x1: x, x2: x, y1: yLost, y2: yAxis, stroke: m % 10 ? "#E3E6DD" : "#D3D8CC", "stroke-width": 1 }, svg);
      txt(svg, x, yAxis + 18, m === 0 ? "0" : String(m), { "text-anchor": "middle", "font-size": 13, fill: "#5E6C62", "font-weight": 600 });
    }
    txt(svg, L - 12, yAxis + 18, "минуты", { "text-anchor": "end", "font-size": 13, fill: "#5E6C62" });
    el("line", { x1: L, x2: W - R, y1: yAxis, y2: yAxis, stroke: "#1D2A21", "stroke-width": 1.5 }, svg);

    // вехи
    D.MILESTONES.forEach((m, i) => {
      const x = X(sec(m.t)), lvl = i % 3, end = x > W - R - 120;
      el("line", { x1: x, x2: x, y1: yAxis, y2: yAxis + 24 + lvl * 15, stroke: "#1D2A21", "stroke-width": 1 }, svg);
      txt(svg, end ? x - 4 : x + 4, yAxis + 34 + lvl * 15, m.label, { "font-size": 12.5, fill: "#1D2A21", "font-weight": 650, "text-anchor": end ? "end" : "start" });
    });

    // подписи рядов
    const label = (y, s, sub, iconId) => {
      const fo = el("foreignObject", { x: 0, y: y - 2, width: L - 12, height: rowH }, svg);
      fo.innerHTML = `<div xmlns="http://www.w3.org/1999/xhtml" style="display:flex;align-items:center;gap:6px;height:${rowH - 4}px;font:600 13.5px/1.15 var(--font-text);color:#46564A">${iconId ? icon(iconId).replace("<svg", '<svg style="width:14px;height:14px;flex:none"') : ""}<span>${esc(s)}${sub ? `<br><span style="font-weight:500;color:#5E6C62">${esc(sub)}</span>` : ""}</span></div>`;
    };
    label(yLost - 4, "Не знает,", "что делать", null);
    D.SYSTEMS.forEach((s, i) => {
      const y = yRows + i * rowH;
      el("line", { x1: L, x2: W - R, y1: y + rowH / 2, y2: y + rowH / 2, stroke: "#C6CDBF", "stroke-width": 1, "stroke-dasharray": "2 4" }, svg);
      label(y, s.name, "", s.icon);
    });
    label(yGood, "Понравилось", "", null);
    label(yAgree, "Договорились", "", null);
    el("line", { x1: L, x2: W - R, y1: yGood + rowH / 2, y2: yGood + rowH / 2, stroke: "#C6CDBF", "stroke-dasharray": "2 4" }, svg);
    el("line", { x1: L, x2: W - R, y1: yAgree + rowH / 2, y2: yAgree + rowH / 2, stroke: "#C6CDBF", "stroke-dasharray": "2 4" }, svg);

    const marks = [];
    // отрезки «не знает, что делать»
    D.LOST.forEach(lo => {
      const a = sec(lo.from), b = sec(lo.to);
      const g = el("g", { class: "mark", tabindex: 0, role: "button", "aria-label": `${lo.from}–${lo.to}: ${lo.text}`, "data-type": "lost" }, svg);
      el("rect", { class: "mark__shape", x: X(a), y: yLost, width: Math.max(5, X(b) - X(a)), height: lostH, fill: "url(#hatch)", stroke: "#C93F2F", "stroke-width": 1, rx: 2 }, g);
      bindTip(g, () => `<div class="tip__meta"><span>${lo.from}–${lo.to}</span><span>игрок не понимает, что делать</span></div><q>${esc(lo.text)}</q>`);
      marks.push(g);
    });

    // замечания по системам
    const colorP = { P0: "#8E1F16", P1: "#C93F2F", P2: "#D49A00" };
    D.SYSTEMS.forEach((s, i) => {
      const cy = yRows + i * rowH + rowH / 2;
      const items = D.ITEMS.filter(it => it.sys === s.id).sort((a, b) => sec(a.t) - sec(b.t));
      // обсуждения — тонкие отрезки
      items.forEach(it => it.times.forEach(tr => {
        const [a, b] = range(tr);
        if (b - a < 8) return;
        el("rect", { x: X(a), y: cy - 1.5, width: X(b) - X(a), height: 3, fill: "#9AA697", rx: 1.5 }, svg);
      }));
      const placed = [];
      items.forEach(it => {
        const x = X(sec(it.t));
        let dy = 0;
        const near = placed.filter(p => Math.abs(p.x - x) < 15);
        if (near.length) dy = near.length % 2 ? -9 : 9;
        placed.push({ x });
        const g = el("g", { class: "mark", tabindex: 0, role: "button", "aria-label": `${it.id}, ${it.t}: ${it.title}`, "data-type": "item", "data-id": it.id, "data-sys": it.sys }, svg);
        if (it.p === "P0") {
          el("rect", { class: "mark__shape", x: x - 8, y: cy + dy - 8, width: 16, height: 16, fill: colorP.P0, stroke: "#fff", "stroke-width": 1.5, rx: 2 }, g);
        } else {
          el("circle", { class: "mark__shape", cx: x, cy: cy + dy, r: 7, fill: colorP[it.p], stroke: it.isNew ? "#5B4FB0" : "#fff", "stroke-width": it.isNew ? 2.2 : 1.5 }, g);
        }
        el("circle", { cx: x, cy: cy + dy, r: 15, fill: "transparent" }, g);
        bindTip(g, itemTip(it));
        marks.push(g);
      });
    });

    // понравилось
    D.GOODS.forEach(gd => {
      const x = X(sec(gd.t)), cy = yGood + rowH / 2;
      const g = el("g", { class: "mark", tabindex: 0, role: "button", "aria-label": `${gd.t}: ${gd.title}`, "data-type": "good" }, svg);
      el("path", { class: "mark__shape", d: `M${x} ${cy - 8} L${x + 8} ${cy + 6} L${x - 8} ${cy + 6} Z`, fill: "#14866F", stroke: "#fff", "stroke-width": 1.5 }, g);
      el("circle", { cx: x, cy, r: 15, fill: "transparent" }, g);
      bindTip(g, () => `<div class="tip__meta"><span>${gd.t}</span><span>понравилось</span></div><b>${esc(gd.title)}</b><q>${esc(gd.quote)}</q>`);
      marks.push(g);
    });
    // договорились
    D.AGREED.forEach(a => {
      const x = X(sec(a.t)), cy = yAgree + rowH / 2;
      const g = el("g", { class: "mark", tabindex: 0, role: "button", "aria-label": `${a.t}: договорились — ${a.text}`, "data-type": "agreed" }, svg);
      el("path", { class: "mark__shape", d: `M${x} ${cy - 9} L${x + 9} ${cy} L${x} ${cy + 9} L${x - 9} ${cy} Z`, fill: "#F2B51D", stroke: "#1D2A21", "stroke-width": 1.5 }, g);
      el("circle", { cx: x, cy, r: 15, fill: "transparent" }, g);
      bindTip(g, () => `<div class="tip__meta"><span>${a.t}</span><span>договорились на встрече</span></div><b>${esc(a.text)}</b><a href="problems.html#${a.ref}">Пункт ${a.ref}</a>`);
      marks.push(g);
    });

    host.appendChild(svg);

    // таблица-дубль для доступности
    const btn = $("#strip-list-btn");
    const tbl = $("#strip-table");
    if (btn && tbl) {
      const rowsH = [
        ...D.LOST.map(l => [sec(l.from), `${l.from}–${l.to}`, "Не знает, что делать", l.text]),
        ...D.ITEMS.map(i => [sec(i.t), i.t, `${i.id} ${i.p}, ${sysById[i.sys].name}`, `<a href="problems.html#${i.id}">${esc(i.title)}</a>`]),
        ...D.GOODS.map(g => [sec(g.t), g.t, "Понравилось", esc(g.title)]),
        ...D.AGREED.map(a => [sec(a.t), a.t, "Договорились", esc(a.text)]),
      ].sort((a, b) => a[0] - b[0]);
      tbl.innerHTML = `<table class="list"><thead><tr><th>Время</th><th>Что</th><th>Описание</th></tr></thead><tbody>${rowsH.map(r => `<tr><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td></tr>`).join("")}</tbody></table>`;
      btn.addEventListener("click", () => {
        const open = tbl.hidden;
        tbl.hidden = !open;
        btn.setAttribute("aria-expanded", open);
        btn.textContent = open ? "Скрыть список" : "Показать списком";
      });
    }
    // фильтр по системе из кольца
    return { svg, focusSys(sysList) {
      marks.forEach(m => {
        const s = m.getAttribute("data-sys");
        m.classList.toggle("is-dim", !!sysList && m.dataset.type === "item" && !sysList.includes(m.dataset.id));
      });
    } };
  }

  /* ---------- кольцо петли ---------- */
  function renderLoop(host) {
    const S = 520, c = S / 2, Rr = 178;
    const svg = el("svg", { viewBox: `0 0 ${S} ${S}`, class: "loop__svg", role: "img", "aria-labelledby": "loop-title loop-desc" });
    const defs = el("defs", {}, svg);
    const pat = el("pattern", { id: "hatch2", width: 7, height: 7, patternUnits: "userSpaceOnUse", patternTransform: "rotate(45)" }, defs);
    el("rect", { width: 7, height: 7, fill: "#F4DED8" }, pat);
    el("rect", { width: 2.4, height: 7, fill: "#C93F2F" }, pat);
    const nodes = [
      { a: -90, name: "Бой", sub: "добыть и победить" },
      { a: 0, name: "Захват", sub: "территория и база" },
      { a: 90, name: "База", sub: "доход и оборона" },
      { a: 180, name: "Усиление", sub: "герой и отряд" },
    ];
    const P = (a, r = Rr) => [c + r * Math.cos(a * Math.PI / 180), c + r * Math.sin(a * Math.PI / 180)];
    const arc = (a1, a2, r = Rr) => {
      const [x1, y1] = P(a1, r), [x2, y2] = P(a2, r);
      return `M${x1} ${y1} A${r} ${r} 0 0 1 ${x2} ${y2}`;
    };
    // дуги своего цвета с разрывами
    nodes.forEach((n, i) => {
      const a1 = n.a + 20, a2 = n.a + 90 - 20;
      const mid = n.a + 45;
      el("path", { d: arc(a1, mid - 9), fill: "none", stroke: "#14866F", "stroke-width": 10, "stroke-linecap": "butt" }, svg);
      el("path", { d: arc(mid + 9, a2), fill: "none", stroke: "#14866F", "stroke-width": 10 }, svg);
      // стрелка
      const [ax, ay] = P(a2 - 2), ang = a2 + 90;
      el("path", { d: "M-7 -8 L7 0 L-7 8 Z", fill: "#14866F", transform: `translate(${ax} ${ay}) rotate(${ang})` }, svg);
      // разрыв
      const [bx, by] = P(mid);
      const g = el("g", {}, svg);
      el("circle", { cx: bx, cy: by, r: 22, fill: "url(#hatch2)", stroke: "#C93F2F", "stroke-width": 2 }, g);
      el("circle", { cx: bx, cy: by, r: 12, fill: "#F7F8F2" }, g);
      txt(g, bx, by + 5, String(i + 1), { "text-anchor": "middle", "font-size": 15, "font-weight": 800, fill: "#1D2A21" });
    });
    nodes.forEach(n => {
      const [x, y] = P(n.a);
      el("circle", { cx: x, cy: y, r: 50, fill: "#1D2A21" }, svg);
      txt(svg, x, y + 2, n.name, { "text-anchor": "middle", "font-size": 22, "font-weight": 800, fill: "#F7F8F2", style: "font-family:var(--font-display);font-size:25px" });
      txt(svg, x, y + 20, n.sub, { "text-anchor": "middle", "font-size": 10.5, fill: "#C9D2C3" });
    });
    txt(svg, c, c - 6, "Петля есть,", { "text-anchor": "middle", style: "font:800 30px var(--font-display)", fill: "#1D2A21" });
    txt(svg, c, c + 24, "рвётся на переходах", { "text-anchor": "middle", style: "font:800 30px var(--font-display)", fill: "#A8331F" });
    host.appendChild(svg);
  }

  /* =========================================================
     ПРОБЛЕМЫ: каталог
     ========================================================= */
  function renderCatalog() {
    const list = $("#items"), grid = $("#grid-sp");
    const state = { sys: new Set(), p: new Set(), kind: new Set(), onlyNew: false, q: "", sort: "time" };
    const pri = ["P0", "P1", "P2"];

    // матрица система × приоритет
    let g = `<div class="hd">Система</div>${pri.map(p => `<div class="hd">${p}</div>`).join("")}<div class="hd">Всего</div>`;
    D.SYSTEMS.forEach(s => {
      const its = D.ITEMS.filter(i => i.sys === s.id);
      g += `<button type="button" class="sysbtn" data-set-sys="${s.id}">${sysLabel(s.id)}</button>`;
      pri.forEach(p => {
        const n = its.filter(i => i.p === p).length;
        const bg = n ? `rgba(29,42,33,${0.07 + n * 0.07})` : "transparent";
        g += n ? `<button type="button" class="cell" data-set-sys="${s.id}" data-set-p="${p}" aria-label="${s.name}, ${p}: ${n}"><span class="dotc" style="background:${bg}">${n}</span></button>` : `<div class="cell"><span class="dotc" style="color:#9AA697">–</span></div>`;
      });
      g += `<div class="tot num">${its.length}</div>`;
    });
    g += `<div class="hd" style="justify-content:flex-start">Всего</div>${pri.map(p => `<div class="tot num">${D.ITEMS.filter(i => i.p === p).length}</div>`).join("")}<div class="tot num">${D.ITEMS.length}</div>`;
    grid.innerHTML = g;
    grid.addEventListener("click", e => {
      const b = e.target.closest("[data-set-sys]");
      if (!b) return;
      state.sys = new Set([b.dataset.setSys]);
      state.p = b.dataset.setP ? new Set([b.dataset.setP]) : new Set();
      syncChips(); draw();
      $("#filters").scrollIntoView({ behavior: reduced ? "auto" : "smooth" });
    });

    // фильтры
    const fSys = $("#f-sys"), fP = $("#f-p"), fK = $("#f-kind");
    fSys.innerHTML = D.SYSTEMS.map(s => `<button type="button" class="chip" aria-pressed="false" data-sys="${s.id}">${icon(s.icon).replace("<svg", '<svg style="width:13px;height:13px"')}${esc(s.name)} <span class="cnt">${D.ITEMS.filter(i => i.sys === s.id).length}</span></button>`).join("");
    fP.innerHTML = pri.map(p => `<button type="button" class="chip" aria-pressed="false" data-p="${p}">${p} <span class="cnt">${D.ITEMS.filter(i => i.p === p).length}</span></button>`).join("");
    fK.innerHTML = Object.entries(D.KINDS).map(([k, n]) => `<button type="button" class="chip" aria-pressed="false" data-kind="${k}">${n} <span class="cnt">${D.ITEMS.filter(i => i.kinds.includes(k)).length}</span></button>`).join("") +
      `<button type="button" class="chip" aria-pressed="false" data-new="1">Новые при перепроверке <span class="cnt">${D.ITEMS.filter(i => i.isNew).length}</span></button>`;
    function toggleSet(set, v) { set.has(v) ? set.delete(v) : set.add(v); }
    $("#filters").addEventListener("click", e => {
      const c = e.target.closest(".chip");
      if (!c) return;
      if (c.dataset.sys) toggleSet(state.sys, c.dataset.sys);
      if (c.dataset.p) toggleSet(state.p, c.dataset.p);
      if (c.dataset.kind) toggleSet(state.kind, c.dataset.kind);
      if (c.dataset.new) state.onlyNew = !state.onlyNew;
      if (c.id === "f-reset") { state.sys.clear(); state.p.clear(); state.kind.clear(); state.onlyNew = false; state.q = ""; $("#f-q").value = ""; }
      syncChips(); draw();
    });
    $("#f-q").addEventListener("input", e => { state.q = e.target.value.trim().toLowerCase(); draw(); });
    $("#f-sort").addEventListener("change", e => { state.sort = e.target.value; draw(); });
    function syncChips() {
      $$(".chip[data-sys]").forEach(c => c.setAttribute("aria-pressed", state.sys.has(c.dataset.sys)));
      $$(".chip[data-p]").forEach(c => c.setAttribute("aria-pressed", state.p.has(c.dataset.p)));
      $$(".chip[data-kind]").forEach(c => c.setAttribute("aria-pressed", state.kind.has(c.dataset.kind)));
      $$(".chip[data-new]").forEach(c => c.setAttribute("aria-pressed", state.onlyNew));
    }
    const pOrder = { P0: 0, P1: 1, P2: 2 };
    function card(it) {
      const q = it.quote ? `<blockquote class="quote ${it.quote.who === "игрок" ? "quote--player" : ""}"><p>«${esc(it.quote.text)}»</p><footer><span class="tc">${it.quote.t}</span>${esc(it.quote.who)}</footer></blockquote>` : "";
      return `<article class="item item--${it.p}" id="${it.id}">
        <div class="item__shot"><button type="button" data-zoom="img/${it.frame}.webp" data-caption="${it.id}: ${esc(it.title)}" aria-label="Увеличить кадр к ${it.id}"><img src="img/${it.frame}.webp" alt="Кадр записи к пункту ${it.id}" loading="lazy" width="132" height="284"></button><span class="tc">${esc(it.t)}</span></div>
        <div>
          <div class="item__meta"><span class="idtag">${it.id}</span>${priLabel(it.p)}${sysLabel(it.sys)}<span class="kind">${it.kinds.map(k => D.KINDS[k]).join(", ")}</span>${it.isNew ? '<span class="newflag">новое</span>' : ""}</div>
          <h3>${esc(it.title)}</h3>
          <p class="what">${esc(it.what)}</p>
          ${q}
          <div class="item__cols">
            <div class="item__fix"><h4>Что сделать</h4><ul>${it.fix.map(f => `<li>${esc(f)}</li>`).join("")}</ul>
              <div class="item__check"><b>Готово, когда:</b> ${esc(it.check)}</div></div>
            <div class="item__why"><h4>Почему это важно</h4><p>${esc(it.why)}</p>
              ${it.code ? `<p class="item__code"><b>В коде:</b> ${esc(it.code)}</p>` : ""}</div>
          </div>
          <div class="item__foot"><span>Объём: <b>${it.size}</b></span><span>Кто: <b>${esc(it.role)}</b></span><span>Когда обсуждали: ${it.times.map(t => `<span class="num">${esc(t)}</span>`).join(", ")}</span>${it.screen && !it.screen.startsWith("econ") ? `<a href="screens.html#${it.screen}">Макет экрана</a>` : ""}${it.screen && it.screen.startsWith("econ") ? `<a href="economy.html#${it.screen.slice(5)}">Расчёт</a>` : ""}</div>
        </div></article>`;
    }
    function draw() {
      let its = D.ITEMS.filter(it =>
        (!state.sys.size || state.sys.has(it.sys)) &&
        (!state.p.size || state.p.has(it.p)) &&
        (!state.kind.size || it.kinds.some(k => state.kind.has(k))) &&
        (!state.onlyNew || it.isNew) &&
        (!state.q || (it.id + " " + it.title + " " + it.what + " " + it.fix.join(" ") + " " + (it.quote ? it.quote.text : "")).toLowerCase().includes(state.q)));
      its.sort(state.sort === "pri" ? (a, b) => pOrder[a.p] - pOrder[b.p] || sec(a.t) - sec(b.t) : (a, b) => sec(a.t) - sec(b.t));
      list.innerHTML = its.length ? its.map(card).join("") : `<p class="empty">Под эти фильтры ничего не подходит. <button type="button" class="btn btn--quiet" id="empty-reset">Сбросить фильтры</button></p>`;
      $("#f-count").textContent = `Показано ${its.length} из ${D.ITEMS.length}`;
      const er = $("#empty-reset");
      if (er) er.addEventListener("click", () => { state.sys.clear(); state.p.clear(); state.kind.clear(); state.onlyNew = false; state.q = ""; $("#f-q").value = ""; syncChips(); draw(); });
    }
    draw();
    function jump() {
      const id = decodeURIComponent(location.hash.slice(1));
      if (!byId[id]) return;
      if (!$("#" + id)) { state.sys.clear(); state.p.clear(); state.kind.clear(); state.onlyNew = false; state.q = ""; syncChips(); draw(); }
      const n = $("#" + id);
      n.scrollIntoView({ behavior: "auto", block: "start" });
      n.classList.remove("is-flash"); void n.offsetWidth; n.classList.add("is-flash");
    }
    addEventListener("hashchange", jump);
    if (location.hash) setTimeout(jump, 60);
  }

  /* =========================================================
     ЭКОНОМИКА: графики
     ========================================================= */
  function axes(svg, o) {
    const { x0, y0, w, h, yMax, yTicks, yFmt } = o;
    yTicks.forEach(v => {
      const y = y0 + h - (v / yMax) * h;
      el("line", { x1: x0, x2: x0 + w, y1: y, y2: y, stroke: v ? "#DCE0D5" : "#1D2A21", "stroke-width": v ? 1 : 1.5 }, svg);
      txt(svg, x0 - 8, y + 4, yFmt ? yFmt(v) : fmt(v), { "text-anchor": "end", "font-size": 12.5, fill: "#5E6C62" });
    });
  }
  function bars(host, opt) {
    const W = opt.W || 560, H = opt.H || 300, x0 = 54, y0 = 16, w = W - x0 - 10, h = H - y0 - 44;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": opt.label });
    axes(svg, { x0, y0, w, h, yMax: opt.yMax, yTicks: opt.yTicks, yFmt: opt.yFmt });
    const n = opt.data.length, slot = w / n, bw = Math.min(54, slot * 0.62);
    const nodes = opt.data.map((d, i) => {
      const x = x0 + slot * i + (slot - bw) / 2;
      const bh = (d.v / opt.yMax) * h;
      const g = el("g", { class: "mark", tabindex: 0, role: "button", "aria-label": `${d.x}: ${d.tip || fmt(d.v)}` }, svg);
      const r = Math.min(4, bh / 2);
      el("path", { class: "mark__shape", d: bh > 0 ? `M${x} ${y0 + h} V${y0 + h - bh + r} Q${x} ${y0 + h - bh} ${x + r} ${y0 + h - bh} H${x + bw - r} Q${x + bw} ${y0 + h - bh} ${x + bw} ${y0 + h - bh + r} V${y0 + h} Z` : `M${x} ${y0 + h} h${bw}`, fill: d.hl ? opt.hl || "#1D2A21" : opt.color || "#9AA697" }, g);
      el("rect", { x: x - 4, y: y0, width: bw + 8, height: h, fill: "transparent" }, g);
      txt(svg, x + bw / 2, y0 + h + 18, d.x, { "text-anchor": "middle", "font-size": 13, fill: "#46564A", "font-weight": d.hl ? 800 : 500 });
      if (d.hl || opt.labelAll) txt(svg, x + bw / 2, y0 + h - bh - 7, d.label || fmt(d.v), { "text-anchor": "middle", "font-size": 13.5, "font-weight": 800, fill: "#1D2A21" });
      bindTip(g, () => `<b>${esc(d.x)}</b>${esc(d.tip || fmt(d.v))}`);
      return g;
    });
    if (opt.xTitle) txt(svg, x0 + w / 2, H - 4, opt.xTitle, { "text-anchor": "middle", "font-size": 13, fill: "#5E6C62" });
    host.innerHTML = "";
    host.appendChild(svg);
    return nodes;
  }

  function econWorkers() {
    const host = $("#ch-workers"), inp = $("#in-workers"), out = $("#out-workers");
    const rate = 72;
    const mult = w => (w === 0 ? 0 : 1 + 0.5 * (w - 1));
    function draw() {
      const w = +inp.value;
      out.value = w;
      bars(host, {
        label: "Выпуск завода в зависимости от числа рабочих", yMax: 300, yTicks: [0, 100, 200, 300],
        data: [0, 1, 2, 3, 4, 5].map(k => ({ x: String(k), v: rate * mult(k), hl: k === w, label: `${fmt(rate * mult(k))}/мин`, tip: `${k} раб.: ×${fmt(mult(k))} → ${fmt(rate * mult(k))} Gear/мин` })),
        xTitle: "рабочих на заводе", hl: "#14866F",
      });
      $("#ro-workers").innerHTML = `<div><b>${fmt(rate * mult(w))}</b><span>Gear в минуту</span></div><div><b>×${fmt(mult(w))}</b><span>множитель</span></div><div><b>${w ? fmt(rate * mult(w) - rate * mult(w - 1)) : "0"}</b><span>прибавка от последнего</span></div>`;
    }
    inp.addEventListener("input", draw);
    draw();
  }

  function econDrivers() {
    const inp = $("#in-drivers"), out = $("#out-drivers");
    const cost = d => 250 * Math.pow(2, d - 1), xp = d => 20 * Math.pow(1.5, d - 1);
    function draw() {
      const d = +inp.value;
      out.value = d;
      const data = f => [1, 2, 3, 4, 5].map(k => Object.assign({ x: String(k), hl: k === d }, f(k)));
      bars($("#ch-cost"), { W: 280, H: 250, label: "Цена рейса в топливе", yMax: 4000, yTicks: [0, 2000, 4000], yFmt: v => v ? `${v / 1000} тыс.` : "0",
        data: data(k => ({ v: cost(k), label: fmt(cost(k)), tip: `${k} вод.: ${fmt(cost(k))} Fuel` })), xTitle: "водителей", hl: "#1D2A21" });
      bars($("#ch-xp"), { W: 280, H: 250, label: "Награда за рейс, XP", yMax: 120, yTicks: [0, 60, 120],
        data: data(k => ({ v: xp(k), label: fmt(Math.round(xp(k) * 10) / 10), tip: `${k} вод.: ${fmt(Math.round(xp(k) * 10) / 10)} XP` })), xTitle: "водителей", hl: "#1D2A21" });
      bars($("#ch-eff"), { W: 560, H: 250, label: "XP за 100 топлива", yMax: 10, yTicks: [0, 4, 8],
        data: data(k => ({ v: (xp(k) / cost(k)) * 100, label: fmt(Math.round(xp(k) / cost(k) * 1000) / 10), tip: `${k} вод.: ${fmt(Math.round(xp(k) / cost(k) * 1000) / 10)} XP за 100 Fuel` })), xTitle: "водителей", hl: "#1D2A21" });
      const eff = xp(d) / cost(d) / (xp(1) / cost(1));
      $("#ro-drivers").innerHTML = `<div><b>${fmt(cost(d))}</b><span>Fuel за рейс</span></div><div><b>${fmt(Math.round(xp(d) * 10) / 10)}</b><span>XP за рейс</span></div><div><b>${d === 1 ? "100%" : "−" + Math.round((1 - eff) * 100) + "%"}</b><span>XP на топливо к 1 вод.</span></div>`;
    }
    inp.addEventListener("input", draw);
    draw();
  }

  function econRebuild() {
    bars($("#ch-rebuild"), {
      label: "Цена восстановления завода базы 1 по уровню базы", yMax: 3000, yTicks: [0, 1000, 2000, 3000], yFmt: v => fmt(v),
      data: [1, 2, 3].map(l => { const v = Math.max(150, 150 * (l - 1) * 10); return { x: `ур. ${l}`, v, hl: l > 1, label: `${fmt(v)} Gear`, tip: `Уровень базы ${l}: ×${l === 1 ? 1 : (l - 1) * 10} → ${fmt(v)} Gear` }; }),
      xTitle: "уровень базы", hl: "#C93F2F", labelAll: true,
    });
  }

  function econRank() {
    const ins = $$("#rank-in input"), host = $("#ch-rank");
    const th = r => 5 * r - 2; // 3, 8, 13…
    function draw() {
      const sum = ins.reduce((a, i) => a + (+i.value || 0), 0);
      let rank = 0; while (sum >= th(rank + 1)) rank++;
      const next = th(rank + 1);
      const W = 560, H = 230, x0 = 40, y0 = 34, w = W - x0 - 14, h = H - y0 - 46, maxS = 24;
      const X = s => x0 + (s / maxS) * w;
      const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": `Сумма уровней баз ${sum}, звание ${rank}` });
      for (let r = 0; r <= 4; r++) {
        const y = y0 + h - (r / 4) * h;
        el("line", { x1: x0, x2: x0 + w, y1: y, y2: y, stroke: r ? "#DCE0D5" : "#1D2A21", "stroke-width": r ? 1 : 1.5 }, svg);
        txt(svg, x0 - 8, y + 4, String(r), { "text-anchor": "end", "font-size": 12.5, fill: "#5E6C62" });
      }
      let d = `M${X(0)} ${y0 + h}`;
      for (let r = 1; r <= 4; r++) { d += ` H${X(th(r))} V${y0 + h - (r / 4) * h}`; }
      d += ` H${X(maxS)}`;
      el("path", { d, fill: "none", stroke: "#1D2A21", "stroke-width": 2 }, svg);
      for (let r = 1; r <= 4; r++) {
        el("circle", { cx: X(th(r)), cy: y0 + h - (r / 4) * h, r: 4, fill: "#1D2A21" }, svg);
        txt(svg, X(th(r)), y0 + h + 18, String(th(r)), { "text-anchor": "middle", "font-size": 12.5, fill: "#46564A", "font-weight": 650 });
      }
      const cx = X(Math.min(sum, maxS)), cy = y0 + h - (rank / 4) * h;
      el("line", { x1: cx, x2: cx, y1: y0, y2: y0 + h, stroke: "#14866F", "stroke-width": 2, "stroke-dasharray": "4 3" }, svg);
      el("path", { d: `M${cx} ${cy - 9} L${cx + 9} ${cy} L${cx} ${cy + 9} L${cx - 9} ${cy} Z`, fill: "#F2B51D", stroke: "#1D2A21", "stroke-width": 1.5 }, svg);
      txt(svg, x0 + w / 2, H - 6, "сумма уровней всех баз", { "text-anchor": "middle", "font-size": 13, fill: "#5E6C62" });
      txt(svg, 4, 14, "звание", { "font-size": 12.5, fill: "#5E6C62" });
      host.innerHTML = "";
      host.appendChild(svg);
      $("#ro-rank").innerHTML = `<div><b>${sum}</b><span>сумма уровней</span></div><div><b>${rank}</b><span>звание</span></div><div><b>${next - sum}</b><span>до звания ${rank + 1}</span></div>`;
    }
    ins.forEach(i => i.addEventListener("input", draw));
    draw();
  }

  function econHeat() {
    const host = $("#ch-heat");
    const W = 560, H = 270, x0 = 46, y0 = 16, w = W - x0 - 14, h = H - y0 - 46, T = 40;
    const X = s => x0 + (s / T) * w, Y = v => y0 + h - (v / 100) * h;
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": "Здоровье героя в жаре без лечения: 20 секунд накопления, затем урон растёт на 1% в секунду, смерть примерно на 34-й секунде" });
    axes(svg, { x0, y0, w, h, yMax: 100, yTicks: [0, 50, 100], yFmt: v => v + "%" });
    el("rect", { x: X(0), y: y0, width: X(20) - X(0), height: h, fill: "#F7E8BD", opacity: .6 }, svg);
    txt(svg, X(10), y0 + 18, "накопление жары, 20 с", { "text-anchor": "middle", "font-size": 13, fill: "#7A5500", "font-weight": 650 });
    let hp = 100, d = `M${X(0)} ${Y(100)} H${X(20)}`, n = 0, death = null;
    const pts = [];
    for (let s = 21; s <= T; s++) {
      n++; hp = Math.max(0, hp - n);
      d += ` L${X(s)} ${Y(hp)}`;
      pts.push([s, hp]);
      if (hp === 0 && death === null) death = s;
      if (hp === 0) break;
    }
    el("path", { d, fill: "none", stroke: "#C93F2F", "stroke-width": 2.5 }, svg);
    pts.forEach(([s, v]) => {
      const g = el("g", { class: "mark", tabindex: 0, role: "button", "aria-label": `${s} с: ${v}%` }, svg);
      el("circle", { class: "mark__shape", cx: X(s), cy: Y(v), r: 3.5, fill: "#C93F2F" }, g);
      el("circle", { cx: X(s), cy: Y(v), r: 10, fill: "transparent" }, g);
      bindTip(g, () => `<b>${s}-я секунда</b>здоровье ${v}%, тик −${s - 20}%`);
    });
    if (death) {
      el("line", { x1: X(death), x2: X(death), y1: y0, y2: y0 + h, stroke: "#1D2A21", "stroke-dasharray": "3 3" }, svg);
      txt(svg, X(death) - 8, y0 + 34, `≈${death} с без лечения`, { "font-size": 13.5, "font-weight": 800, fill: "#1D2A21", "text-anchor": "end" });
    }
    [0, 10, 20, 30, 40].forEach(s => txt(svg, X(s), y0 + h + 18, String(s), { "text-anchor": "middle", "font-size": 12.5, fill: "#5E6C62" }));
    txt(svg, x0 + w / 2, H - 4, "секунд в жаре", { "text-anchor": "middle", "font-size": 13, fill: "#5E6C62" });
    host.appendChild(svg);
  }

  /* =========================================================
     ПЛАН: матрица влияние × усилия
     ========================================================= */
  function renderMatrix() {
    const host = $("#matrix");
    const W = 760, H = 560, x0 = 56, y0 = 18, w = W - x0 - 20, h = H - y0 - 56;
    const X = v => x0 + ((v - 0.3) / 5) * w, Y = v => y0 + h - ((v - 0.7) / 5) * h;
    const fixes = D.FIXES.map((f, i) => Object.assign({ n: i + 1 }, f));
    const svg = el("svg", { viewBox: `0 0 ${W} ${H}`, class: "chart", role: "img", "aria-label": "Матрица правок: влияние на понимание игры по вертикали, усилия по горизонтали; номера точек расшифрованы в списках рядом" });
    const mx = X(2.6), my = Y(3);
    el("rect", { x: x0, y: y0, width: mx - x0, height: my - y0, fill: "#D5EAE2", opacity: .55 }, svg);
    el("line", { x1: mx, x2: mx, y1: y0, y2: y0 + h, stroke: "#C6CDBF", "stroke-dasharray": "4 4" }, svg);
    el("line", { x1: x0, x2: x0 + w, y1: my, y2: my, stroke: "#C6CDBF", "stroke-dasharray": "4 4" }, svg);
    txt(svg, x0 + 10, y0 + 20, "Сделать сразу", { "font-size": 15, "font-weight": 800, fill: "#0F6E5A" });
    txt(svg, x0 + w - 10, y0 + 20, "Главные ставки", { "text-anchor": "end", "font-size": 15, "font-weight": 800, fill: "#1D2A21" });
    txt(svg, x0 + 10, y0 + h - 12, "Заодно", { "font-size": 15, "font-weight": 800, fill: "#5E6C62" });
    txt(svg, x0 + w - 10, y0 + h - 12, "Позже, по результату", { "text-anchor": "end", "font-size": 15, "font-weight": 800, fill: "#5E6C62" });
    el("line", { x1: x0, x2: x0 + w, y1: y0 + h, y2: y0 + h, stroke: "#1D2A21", "stroke-width": 1.5 }, svg);
    el("line", { x1: x0, x2: x0, y1: y0, y2: y0 + h, stroke: "#1D2A21", "stroke-width": 1.5 }, svg);
    txt(svg, x0 + w / 2, H - 14, "усилия: от правки строки до новой системы →", { "text-anchor": "middle", "font-size": 13.5, fill: "#46564A" });
    txt(svg, 18, y0 + h / 2, "влияние на понимание игры →", { "text-anchor": "middle", "font-size": 13.5, fill: "#46564A", transform: `rotate(-90 18 ${y0 + h / 2})` });
    // раздвинуть совпадающие точки
    const pos = fixes.map(f => ({ f, x: X(f.effort), y: Y(f.impact) }));
    for (let it = 0; it < 40; it++) {
      for (let i = 0; i < pos.length; i++) for (let j = i + 1; j < pos.length; j++) {
        const a = pos[i], b = pos[j], dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.01;
        if (d < 25) { const k = (25 - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; b.x += dx * k; b.y += dy * k; }
      }
    }
    pos.forEach(({ f, x, y }) => {
      const g = el("g", { class: "mark", tabindex: 0, role: "button", "aria-label": `${f.n}. ${f.name}: влияние ${f.impact}, усилия ${f.effort}` }, svg);
      if (f.wave === 0) el("rect", { class: "mark__shape", x: x - 11, y: y - 11, width: 22, height: 22, rx: 3, fill: "#8E1F16", stroke: "#fff", "stroke-width": 1.5 }, g);
      else el("circle", { class: "mark__shape", cx: x, cy: y, r: 11.5, fill: f.impact >= 3 ? "#1D2A21" : "#7F8C7E", stroke: "#fff", "stroke-width": 1.5 }, g);
      txt(g, x, y + 4.5, String(f.n), { "text-anchor": "middle", "font-size": 12.5, "font-weight": 800, fill: "#fff" });
      el("circle", { cx: x, cy: y, r: 16, fill: "transparent" }, g);
      bindTip(g, () => `<div class="tip__meta"><span>${f.size}</span><span>${esc(f.role)}</span></div><b>${f.n}. ${esc(f.name)}</b>${f.items.length ? "Закрывает: " + f.items.map(i => `<a href="problems.html#${i}" style="margin:0 4px 0 0;display:inline">${i}</a>`).join(" ") : "Тексты в префабах Turret Base Panel и Mine Base Panel"}`);
    });
    host.appendChild(svg);
    const li = f => `<li><b>${f.n}</b><span>${esc(f.name)} <span class="muted">${f.size}</span></span></li>`;
    const by = (a, b) => b.impact - a.impact;
    $("#q-now").innerHTML = fixes.filter(f => f.impact >= 3 && f.effort < 2.6).sort(by).map(li).join("");
    $("#q-big").innerHTML = fixes.filter(f => f.impact >= 3 && f.effort >= 2.6).sort(by).map(li).join("");
    $("#q-rest").innerHTML = fixes.filter(f => f.impact < 3).sort(by).map(li).join("");
  }

  function renderWaves() {
    const host = $("#waves");
    host.innerHTML = D.WAVES.map(wv => {
      const tasks = D.FIXES.filter(f => f.wave === wv.n);
      const extra = wv.n === 0 ? `<span class="task"><span class="sz sz--M">M</span>Одна рабочая сборка<small>правила и UI-патч вместе</small></span>` : "";
      return `<div class="wave"><div><h3>Волна ${wv.n}. ${esc(wv.name)}</h3><p class="when">${esc(wv.when)}</p></div>
        <div><p class="note" style="margin-bottom:12px">${esc(wv.note)}</p><div class="tasks">${extra}${tasks.map(f => `<a class="task" href="${f.items.length ? "problems.html#" + f.items[0] : (f.link || "index.html#blockers")}"><span class="sz sz--${f.size}">${f.size}</span>${esc(f.name)}<small>${esc(f.role)}${f.items.length ? ", " + f.items.join(" ") : ""}</small></a>`).join("")}</div></div></div>`;
    }).join("");
  }

  /* ---------- экраны: переключатель на телефоне ---------- */
  function renderScreens() {
    $$(".toggle").forEach(t => t.addEventListener("click", e => {
      const b = e.target.closest("button");
      if (!b) return;
      const phones = t.nextElementSibling;
      phones.dataset.show = b.dataset.show;
      $$("button", t).forEach(x => x.setAttribute("aria-pressed", x === b));
    }));
  }

  /* ---------- запуск по странице ---------- */
  if (page === "overview") {
    renderStrip($("#strip"));
    renderLoop($("#loop"));
  }
  if (page === "problems") renderCatalog();
  if (page === "economy") { econWorkers(); econDrivers(); econRebuild(); econRank(); econHeat(); }
  if (page === "plan") { renderMatrix(); renderWaves(); }
  if (page === "screens") renderScreens();
})();
