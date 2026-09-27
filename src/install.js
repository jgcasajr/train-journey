/**
 * Offline support and "install as an app": registers the service worker and shows the
 * install button when the browser offers installation.
 */
export function setupInstall(doc, { onInstalled }) {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Offline mode unavailable:', err));
  }
  const button = doc.getElementById('install-btn');
  if (!button) throw new Error('Missing element #install-btn');
  let prompt = null;
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault(); // keep the browser's own banner quiet; the panel button offers it
    prompt = e;
    button.classList.remove('hidden');
  });
  button.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!prompt) return;
    prompt.prompt();
    const choice = await prompt.userChoice.catch(() => null);
    prompt = null;
    button.classList.add('hidden');
    if (choice?.outcome === 'accepted') onInstalled();
  });
  window.addEventListener('appinstalled', onInstalled);
}
