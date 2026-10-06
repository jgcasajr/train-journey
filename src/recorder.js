import { onLangChange, t } from './i18n.js';

// Records the window as a video file (canvas only, no panel), right in the browser.

const MIMES = ['video/mp4;codecs=avc1', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
export const MODES = {
  clip: { seconds: 15, speedup: 1 },
  timelapse: { seconds: 20, speedup: 10 }, // 20 s of video = 200 s of trip
};
const FPS = 30;

/** First video format the browser can record, or null. */
export const pickMime = (isSupported) => MIMES.find((m) => isSupported(m)) ?? null;

/** File name for a recording: kind, km and the right extension for the format. */
export const videoName = (mode, km, mime) => `train-journey-${mode === 'timelapse' ? 'timelapse' : 'video'}-km${km.toFixed(1)}.${mime.startsWith('video/mp4') ? 'mp4' : 'webm'}`;

function element(doc, id) {
  const node = doc.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

function download(doc, blob, name) {
  const url = URL.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}

/**
 * The "Record" button: a 15 s video, or a 20 s timelapse where the trip runs 10× faster.
 * While recording, `speedup()` tells the main loop how many simulation steps to run per frame.
 */
export function createRecorder(doc, { canvas, getKm, onDone, onError }) {
  const ui = {
    button: element(doc, 'record-btn'),
    dialog: element(doc, 'record-dialog'),
    clip: element(doc, 'record-clip'),
    timelapse: element(doc, 'record-timelapse'),
    cancel: element(doc, 'record-cancel'),
    badge: element(doc, 'rec-badge'),
  };
  const supported = typeof MediaRecorder !== 'undefined' && typeof canvas.captureStream === 'function';
  const mime = supported ? pickMime((m) => MediaRecorder.isTypeSupported(m)) : null;
  let run = null; // { mode, start, recorder, chunks }
  const stop = (e) => e.stopPropagation();

  function label() {
    const left = run ? Math.max(0, Math.ceil(MODES[run.mode].seconds - (performance.now() - run.start) / 1000)) : 0;
    const text = run ? `● ${left} s` : t('Gravar');
    if (ui.button.textContent !== text) ui.button.textContent = text;
    ui.badge.textContent = run ? `● REC ${left} s${run.mode === 'timelapse' ? ' · 10×' : ''}` : '';
    ui.badge.classList.toggle('hidden', !run);
    ui.button.setAttribute('aria-pressed', String(Boolean(run)));
  }

  function finish() {
    if (!run) return;
    const { recorder } = run;
    if (recorder.state !== 'inactive') recorder.stop();
    run = null;
    label();
  }

  function start(mode) {
    ui.dialog.classList.add('hidden');
    try {
      const recorder = new MediaRecorder(canvas.captureStream(FPS), { mimeType: mime, videoBitsPerSecond: 6_000_000 });
      const chunks = [];
      const km = getKm();
      recorder.addEventListener('dataavailable', (e) => { if (e.data.size > 0) chunks.push(e.data); });
      recorder.addEventListener('stop', () => {
        const blob = new Blob(chunks, { type: mime });
        if (blob.size === 0) {
          onError(new Error('Empty recording'));
          return;
        }
        download(doc, blob, videoName(mode, km, mime));
        onDone(mode);
      });
      recorder.addEventListener('error', (e) => { onError(e.error ?? new Error('Recording failed')); finish(); });
      recorder.start(1000);
      run = { mode, start: performance.now(), recorder };
      doc.getElementById('panel')?.classList.add('hidden');
      label();
    } catch (err) {
      onError(err);
    }
  }

  if (!mime) {
    ui.button.disabled = true;
    ui.button.title = t('Este navegador não consegue gravar vídeo da tela.');
  }
  ui.button.addEventListener('click', (e) => {
    stop(e);
    if (run) finish();
    else ui.dialog.classList.toggle('hidden');
  });
  ui.clip.addEventListener('click', (e) => { stop(e); start('clip'); });
  ui.timelapse.addEventListener('click', (e) => { stop(e); start('timelapse'); });
  ui.cancel.addEventListener('click', (e) => { stop(e); ui.dialog.classList.add('hidden'); });
  onLangChange(label);
  label();

  return {
    /** Simulation steps per frame: 10 during a timelapse, otherwise 1. */
    speedup: () => (run ? MODES[run.mode].speedup : 1),
    /** Called every frame: updates the countdown and stops when time is up. */
    tick(now) {
      if (!run) return;
      if ((now - run.start) / 1000 >= MODES[run.mode].seconds) finish();
      else label();
    },
  };
}
