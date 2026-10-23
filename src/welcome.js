const KEY = 'train-journey:welcome:v1';

export function setupWelcome(doc, { hasJourney }) {
  const dialog = doc.getElementById('welcome');
  const around = [...doc.body.children].filter((node) => node !== dialog);
  const show = () => {
    around.forEach((node) => { node.inert = true; });
    dialog.classList.remove('hidden');
    doc.getElementById('welcome-free').focus();
  };
  const close = () => {
    dialog.classList.add('hidden');
    around.forEach((node) => { node.inert = false; });
    try { localStorage.setItem(KEY, '1'); } catch { /* Welcome still closes. */ }
    doc.getElementById('menu-btn').focus();
  };
  doc.getElementById('welcome-free').addEventListener('click', close);
  doc.getElementById('welcome-choose').addEventListener('click', () => {
    close();
    doc.getElementById('panel').classList.remove('hidden');
    doc.getElementById('destination').focus();
  });
  doc.getElementById('welcome-open').addEventListener('click', show);
  doc.getElementById('welcome-close').addEventListener('click', close);
  dialog.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  doc.getElementById('welcome-resume').hidden = !hasJourney;
  doc.getElementById('welcome-resume').addEventListener('click', close);
  if (new URLSearchParams(window.location.search).has('nowelcome')) return false;
  try { if (localStorage.getItem(KEY) !== '1') { show(); return true; } } catch { show(); return true; }
  return false;
}
