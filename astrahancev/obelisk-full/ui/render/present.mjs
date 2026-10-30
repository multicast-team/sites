// Вывод кадра игры на экран браузера (этап 3.10, слой L2 plan.md §3.2).
//
// Решение 3.10: игра рисует кадр в свой программный буфер RGBA (тот же растр, что R: модель llvmpipe, unorm8),
// а на Canvas кладёт его как есть — ImageData + putImageData, без drawImage, без сглаживания, без масштаба внутри canvas.
// Почему не Canvas2D drawImage и не WebGL — замеры в build/full/stages/3.10/stage.md.
//
// Правила вывода (каждое проверено в 3.10):
//   1. Размер буфера canvas = размер кадра (500×960 или 1000×1920). Масштаб окна — только CSS с image-rendering: pixelated:
//      toDataURL и то, что видит игрок, берутся из буфера, а не из CSS-картинки.
//   2. Альфа кадра принудительно 255. Кадр O — это RGB (glReadPixels, экран Android непрозрачен), а в буфере R альфа бывает < 255
//      (кадр cal35-bombs-312: 8124 px). Chrome 149 на холсте alpha:false и без этого кладёт RGB как есть (контроль 3.10: 0 px),
//      но это поведение реализации, а не спецификации: на холсте с альфой браузер премультиплицирует RGB. Правило — страховка.
//   3. Контекст 2d с alpha:false и colorSpace 'srgb': без управления цветом и без смешивания с фоном страницы.
//   4. Кадр кладётся одной операцией putImageData(…, 0, 0) — она не смешивает и не сглаживает.

/** Копия кадра с альфой 255 (правило 2). src — Uint8Array/Uint8ClampedArray RGBA, верхняя строка первой. */
export function opaqueRgba(src, dst = new Uint8ClampedArray(src.length)) {
  if (src.length % 4 !== 0) throw new Error('RGBA: длина не кратна 4');
  dst.set(src);
  for (let i = 3; i < dst.length; i += 4) dst[i] = 255;
  return dst;
}

/** CSS-размер холста под окно: целый или дробный масштаб буфера w×h, без сглаживания (правило 1). */
export function fitStyle(w, h, boxW, boxH) {
  const k = Math.min(boxW / w, boxH / h);
  return { width: `${Math.floor(w * k)}px`, height: `${Math.floor(h * k)}px`, imageRendering: 'pixelated' };
}

/** Презентер: canvas — HTMLCanvasElement или OffscreenCanvas. */
export function createPresenter(canvas, w, h, { forceOpaque = true } = {}) {
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: false, colorSpace: 'srgb', desynchronized: false });
  if (!ctx) throw new Error('нет 2d-контекста');
  ctx.imageSmoothingEnabled = false;
  const img = ctx.createImageData(w, h, { colorSpace: 'srgb' });
  return {
    w, h, ctx, canvas,
    /** Кладёт кадр RGBA (w·h·4 байт, верхняя строка первой) в canvas. */
    present(rgba) {
      if (rgba.length !== w * h * 4) throw new Error(`кадр ${rgba.length} байт, ждали ${w * h * 4}`);
      if (forceOpaque) opaqueRgba(rgba, img.data); else img.data.set(rgba);
      ctx.putImageData(img, 0, 0);
    },
  };
}
