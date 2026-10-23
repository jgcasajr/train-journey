import { t } from './i18n.js';

const STATE_KEY = 'train-journey:journey:v1';
const BACKUP_VERSION = 1;
const PREFIX = 'train-journey:';
let suppressSave = false;

const validState = (s) => s && typeof s === 'object'
  && ['distance', 'time', 'speed', 'dayTime', 'dayCount', 'dwell'].every((key) => Number.isFinite(s[key]))
  && s.distance >= 0 && s.distance < 1_000_000_000 && s.time >= 0 && s.speed >= 0
  && ['passenger', 'dining', 'panorama', 'sleeper', 'baggage', 'cab'].includes(s.car)
  && s.pose && typeof s.pose === 'object'
  && Array.isArray(s.drops) && s.drops.length <= 300 && Array.isArray(s.effects);

export function savedJourney(storage = localStorage) {
  try {
    const data = JSON.parse(storage.getItem(STATE_KEY) ?? 'null');
    return data?.version === BACKUP_VERSION && validState(data.state)
      ? data.state : null;
  } catch { return null; }
}

export function saveJourney(state, storage = localStorage) {
  if (suppressSave || !validState(state)) return false;
  try {
    storage.setItem(STATE_KEY, JSON.stringify({ version: BACKUP_VERSION, savedAt: Date.now(), state }));
    return true;
  } catch { return false; }
}

export function clearJourney(storage = localStorage) {
  suppressSave = true;
  storage.removeItem(STATE_KEY);
}

export function exportProgress(storage = localStorage) {
  const entries = {};
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (key?.startsWith(PREFIX)) entries[key] = storage.getItem(key);
  }
  return JSON.stringify({ kind: 'train-journey-backup', version: BACKUP_VERSION, exportedAt: new Date().toISOString(), entries }, null, 2);
}

export function importProgress(json, storage = localStorage) {
  const backup = JSON.parse(json);
  if (backup?.kind !== 'train-journey-backup' || backup.version !== BACKUP_VERSION
    || !backup.entries || typeof backup.entries !== 'object' || Array.isArray(backup.entries)) {
    throw new Error('Arquivo de viagem inválido');
  }
  const entries = Object.entries(backup.entries);
  if (entries.length > 100 || entries.some(([key, value]) => !key.startsWith(PREFIX) || typeof value !== 'string' || value.length > 2_000_000)) {
    throw new Error('Dados de viagem inválidos');
  }
  if (backup.entries[STATE_KEY]) {
    const journey = JSON.parse(backup.entries[STATE_KEY]);
    if (journey?.version !== BACKUP_VERSION || !validState(journey.state)) throw new Error('Dados de viagem inválidos');
  }
  const previous = new Map(entries.map(([key]) => [key, storage.getItem(key)]));
  try {
    entries.forEach(([key, value]) => storage.setItem(key, value));
  } catch (err) {
    previous.forEach((value, key) => value === null ? storage.removeItem(key) : storage.setItem(key, value));
    throw err;
  }
  suppressSave = true;
  return entries.length;
}

export function setupProgress(doc, getState) {
  const status = doc.getElementById('progress-status');
  const download = (text) => {
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = doc.createElement('a');
    link.href = url;
    link.download = `train-journey-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  doc.getElementById('progress-export')?.addEventListener('click', () => {
    saveJourney(getState());
    download(exportProgress());
    status.textContent = t('Backup salvo no seu dispositivo.');
  });
  doc.getElementById('progress-import')?.addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 4_000_000) throw new Error('Arquivo muito grande');
      importProgress(await file.text());
      window.location.reload();
    } catch (err) {
      status.textContent = `${t('Não foi possível importar:')} ${t(err.message)}`;
      event.target.value = '';
    }
  });
  doc.getElementById('progress-restart')?.addEventListener('click', () => {
    clearJourney();
    window.location.reload();
  });
}

