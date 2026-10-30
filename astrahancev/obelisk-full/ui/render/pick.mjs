// Выбор игрового растра (этап 3.12, раунд исправлений 2). Без Node и DOM (Worker и флаги берутся из env = globalThis).
//
//   createRaster(W, H, {threads, cache, env, makePort}) → {kind, raster, why}
//     kind 'parallel' — ParallelRaster (n потоков-полос): только если threads > 1 И страница изолирована (crossOriginIsolated:
//                       заголовки COOP same-origin + COEP require-corp) И есть SharedArrayBuffer, Atomics, Worker;
//     kind 'cached'   — FrameRaster за кэшем кадра LayerCache (по умолчанию; работает на любой странице, без общей памяти);
//     kind 'single'   — FrameRaster без кэша (cache: false).
//   Нет изоляции, а просили потоки — откат на 'cached' (why — почему), рендер не ломается.
//   У всех трёх видов те же методы растра; кадр: вызовы → await raster.finish() → raster.readFrame().
//
// Требование к выкладке (этап «Публикация»): для параллельного растра сервер страницы отдаёт
//   Cross-Origin-Opener-Policy: same-origin
//   Cross-Origin-Embedder-Policy: require-corp
// (и Cross-Origin-Resource-Policy: same-origin у своих ресурсов). Без них — однопоточный растр с кэшем.
import { FrameRaster } from './raster.mjs';
import { ParallelRaster } from './parallel.mjs';
import { LayerCache } from './layers.mjs';

/** Можно ли общую память и потоки: → {ok, why}. */
export function parallelSupport(env = globalThis) {
  if (!env.crossOriginIsolated) return { ok: false, why: 'страница не изолирована (нет COOP/COEP): crossOriginIsolated = false' };
  if (typeof env.SharedArrayBuffer !== 'function') return { ok: false, why: 'нет SharedArrayBuffer' };
  if (typeof env.Atomics !== 'object' || !env.Atomics) return { ok: false, why: 'нет Atomics' };
  if (typeof env.Worker !== 'function') return { ok: false, why: 'нет Worker' };
  return { ok: true, why: '' };
}

/** Порт потока полосы в браузере (band-worker.mjs). */
export function browserPort(env = globalThis) {
  const w = new env.Worker(new URL('./band-worker.mjs', import.meta.url), { type: 'module' });
  const cbs = [];
  w.onmessage = (e) => { for (const cb of cbs) cb(e.data); };
  return { w, post: (m) => w.postMessage(m), listen: (cb) => cbs.push(cb) };
}

export function createRaster(W, H, opt = {}) {
  const env = opt.env ?? globalThis, threads = opt.threads ?? 0;
  let why = '';
  if (threads > 1) {
    const s = parallelSupport(env);
    if (s.ok) {
      const make = opt.makePort ?? (() => browserPort(env));
      return { kind: 'parallel', raster: new ParallelRaster(W, H, Array.from({ length: threads }, () => make())), why: '' };
    }
    why = `потоки (${threads}) недоступны: ${s.why}; однопоточный растр`;
  }
  const R = new FrameRaster(W, H);
  if (opt.cache === false) return { kind: 'single', raster: R, why };
  return { kind: 'cached', raster: new LayerCache(R), why };
}
