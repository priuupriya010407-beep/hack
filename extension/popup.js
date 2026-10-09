const APP_URL = 'http://localhost:5173';

const checkButton = document.querySelector('#check');
const status = document.querySelector('#status');

checkButton.addEventListener('click', async () => {
  checkButton.disabled = true;
  status.textContent = 'Reading your selection…';

  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id || !tab.url) throw new Error('No active browser tab was found.');

    const host = new URL(tab.url).hostname.toLowerCase();
    let source;
    if (host === 'instagram.com' || host.endsWith('.instagram.com')) source = 'Instagram';
    else if (host === 'facebook.com' || host.endsWith('.facebook.com')) source = 'Facebook';
    else throw new Error('Open an Instagram or Facebook post first.');

    const [injection] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const selection = window.getSelection();
        const text = selection?.toString().trim() || '';
        const anchor = selection?.anchorNode?.parentElement?.closest('a');
        const selectedUrl = anchor?.href || '';
        return { text, url: selectedUrl };
      },
    });

    const captured = injection?.result;
    if (!captured?.text && !captured?.url) {
      throw new Error('Select some post text or a link on the page, then try again.');
    }

    const params = new URLSearchParams({
      source,
      ...(captured.text ? { text: captured.text } : {}),
      ...(captured.url ? { url: captured.url } : {}),
    });
    await chrome.tabs.create({ url: `${APP_URL}/social-safety#${params.toString()}` });
    window.close();
  } catch (error) {
    status.textContent = error instanceof Error ? error.message : 'Could not read the selection.';
    checkButton.disabled = false;
  }
});
