(async () => {
  const DEBUG = true;
  const TIMEOUT = 4200;
  const POLL = 120;
  const TOAST_ID = '__linkconnect_toast';
  const RUNNING_ATTRIBUTE = 'data-linkconnect-running';
  const SEND_WITHOUT_NOTE_LABELS = ['send without a note'];

  const normalizeText = value => (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const debug = (...args) => {
    if (DEBUG) console.debug('[LinkConnect]', ...args);
  };

  function result(ok, status, message) {
    return { ok, status, message };
  }

  function showToast(message, type = 'info') {
    document.getElementById(TOAST_ID)?.remove();
    const el = document.createElement('div');
    el.id = TOAST_ID;
    const bg = type === 'success' ? '#475569' : type === 'error' ? '#b42318' : '#334155';
    Object.assign(el.style, {
      position: 'fixed', bottom: '18px', right: '18px', zIndex: '2147483647',
      display: 'flex', alignItems: 'center', gap: '9px', maxWidth: '320px',
      padding: '11px 14px', border: '1px solid rgba(255,255,255,.13)', borderRadius: '10px',
      background: bg, color: '#fff', boxShadow: '0 12px 28px rgba(15,23,42,.20)',
      font: '500 13px Poppins, "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      lineHeight: '1.35'
    });
    const dot = document.createElement('span');
    Object.assign(dot.style, {
      width: '7px', height: '7px', flex: '0 0 auto', borderRadius: '50%', background: 'rgba(255,255,255,.9)'
    });
    const text = document.createElement('span');
    text.textContent = message;
    el.append(dot, text);
    document.documentElement.appendChild(el);
    const duration = type === 'error' ? 5200 : type === 'success' ? 3200 : 4000;
    setTimeout(() => el.remove(), duration);
  }

  function finish(workflowResult) {
    const type = workflowResult.ok ? 'success'
      : ['pending', 'already-connected', 'awaiting-user'].includes(workflowResult.status) ? 'info'
        : 'error';
    showToast(workflowResult.message, type);
    return workflowResult;
  }

  function isVisible(el) {
    if (!el || !(el instanceof Element)) return false;
    const style = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return style.visibility !== 'hidden'
      && style.display !== 'none'
      && style.opacity !== '0'
      && rect.width > 0
      && rect.height > 0;
  }

  function isEnabled(el) {
    return !el.matches(':disabled')
      && !el.hasAttribute('disabled')
      && normalizeText(el.getAttribute('aria-disabled')) !== 'true';
  }

  function labelValues(el) {
    return [...new Set([
      el.innerText,
      el.textContent,
      el.getAttribute('aria-label'),
      el.getAttribute('title')
    ].map(normalizeText).filter(Boolean))];
  }

  function hasExactLabel(el, labels) {
    const wanted = labels.map(normalizeText);
    return labelValues(el).some(value => wanted.includes(value));
  }

  function actionableCandidates(root = document) {
    return [...root.querySelectorAll('button, a, [role="button"], [role="menuitem"]')]
      .filter(el => isVisible(el) && isEnabled(el));
  }

  function queryAllIncludingOpenShadows(selector) {
    const roots = [document];
    const knownHosts = document.querySelectorAll('#interop-outlet, [data-testid="interop-shadowdom"]');
    for (const host of knownHosts) {
      if (host.shadowRoot && !roots.includes(host.shadowRoot)) roots.push(host.shadowRoot);
    }

    for (let index = 1; index < roots.length; index += 1) {
      for (const element of roots[index].querySelectorAll('*')) {
        if (element.shadowRoot && !roots.includes(element.shadowRoot)) roots.push(element.shadowRoot);
      }
    }

    return roots.flatMap(root => [...root.querySelectorAll(selector)]);
  }

  async function loadSettings() {
    try {
      const settings = await chrome.storage.local.get({ autoSendWithoutNote: true });
      return { autoSendWithoutNote: settings.autoSendWithoutNote === true };
    } catch (error) {
      debug('Could not read settings; using defaults', error?.message || error);
      return { autoSendWithoutNote: false };
    }
  }

  function candidateDetails(root) {
    return actionableCandidates(root).map(el => ({
      action: diagnosticAction(el),
      role: el.getAttribute('role') || '',
      tag: el.tagName.toLowerCase()
    }));
  }

  function diagnosticAction(el) {
    const knownLabels = [
      'connect', 'follow', 'message', 'more', 'more actions', 'pending',
      'invitation sent', 'remove connection', 'add a note', 'send without a note'
    ];
    const exactMatch = knownLabels.find(label => hasExactLabel(el, [label]));
    if (exactMatch) return exactMatch;

    const ariaLabel = normalizeText(el.getAttribute('aria-label'));
    if (ariaLabel.startsWith('invite ') && ariaLabel.includes(' connect')) return 'invite-to-connect';
    return 'other-action';
  }

  async function waitFor(predicate, { timeout = TIMEOUT, interval = POLL } = {}) {
    const startedAt = performance.now();
    while (performance.now() - startedAt < timeout) {
      const match = predicate();
      if (match) return match;
      await sleep(interval);
    }
    return null;
  }

  function isMoreControl(el) {
    return hasExactLabel(el, ['more', 'more actions']);
  }

  function profileActionRoot() {
    const scope = document.querySelector('main') || document;
    const moreControls = actionableCandidates(scope).filter(isMoreControl);

    for (const more of moreControls) {
      let node = more.parentElement;
      for (let depth = 0; node && depth < 6; depth += 1, node = node.parentElement) {
        const controls = actionableCandidates(node);
        const hasMessage = controls.some(el => hasExactLabel(el, ['message']));
        const hasConnect = controls.some(el => hasExactLabel(el, ['connect']));
        if (hasMessage || hasConnect) return node;
      }
    }
    return null;
  }

  function detectProfileState(root) {
    const controls = actionableCandidates(root);
    if (controls.some(el => hasExactLabel(el, ['pending', 'invitation sent']))) return 'pending';

    const profileText = normalizeText(root.innerText);
    if (/(^|\s)1st(?:\s|$)/.test(profileText)) return 'already-connected';
    return null;
  }

  function findDirectConnectButton(root) {
    return actionableCandidates(root).find(el => {
      if (hasExactLabel(el, ['connect'])) return true;
      const ariaLabel = normalizeText(el.getAttribute('aria-label'));
      return ariaLabel.startsWith('invite ') && ariaLabel.includes(' connect');
    }) || null;
  }

  function visibleMenus() {
    return queryAllIncludingOpenShadows('[role="menu"], .artdeco-dropdown__content').filter(isVisible);
  }

  async function openMoreMenu(root) {
    const more = actionableCandidates(root).find(isMoreControl) || null;
    if (!more) return { status: 'menu-not-found' };

    debug('Opening profile More menu', {
      ariaLabel: normalizeText(more.getAttribute('aria-label')),
      expanded: more.getAttribute('aria-expanded')
    });

    const menusBefore = new Set(visibleMenus());
    const controlledId = more.getAttribute('aria-controls');
    more.click();

    const menu = await waitFor(() => {
      if (controlledId) {
        const controlled = document.getElementById(controlledId);
        if (isVisible(controlled)) return controlled;
      }
      return visibleMenus().find(candidate => !menusBefore.has(candidate)) || null;
    }, { timeout: 2400 });

    if (!menu) {
      debug('Profile More menu did not render');
      return { status: 'menu-not-found' };
    }

    debug('Profile More menu found', candidateDetails(menu));
    return { status: 'menu-found', menu };
  }

  function stateFromMenu(menu) {
    const items = actionableCandidates(menu);
    if (items.some(el => hasExactLabel(el, ['pending', 'invitation sent']))) return 'pending';
    if (items.some(el => hasExactLabel(el, ['remove connection']))) return 'already-connected';
    return null;
  }

  function findConnectMenuItem(menu) {
    return actionableCandidates(menu).find(el => hasExactLabel(el, ['connect'])) || null;
  }

  function visibleDialogs() {
    return queryAllIncludingOpenShadows('[role="dialog"], .artdeco-modal').filter(isVisible);
  }

  function isInvitationDialog(dialog) {
    const text = normalizeText(dialog.innerText);
    return text.includes('send without a note')
      || text.includes('add a note')
      || text.includes('personalize your invitation')
      || (text.includes('invite') && text.includes('connect'));
  }

  function findSendWithoutNoteButton(dialog) {
    return actionableCandidates(dialog)
      .find(el => hasExactLabel(el, SEND_WITHOUT_NOTE_LABELS)) || null;
  }

  function sentConfirmationElements() {
    return queryAllIncludingOpenShadows('[role="alert"], [role="status"], .artdeco-toast-item')
      .filter(isVisible)
      .filter(el => {
        const text = normalizeText(el.innerText);
        return text.includes('invitation sent') || text.includes('connection request sent');
      });
  }

  function hasSentConfirmation(root, confirmationsBefore = new Set()) {
    if (detectProfileState(root) === 'pending') return true;
    return sentConfirmationElements().some(el => !confirmationsBefore.has(el));
  }

  async function completeInvitation(root, dialogsBefore, autoSendWithoutNote) {
    const dialog = await waitFor(() => visibleDialogs().find(candidate => (
      !dialogsBefore.has(candidate) && isInvitationDialog(candidate)
    )) || null, { timeout: 3200 });

    if (!dialog) {
      const confirmed = await waitFor(() => hasSentConfirmation(root), { timeout: 1200 });
      return confirmed
        ? result(true, 'sent', 'Connection request sent.')
        : result(false, 'dialog-not-found', 'LinkedIn did not open the invitation dialog.');
    }

    debug('Invitation dialog detected', candidateDetails(dialog));
    if (!autoSendWithoutNote) {
      debug('Automatic Send without a note is disabled');
      return result(false, 'awaiting-user', 'Invitation dialog opened. Choose how you want to send it.');
    }

    const sendWithoutNote = await waitFor(
      () => findSendWithoutNoteButton(dialog),
      { timeout: 2200 }
    );

    if (!sendWithoutNote) {
      debug('Send without a note was not found', candidateDetails(dialog));
      return result(false, 'dialog-not-found', 'Send without a note was not found in the invitation dialog.');
    }

    debug('Clicking Send without a note');
    const confirmationsBefore = new Set(sentConfirmationElements());
    sendWithoutNote.click();

    const confirmed = await waitFor(
      () => hasSentConfirmation(root, confirmationsBefore),
      { timeout: TIMEOUT }
    );
    if (!confirmed) {
      debug('Send click was not confirmed by a Pending state or LinkedIn status message');
      return result(false, 'timeout', 'LinkedIn did not confirm that the request was sent.');
    }

    debug('Request sent');
    return result(true, 'sent', 'Connection request sent.');
  }

  async function runConnectionWorkflow() {
    debug('Starting connection workflow');

    const url = new URL(location.href);
    if (url.protocol !== 'https:'
      || !['linkedin.com', 'www.linkedin.com'].includes(url.hostname)
      || !url.pathname.startsWith('/in/')) {
      return result(false, 'unsupported-page', 'Open an individual LinkedIn profile first.');
    }

    const root = profileActionRoot();
    if (!root) {
      debug('Profile action area was not found');
      return result(false, 'connect-not-found', 'LinkedIn profile actions could not be found.');
    }

    const { autoSendWithoutNote } = await loadSettings();
    debug('Automatic Send without a note:', autoSendWithoutNote ? 'enabled' : 'disabled');

    debug('Profile action candidates', candidateDetails(root));
    const initialState = detectProfileState(root);
    if (initialState === 'pending') {
      return result(false, 'pending', 'Connection request is already pending.');
    }
    if (initialState === 'already-connected') {
      return result(false, 'already-connected', 'Already connected.');
    }

    showToast('Looking for Connect…', 'info');
    const dialogsBefore = new Set(visibleDialogs());
    const directConnect = findDirectConnectButton(root);

    if (directConnect) {
      debug('Direct Connect button found');
      directConnect.click();
      return completeInvitation(root, dialogsBefore, autoSendWithoutNote);
    }

    debug('Direct Connect candidates: 0');
    const menuResult = await openMoreMenu(root);
    if (!menuResult.menu) {
      return result(false, 'menu-not-found', 'The profile More menu could not be opened.');
    }

    const menuState = stateFromMenu(menuResult.menu);
    if (menuState === 'pending') {
      return result(false, 'pending', 'Connection request is already pending.');
    }
    if (menuState === 'already-connected') {
      return result(false, 'already-connected', 'Already connected.');
    }

    const connectItem = findConnectMenuItem(menuResult.menu);
    if (!connectItem) {
      return result(false, 'connect-not-found', 'Connect action was not found on this profile.');
    }

    debug('Connect menu item found');
    connectItem.click();
    return completeInvitation(root, dialogsBefore, autoSendWithoutNote);
  }

  const page = document.documentElement;
  if (page.hasAttribute(RUNNING_ATTRIBUTE)) {
    return finish(result(false, 'unexpected-error', 'LinkConnect is already running on this profile.'));
  }

  page.setAttribute(RUNNING_ATTRIBUTE, 'true');
  try {
    return finish(await runConnectionWorkflow());
  } catch (error) {
    console.error('[LinkConnect] Unexpected error:', error);
    return finish(result(false, 'unexpected-error', 'Could not send the connection request.'));
  } finally {
    page.removeAttribute(RUNNING_ATTRIBUTE);
  }
})();
