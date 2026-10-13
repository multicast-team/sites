const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = window.matchMedia("(pointer: fine)").matches;
const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

if (!reduceMotion) document.documentElement.classList.add("motion");

for (const row of document.querySelectorAll("[data-split]")) {
  row.innerHTML = [...row.textContent].map((letter) => `<span>${letter}</span>`).join("");
}

/* HUD: toasts, achievements, experience */
const toasts = document.getElementById("toasts");
const hudLevel = document.getElementById("hud-level");
const hudFill = document.getElementById("hud-fill");
const hudXp = document.getElementById("hud-xp");
const hudLoot = document.getElementById("hud-loot");
const MAX_LEVEL = 50;
const MAX_XP = 5000;
const unlocked = new Set();
let bonusXp = 0;
let shownLevel = 1;

function toast(title, detail = "", kind = "") {
  const item = document.createElement("div");
  item.className = kind ? `toast toast--${kind}` : "toast";
  item.textContent = title;
  if (detail) {
    const small = document.createElement("small");
    small.textContent = detail;
    item.append(small);
  }
  toasts.append(item);
  const limit = innerWidth <= 820 ? 2 : 3;
  while (toasts.children.length > limit) toasts.firstElementChild.remove();
  setTimeout(() => {
    item.classList.add("is-leaving");
    item.addEventListener("animationend", () => item.remove(), { once: true });
  }, 2600);
}

function achieve(id, title, detail) {
  if (unlocked.has(id)) return;
  unlocked.add(id);
  toast(`Достижение: ${title}`, detail, "achievement");
}

function addXp(amount) {
  bonusXp += amount;
  updateHud();
}

window.ButcherHud = { toast, achieve, addXp, reduceMotion };

function scrollProgress() {
  const max = document.documentElement.scrollHeight - innerHeight;
  if (max <= 0 || max - scrollY < 2) return 1;
  return clamp(scrollY / max, 0, 1);
}

function updateHud() {
  const xp = Math.min(MAX_XP, Math.round(scrollProgress() * MAX_XP) + bonusXp);
  const level = 1 + Math.floor((xp / MAX_XP) * (MAX_LEVEL - 1));
  hudFill.style.width = `${(xp / MAX_XP) * 100}%`;
  hudXp.textContent = xp.toLocaleString("ru-RU");
  hudLevel.textContent = String(level);
  if (level >= shownLevel + 10) {
    shownLevel = level - (level % 10);
    toast(`УРОВЕНЬ ПОВЫШЕН! УР. ${level}`);
  }
}

/* scene: hero parallax, hanging chain, sliding words, falling loot */
const hero = document.querySelector(".hero");
const art = document.querySelector(".hero__art");
const letters = [...document.querySelectorAll(".title__row span")];
const meathook = document.querySelector(".meathook");
const hangingChain = document.querySelector(".meathook__chain");
const zillions = [...document.querySelectorAll(".zillions__line span")];
const drops = [...document.querySelectorAll(".drop")];

function chainLength() {
  return 90 + scrollProgress() * (innerHeight * 0.55);
}

function updateScene() {
  const heroProgress = clamp(scrollY / hero.offsetHeight, 0, 1);
  hero.style.setProperty("--sy", `${heroProgress * 120}px`);
  hero.style.setProperty("--dy", `${heroProgress * -220}px`);
  art.style.setProperty("--zoom", String(1 + heroProgress * 0.1));
  letters.forEach((letter, index) => {
    const spread = (index - (letters.length - 1) / 2) * heroProgress * 46;
    letter.style.transform = `translate(${spread}px, ${-heroProgress * 70 * ((index % 2) + 1)}px) rotate(${spread / 6}deg)`;
  });
  hangingChain.style.height = `${chainLength()}px`;
  zillions.forEach((word, index) => {
    const t = clamp((innerHeight - word.getBoundingClientRect().top) / innerHeight, 0, 1);
    word.style.setProperty("--slide", `${(1 - t) * (index === 0 ? -40 : 40)}vw`);
  });
  drops.forEach((drop, index) => {
    const t = clamp((innerHeight - drop.getBoundingClientRect().top - index * 30) / (innerHeight * 0.45), 0, 1);
    drop.style.setProperty("--fall", `${(1 - t) * -60}px`);
  });
  updateBar();
}

/* Miss Pudge: a hook from off-frame drags her in with the scroll, her line follows the scroll position, a click gets a bonus line */
const bar = document.querySelector(".bar");
const pudge = document.getElementById("pudge");
const pudgeLine = document.getElementById("pudge-line");
const SCROLL_LINES = [
  "Привет, сладкий. Руки вымыл?",
  "Крюк оставь у входа. Ладно, бери с собой.",
  "Первая кружка за счёт заведения. Остальные за счёт монстров.",
  "Мясник у нас постоянный клиент. Ест за троих. Буквально.",
  "Магазины ниже. Скажи, что от Мисс Пудж, скидки не будет.",
];
const CLICK_LINES = [
  "Ой, щекотно! Швы разойдутся.",
  "Ещё раз ткнёшь, пойдёшь мыть кружки.",
  "Маску не снимает даже передо мной. Романтик.",
  "Меня шили с любовью. И степлером.",
];
let lineIndex = "";
let clicks = 0;

function sayLine(text) {
  pudgeLine.textContent = text;
  pudgeLine.classList.remove("is-new");
  void pudgeLine.offsetWidth;
  pudgeLine.classList.add("is-new");
}

const barChain = document.querySelector(".bar__chain");
const hookedPose = document.querySelector(".bar__pose--hooked");
const HOOKED_BOW = { x: 0.27, y: 0.361 };
const HOOKED_LINES = { left: "Эй! Пудж, отпусти! Платье помнёшь!", right: "Куда?! Я же только пиво налила!" };
let barSide = "left";
let barAttached = false;
let barSnap = null;
let lastBarScroll = scrollY;
const BAR_SNAP_MS = 320;

function setBarChain(attached, side) {
  if (attached === barAttached && side === barSide) return;
  barAttached = attached;
  if (attached) {
    barSide = side;
    barChain.classList.toggle("is-right", side === "right");
    pudge.dataset.side = side;
    barChain.hidden = false;
  }
  barSnap = { start: performance.now(), attaching: attached };
  requestAnimationFrame(tickBarSnap);
}

function barChainFactor() {
  if (!barSnap) return barAttached ? 1 : 0;
  const t = Math.min(1, (performance.now() - barSnap.start) / BAR_SNAP_MS);
  if (t < 1) return barSnap.attaching ? ease(t) : 1 - ease(t);
  barSnap = null;
  if (!barAttached) barChain.hidden = true;
  return barAttached ? 1 : 0;
}

function tickBarSnap() {
  updateBar();
  if (barSnap) requestAnimationFrame(tickBarSnap);
}
function barChainReach(shift) {
  const poseLeft = pudge.offsetLeft + shift + hookedPose.offsetLeft;
  const bowFromLeft = hookedPose.offsetWidth * HOOKED_BOW.x;
  if (barSide === "right") return bar.clientWidth - (poseLeft + hookedPose.offsetWidth - bowFromLeft);
  return poseLeft + bowFromLeft;
}

function updateBar() {
  const rect = bar.getBoundingClientRect();
  const hostTop = rect.top + pudge.offsetTop;
  const enter = clamp((innerHeight - hostTop) / (innerHeight * 0.95), 0, 1);
  const moved = scrollY - lastBarScroll;
  lastBarScroll = scrollY;
  const drag = seg(enter, 0.12, 0.86);
  const offscreen = bar.clientWidth - pudge.offsetLeft + 40;
  const shift = offscreen * (1 - easeInOut(drag));
  bar.style.setProperty("--enter", `${shift}px`);
  bar.style.setProperty("--glow", String(rect.top > innerHeight * 0.7 ? 0.25 : 1));

  const attached = enter >= 0.06 && enter < 0.9;
  let side = barSide;
  if (moved < 0) side = "right";
  if (moved > 0) side = "left";
  if (!attached) side = barSide;
  setBarChain(attached, side);
  barChain.style.width = `${Math.max(0, barChainReach(shift)) * barChainFactor()}px`;
  barChain.style.top = `${pudge.offsetTop + hookedPose.offsetTop + hookedPose.offsetHeight * HOOKED_BOW.y}px`;  pudge.dataset.pose = attached ? "hooked" : "rest";

  const through = clamp((innerHeight * 0.6 - rect.top) / Math.max(1, rect.height), 0, 0.999);
  const line = attached ? HOOKED_LINES[barSide] : SCROLL_LINES[Math.floor(through * SCROLL_LINES.length)];
  if (line === lineIndex) return;
  lineIndex = line;
  sayLine(line);
}
function seg(value, from, to) {
  return clamp((value - from) / (to - from), 0, 1);
}

function ease(t) {
  return 1 - Math.pow(1 - t, 3);
}

function easeInOut(t) {
  return t * t * (3 - 2 * t);
}
pudge.addEventListener("click", () => {
  sayLine(CLICK_LINES[clicks % CLICK_LINES.length]);
  clicks += 1;
  pudge.classList.remove("is-winking");
  void pudge.offsetWidth;
  pudge.classList.add("is-winking");
  if (clicks === 3) {
    addXp(30);
    achieve("regular", "Завсегдатай", "Мисс Пудж запомнила твоё имя. Это плохо.");
  }
});

/* a little butcher runs in, hooks the block on two chains and drags it into place; scrolling back above lets it slide away again */
const blocks = [...document.querySelectorAll(".drag")];
const SHEETS = { run: "img/butcher-run-sheet.png", pull: "img/butcher-pull-sheet.png" };

blocks.forEach((block, index) => {
  if (index % 2 === 1) block.dataset.side = "right";
  const puller = document.createElement("div");
  puller.className = "puller";
  puller.setAttribute("aria-hidden", "true");
  puller.dataset.pose = "run";
  puller.innerHTML = `<span class="puller__guy"><span class="puller__sheet puller__sheet--run"><img src="${SHEETS.run}" alt=""></span><span class="puller__sheet puller__sheet--pull"><img src="${SHEETS.pull}" alt=""></span></span><span class="puller__chains"><i class="puller__chain"></i><i class="puller__chain"></i></span>`;
  block.append(puller);
});

function resetBlock(block) {
  block.classList.remove("hit");
  block.classList.add("is-waiting");
}

function placeBlock(block) {
  block.classList.remove("is-waiting");
  block.classList.add("hit");
}

function animateAll(elements, keyframes, options) {
  return Promise.all(elements.map((element) => element.animate(keyframes, options).finished));
}

function distanceToEdge(block) {
  const rect = block.getBoundingClientRect();
  if (block.dataset.side === "right") return innerWidth - rect.right + 40;
  return rect.left + 40;
}

async function hookBlock(block) {
  const puller = block.querySelector(".puller");
  const guy = puller.querySelector(".puller__guy");
  const chains = [...puller.querySelectorAll(".puller__chain")];
  const reach = puller.querySelector(".puller__chains").offsetWidth;
  const offscreen = -distanceToEdge(block);
  block.classList.add("is-pulling");

  puller.dataset.pose = "run";
  puller.classList.add("is-on", "is-running");
  puller.classList.remove("is-leaving");
  await puller.animate([{ transform: `translateX(${offscreen}px)` }, { transform: "none" }], { duration: 560, easing: "cubic-bezier(.3, .3, .6, 1)" }).finished;

  puller.classList.remove("is-running");
  puller.dataset.pose = "pull";
  await animateAll(chains, [{ width: "0px" }, { width: `${reach}px` }], { duration: 180, easing: "ease-out", fill: "forwards" });
  block.classList.add("hit");

  puller.classList.add("is-heaving");
  const strain = guy.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(-6deg) translateX(-6px)" }, { transform: "rotate(-2deg)" }], { duration: 760, easing: "ease-in-out" });
  const pull = block.animate(
    [{ transform: getComputedStyle(block).transform }, { transform: "none" }],
    { duration: 760, easing: "cubic-bezier(.6, 0, .25, 1.15)", fill: "forwards" },
  );
  await Promise.all([pull.finished, strain.finished]);
  block.classList.remove("is-waiting");
  pull.cancel();
  puller.classList.remove("is-heaving");

  await animateAll(chains, [{ width: `${reach}px` }, { width: "0px" }], { duration: 160, easing: "ease-in", fill: "forwards" });
  puller.dataset.pose = "run";
  puller.classList.add("is-running", "is-leaving");
  const exit = -distanceToEdge(block);
  await puller.animate([{ transform: "none" }, { transform: `translateX(${exit}px)` }], { duration: 520, easing: "cubic-bezier(.5, 0, .8, .4)", fill: "forwards" }).finished;
  puller.getAnimations().forEach((animation) => animation.cancel());
  puller.classList.remove("is-on", "is-running", "is-leaving");
  requestAnimationFrame(() => {
    block.classList.remove("is-pulling");
    syncBlocks();
  });
}

function syncBlocks() {
  for (const block of blocks) {
    if (block.classList.contains("is-pulling")) continue;
    const rect = block.getBoundingClientRect();
    const waiting = block.classList.contains("is-waiting");
    if (rect.top > innerHeight * 0.92) {
      if (!waiting) resetBlock(block);
    } else if (rect.bottom < 0) {
      if (waiting) placeBlock(block);
    } else if (waiting && rect.top < innerHeight * 0.78) {
      hookBlock(block);
    }
  }
}

let queued = false;
function frame() {
  queued = false;
  updateHud();
  syncRewards();
  if (reduceMotion) return;
  updateScene();
  syncBlocks();
}
addEventListener("scroll", () => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(frame);
}, { passive: true });
addEventListener("resize", frame);
addEventListener("load", frame);

/* critical hits on the hook picture */
const crit = document.getElementById("crit");
let strikes = 0;
function damage(x, y) {
  strikes += 1;
  const isCrit = strikes % 5 === 0;
  const number = document.createElement("span");
  number.className = isCrit ? "crit__num is-crit" : "crit__num";
  number.textContent = String(isCrit ? 900 + Math.floor(Math.random() * 99) * 10 : 40 + Math.floor(Math.random() * 160));
  number.style.left = `${x}px`;
  number.style.top = `${y}px`;
  crit.append(number);
  number.addEventListener("animationend", () => number.remove());
}
crit.addEventListener("click", (event) => {
  const rect = crit.getBoundingClientRect();
  damage(event.clientX - rect.left, event.clientY - rect.top);
});
let lastStrikeY = 0;
if (!reduceMotion) {
  addEventListener("scroll", () => {
    const rect = crit.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight || Math.abs(scrollY - lastStrikeY) < 80) return;
    lastStrikeY = scrollY;
    damage(rect.width * (0.6 + Math.random() * 0.3), rect.height * (0.3 + Math.random() * 0.4));
  }, { passive: true });
}

/* BAM and level-up badge on the titan, reading to the end */
const hits = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (entry.target.id === "footer") {
      if (!entry.isIntersecting) continue;
      achieve("reader", "Дочитал до конца", "Мясник уважает упорство.");
      continue;
    }
    if (entry.isIntersecting) entry.target.classList.add("hit");
  }
}, { threshold: 0.55 });
if (reduceMotion) hits.observe(document.querySelector(".drag--titan"));
hits.observe(document.getElementById("footer"));

/* loot pickup flies into the HUD; scrolling back above the chest puts everything back */
let looted = 0;
const lootSection = document.querySelector(".loot");
const footer = document.getElementById("footer");

function updateLootCounter() {
  hudLoot.textContent = `ЛУТ ${looted}/${drops.length}`;
}

function syncRewards() {
  if (!reeling && owner.classList.contains("is-on") && scrollProgress() < 0.9) owner.classList.remove("is-on");
  if (scrollProgress() < 0.8) unlocked.delete("reader");
  if (looted === 0 || lootSection.getBoundingClientRect().top <= innerHeight) return;
  addXp(-60 * looted);
  looted = 0;
  for (const drop of drops) drop.classList.remove("is-taken");
  unlocked.delete("greedy");
  updateLootCounter();
}
for (const drop of drops) {
  drop.addEventListener("click", () => {
    if (drop.classList.contains("is-taken")) return;
    drop.classList.add("is-taken");
    looted += 1;
    const from = drop.getBoundingClientRect();
    const to = hudLoot.getBoundingClientRect();
    const name = drop.querySelector("h3").textContent;
    if (!reduceMotion) {
      const flyer = document.createElement("div");
      flyer.className = "loot-fly";
      flyer.style.setProperty("--rarity", drop.style.getPropertyValue("--rarity"));
      flyer.textContent = name;
      flyer.style.left = `${from.left}px`;
      flyer.style.top = `${from.top}px`;
      document.body.append(flyer);
      flyer.animate(
        [
          { transform: "translate(0, 0) scale(1)" },
          { transform: `translate(${(to.left - from.left) / 2}px, ${(to.top - from.top) / 2 - 120}px) scale(1.1) rotate(-8deg)` },
          { transform: `translate(${to.left - from.left}px, ${to.top - from.top}px) scale(.3)`, opacity: 0.2 },
        ],
        { duration: 700, easing: "cubic-bezier(.4, 0, .6, 1)" },
      ).finished.then(() => flyer.remove());
    }
    setTimeout(() => {
      updateLootCounter();
      hudLoot.classList.remove("is-bumped");
      void hudLoot.offsetWidth;
      hudLoot.classList.add("is-bumped");
    }, reduceMotion ? 0 : 650);
    addXp(60);
    toast(`Подобрано: ${name}`, drop.querySelector("p").textContent);
    if (looted === drops.length) achieve("greedy", "Жадина", "Собрал весь лут. Мясник бы тоже так сделал.");
  });
}

/* scrambled headings */
const GLYPHS = "АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЩЭЮЯ#%!?";
function scramble(element) {
  const target = element.textContent;
  let tick = 0;
  const total = 18;
  const step = () => {
    tick += 1;
    element.textContent = [...target]
      .map((letter, index) => (letter === " " || index < (tick / total) * target.length ? letter : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]))
      .join("");
    if (tick < total) requestAnimationFrame(step);
    else element.textContent = target;
  };
  requestAnimationFrame(step);
}
if (!reduceMotion) {
  const scrambler = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      scrambler.unobserve(entry.target);
      scramble(entry.target);
    }
  }, { threshold: 0.8 });
  for (const heading of document.querySelectorAll("[data-scramble]")) scrambler.observe(heading);
}

/* pointer: hero parallax, loot tilt, magnetic buttons */
if (finePointer && !reduceMotion) {
  hero.addEventListener("pointermove", (event) => {
    hero.style.setProperty("--mx", `${(event.clientX / innerWidth - 0.5) * -24}px`);
    hero.style.setProperty("--my", `${(event.clientY / innerHeight - 0.5) * -16}px`);
  });

  for (const card of document.querySelectorAll(".tilt")) {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      card.style.setProperty("--ry", `${(x - 0.5) * 18}deg`);
      card.style.setProperty("--rx", `${(0.5 - y) * 14}deg`);
      card.style.setProperty("--gx", `${x * 100}%`);
      card.style.setProperty("--gy", `${y * 100}%`);
      card.style.setProperty("--glare", "1");
    });
    card.addEventListener("pointerleave", () => {
      for (const name of ["--rx", "--ry", "--glare"]) card.style.removeProperty(name);
    });
  }

  for (const button of document.querySelectorAll(".magnetic")) {
    button.addEventListener("pointermove", (event) => {
      const rect = button.getBoundingClientRect();
      button.style.setProperty("--bx", `${(event.clientX - rect.left - rect.width / 2) * 0.25}px`);
      button.style.setProperty("--by", `${(event.clientY - rect.top - rect.height / 2) * 0.35}px`);
    });
    button.addEventListener("pointerleave", () => {
      button.style.removeProperty("--bx");
      button.style.removeProperty("--by");
    });
  }
}

/* easter egg: type the meat-hook hero's name */
const SECRET_WORDS = ["пудж", "pudge"];
let typed = "";
addEventListener("keydown", (event) => {
  if (event.key.length !== 1) return;
  typed = (typed + event.key.toLowerCase()).slice(-8);
  if (!SECRET_WORDS.some((word) => typed.endsWith(word))) return;
  typed = "";
  achieve("secret", "Свежее мясо!", "Крюк перебросил всё, что видно на экране.");
  if (reduceMotion) return;
  for (const block of document.querySelectorAll(".drag")) {
    const rect = block.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > innerHeight || block.classList.contains("is-pulling")) continue;
    resetBlock(block);
    hookBlock(block);
  }
});

/* the rail hook can be pulled to scroll; pulling it all the way down summons its owner, who reels it (and the page) back up */
const iron = document.querySelector(".meathook__iron");
const owner = document.getElementById("owner");
const ownerShout = owner.querySelector(".owner__shout");
const ownerLine = owner.querySelector(".owner__line");
const OWNER_ANGRY = ["ОТДАЙ, ЭТО МОЙ!", "КУПИ СЕБЕ САМ!"];
const OWNER_TIRED = ["ДА СКОЛЬКО Ж МОЖНО!", "ОПЯТЬ СМАТЫВАТЬ ЭТУ ЖЕЛЕЗЯКУ!"];
const OWNER_BUSY = ["ОТДАЙ!", "А ТО КИШКИ ВЫПОТРОШУ!"];
const REEL_DURATION = 2200;
const MAX_DRAG_RATIO = { mouse: 8, touch: 2.5 };
let held = null;
let reeling = false;

function maxScroll() {
  return document.documentElement.scrollHeight - innerHeight;
}

function setOwnerLine(lines) {
  ownerLine.replaceChildren(lines[0], document.createElement("br"), lines[1]);
}

function summonOwner() {
  if (owner.classList.contains("is-on")) return;
  setOwnerLine(OWNER_ANGRY);
  owner.classList.add("is-on");
  achieve("thief", "Чужой крюк", "Хозяин заметил. Лучше купи свой.");
}

function reelBack() {
  reeling = true;
  setOwnerLine(held ? OWNER_BUSY : OWNER_TIRED);
  owner.classList.add("is-reeling");
  meathook.classList.add("is-reeling");
  const distance = scrollY;
  let progress = 0;
  let last = performance.now();
  const step = (now) => {
    const elapsed = now - last;
    last = now;
    if (held || bill.open) {
      requestAnimationFrame(step);
      return;
    }
    const next = Math.min(1, progress + elapsed / REEL_DURATION);
    const pull = distance * (easeInOut(next) - easeInOut(progress));
    progress = next;
    window.scrollTo({ top: Math.max(0, scrollY - pull), behavior: "instant" });
    if (progress < 1 && scrollY > 0) {
      requestAnimationFrame(step);
      return;
    }
    window.scrollTo({ top: 0, behavior: "instant" });
    reeling = false;
    owner.classList.remove("is-on", "is-reeling");
    meathook.classList.remove("is-reeling");
  };
  requestAnimationFrame(step);
}
function releaseHook() {
  held = null;
  meathook.classList.remove("is-held");
  if (reeling) setOwnerLine(OWNER_TIRED);
}

ownerShout.addEventListener("animationend", (event) => {
  if (event.animationName === "shout" && !reeling) reelBack();
});

iron.addEventListener("pointerdown", (event) => {
  if (reeling) setOwnerLine(OWNER_BUSY);
  held = { y: event.clientY, scroll: scrollY, maxRatio: event.pointerType === "mouse" ? MAX_DRAG_RATIO.mouse : MAX_DRAG_RATIO.touch };
  iron.setPointerCapture(event.pointerId);
  meathook.classList.add("is-held");
  event.preventDefault();
});
iron.addEventListener("pointermove", (event) => {
  if (!held) return;
  const ratio = Math.min(held.maxRatio, maxScroll() / (innerHeight * 0.55));
  const top = clamp(held.scroll + (event.clientY - held.y) * ratio, 0, maxScroll());
  window.scrollTo({ top, behavior: "instant" });
  if (top >= maxScroll() - 2) summonOwner();
});
iron.addEventListener("pointerup", releaseHook);
iron.addEventListener("pointercancel", releaseHook);

/* Miss Pudge brings the bill; the page stays put while it is open */
const bill = document.getElementById("bill");
bill.addEventListener("close", () => document.documentElement.classList.remove("is-locked"));
for (const trigger of document.querySelectorAll("[data-bill]")) {
  trigger.addEventListener("click", (event) => {
    event.preventDefault();
    bill.showModal();
    document.documentElement.classList.add("is-locked");
    achieve("bill", "Счёт, пожалуйста", "Мисс Пудж посчитала даже швы.");
  });
}

frame();
if (!reduceMotion) requestAnimationFrame(() => { hangingChain.style.height = `${chainLength()}px`; });
