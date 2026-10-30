// Поток полосы параллельного растра в браузере (этап 3.12): new Worker(new URL('./band-worker.mjs', import.meta.url), {type: 'module'}).
import { FrameRaster } from './raster.mjs';
import { bandWorker } from './parallel.mjs';

const handle = bandWorker((m) => self.postMessage(m), FrameRaster);
self.onmessage = (e) => handle(e.data);
