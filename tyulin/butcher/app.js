const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

function countUp(element) {
  const target = Number(element.dataset.count);
  if (reduceMotion) {
    element.textContent = target.toLocaleString("ru-RU") + (target >= 1000 ? "+" : "");
    return;
  }
  const started = performance.now();
  const duration = 1400;
  function frame(now) {
    const progress = Math.min(1, (now - started) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.round(target * eased);
    element.textContent = value.toLocaleString("ru-RU") + (progress === 1 && target >= 1000 ? "+" : "");
    if (progress < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

const observer = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-visible");
      for (const counter of entry.target.querySelectorAll("[data-count]")) countUp(counter);
      observer.unobserve(entry.target);
    }
  },
  { threshold: 0.2 },
);

for (const element of document.querySelectorAll(".reveal")) observer.observe(element);
