// Прокрутка списка жестом и «тап или протяжка» (spec scroll-list v1, этап 6.10).
// Порядок: события кадра (press/move/release, 0 и больше) → frame(hitTest).
// Числа (делитель, предел, период повтора) приходят параметрами.

export function makeScrollList({ divisor, maxScroll, repeatEvery, scroll = 0 }) {
  const clamp = (s) => Math.min(Math.max(s, 0), maxScroll);
  let s = clamp(Math.trunc(scroll));
  let held = false;
  let anchorY = 0; // A — gy нажатия
  let x = 0;
  let y = 0; // последняя известная координата пальца
  let v = 0;
  let c = 0; // счётчик удержания
  let pressed = null; // нажатие этого кадра: { x, y }
  let released = false;

  const cell = (n) => Math.floor(n); // input-layout п. 3: дробная часть отбрасывается

  return {
    press(px, py) {
      x = cell(px);
      y = cell(py);
      anchorY = y;
      held = true;
      v = 0;
      c = 0;
      pressed = { x, y };
      released = false;
    },
    move(px, py) {
      x = cell(px);
      y = cell(py);
    },
    release(px, py) {
      x = cell(px);
      y = cell(py);
      released = true;
    },
    frame(hitTest) {
      const hit = (hx, hy) => (hitTest ? !!hitTest(hx, hy, s) : false);
      let tap = false;
      let repeat = false;
      if (pressed !== null) {
        // правило 6: действие кнопки — в кадре нажатия, по точке нажатия
        tap = hit(pressed.x, pressed.y);
        c = 1;
      }
      if (held && !released) {
        // правило 4: скорость — от расстояния до точки нажатия
        v = (y - anchorY) / divisor;
        s = clamp(s - Math.round(v));
        if (pressed === null) {
          c += 1;
          // правило 7: повтор по текущему gy и текущему s
          if (c >= repeatEvery) {
            c = 0;
            repeat = hit(x, y);
          }
        }
      }
      if (released) {
        held = false;
        c = 0;
      }
      pressed = null;
      released = false;
      return { scroll: s, speed: v, tap, repeat };
    },
    get scroll() {
      return s;
    },
    set scroll(value) {
      s = clamp(Math.trunc(value));
    },
    get speed() {
      return v;
    },
    get held() {
      return held;
    },
  };
}
