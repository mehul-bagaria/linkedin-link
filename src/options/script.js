const version = document.getElementById('version');
const autoSend = document.getElementById('auto-send-without-note');
const autoSendState = document.getElementById('auto-send-state');
const saveStatus = document.getElementById('save-status');
let saveStatusTimer;
let savedAutoSend = true;

version.textContent = chrome.runtime.getManifest().version;

function renderAutoSendState(enabled) {
  autoSendState.textContent = enabled ? 'On' : 'Off';
  autoSendState.classList.toggle('is-off', !enabled);
}

function showSaveStatus(message) {
  if (saveStatusTimer) clearTimeout(saveStatusTimer);
  saveStatus.textContent = message;
  saveStatusTimer = setTimeout(() => {
    saveStatus.textContent = '';
    saveStatusTimer = undefined;
  }, 2200);
}

async function loadOptions() {
  try {
    const settings = await chrome.storage.local.get({ autoSendWithoutNote: true });
    savedAutoSend = settings.autoSendWithoutNote === true;
    autoSend.checked = savedAutoSend;
    renderAutoSendState(savedAutoSend);
  } catch {
    savedAutoSend = false;
    autoSend.checked = false;
    renderAutoSendState(false);
    showSaveStatus('Could not load the saved setting.');
  }
}

autoSend.addEventListener('change', async () => {
  renderAutoSendState(autoSend.checked);
  try {
    await chrome.storage.local.set({ autoSendWithoutNote: autoSend.checked });
    savedAutoSend = autoSend.checked;
    showSaveStatus(autoSend.checked
      ? 'Automatic sending enabled.'
      : 'Manual confirmation enabled.');
  } catch {
    autoSend.checked = savedAutoSend;
    renderAutoSendState(savedAutoSend);
    showSaveStatus('Could not save the setting.');
  }
});

loadOptions();
