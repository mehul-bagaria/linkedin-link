const SUPPORTED_HOSTS = new Set(['www.linkedin.com', 'linkedin.com']);
const badgeClearTimers = new Map();

async function migrateLegacySetting() {
  const localSettings = await chrome.storage.local.get('autoSendWithoutNote');
  const syncSettings = await chrome.storage.sync.get('autoSendWithoutNote');
  const hasLegacySetting = typeof syncSettings.autoSendWithoutNote === 'boolean';

  if (typeof localSettings.autoSendWithoutNote !== 'boolean' && hasLegacySetting) {
    await chrome.storage.local.set({ autoSendWithoutNote: syncSettings.autoSendWithoutNote });
  }
  if (hasLegacySetting) {
    await chrome.storage.sync.remove('autoSendWithoutNote');
  }
}

function setBadge(tabId, text, color) {
  const previousTimer = badgeClearTimers.get(tabId);
  if (previousTimer) clearTimeout(previousTimer);
  badgeClearTimers.delete(tabId);

  chrome.action.setBadgeText({ tabId, text }).catch(() => {});
  if (color) chrome.action.setBadgeBackgroundColor({ tabId, color }).catch(() => {});
  if (text) {
    const timer = setTimeout(() => {
      chrome.action.setBadgeText({ tabId, text: '' }).catch(() => {});
      badgeClearTimers.delete(tabId);
    }, 3500);
    badgeClearTimers.set(tabId, timer);
  }
}

async function runOnTab(tab) {
  if (!tab?.id || !tab.url) return;

  let url;
  try {
    url = new URL(tab.url);
  } catch {
    setBadge(tab.id, '!', '#b42318');
    return;
  }

  if (url.protocol !== 'https:' || !SUPPORTED_HOSTS.has(url.hostname) || !url.pathname.startsWith('/in/')) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const old = document.getElementById('__linkconnect_toast');
        if (old) old.remove();
        const toast = document.createElement('div');
        toast.id = '__linkconnect_toast';
        toast.textContent = 'Open a LinkedIn profile first';
        Object.assign(toast.style, {
          position: 'fixed', top: '18px', right: '18px', zIndex: '2147483647',
          padding: '11px 14px', borderRadius: '10px', background: '#475569', color: '#fff',
          font: '500 13px Poppins, Inter, system-ui, sans-serif', boxShadow: '0 10px 26px rgba(15,23,42,.18)'
        });
        document.documentElement.appendChild(toast);
        setTimeout(() => toast.remove(), 2600);
      }
    }).catch(() => {});
    setBadge(tab.id, '!', '#b42318');
    return;
  }

  try {
    const [{ result }] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['src/content/connect.js']
    });

    if (result?.ok) {
      setBadge(tab.id, '✓', '#475569');
    } else if (result?.status === 'awaiting-user') {
      setBadge(tab.id, '…', '#64748b');
    } else {
      setBadge(tab.id, '!', '#b42318');
    }
  } catch (error) {
    setBadge(tab.id, '!', '#b42318');
    console.error('LinkConnect failed:', error);
  }
}

chrome.action.onClicked.addListener(runOnTab);

chrome.runtime.onInstalled.addListener(() => {
  migrateLegacySetting().catch(error => {
    console.error('LinkConnect could not migrate its setting:', error?.message || error);
  });
});
