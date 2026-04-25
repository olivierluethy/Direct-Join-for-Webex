/**
 * Popup logic for Webex Direct Linker.
 *
 * Responsibilities:
 *  - Render the current tab's Webex status (active / idle).
 *  - Persist the user's preferences to chrome.storage.sync.
 *  - Wire the Report Bug / Request Feature footer buttons.
 */

const GITHUB_REPO = 'your-org/webex-direct-linker'; // see README for customisation
const BUG_TEMPLATE_URL =
  `https://github.com/${GITHUB_REPO}/issues/new` +
  '?labels=bug&template=bug_report.md';
const FEATURE_TEMPLATE_URL =
  `https://github.com/${GITHUB_REPO}/issues/new` +
  '?labels=enhancement&template=feature_request.md';

const DEFAULTS = Object.freeze({ autoRedirect: true, showChooser: true });

const el = (id) => document.getElementById(id);

/** Collect a minimal, non-identifying environment string for bug reports. */
function environmentString() {
  const m = chrome.runtime.getManifest();
  const ua = navigator.userAgent;
  return [
    `Extension: ${m.name} v${m.version}`,
    `User-Agent: ${ua}`,
    `Platform: ${navigator.platform || 'unknown'}`,
    `Language: ${navigator.language}`,
  ].join('\n');
}

function buildIssueUrl(baseUrl, title) {
  const url = new URL(baseUrl);
  url.searchParams.set('title', title);
  url.searchParams.set(
    'body',
    [
      '### Description',
      '<!-- Please describe the issue or request. -->',
      '',
      '### Steps to reproduce',
      '1. ',
      '',
      '### Environment',
      '```',
      environmentString(),
      '```',
    ].join('\n'),
  );
  return url.toString();
}

async function loadPrefs() {
  const prefs = await chrome.storage.sync.get(DEFAULTS);
  el('autoRedirectSwitch').checked = prefs.autoRedirect ?? DEFAULTS.autoRedirect;
  el('showChooserSwitch').checked = prefs.showChooser ?? DEFAULTS.showChooser;
}

function wirePrefsPersistence() {
  el('autoRedirectSwitch').addEventListener('change', (e) => {
    chrome.storage.sync.set({ autoRedirect: e.target.checked });
  });
  el('showChooserSwitch').addEventListener('change', (e) => {
    chrome.storage.sync.set({ showChooser: e.target.checked });
  });
}

async function refreshStatus() {
  el('versionLabel').textContent = 'v' + chrome.runtime.getManifest().version;

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab || !tab.url) {
    setIdleStatus('No active tab');
    return;
  }

  const resp = await chrome.runtime.sendMessage({
    type: 'parseWebexUrl',
    url: tab.url,
  });

  if (!resp || !resp.info) {
    setIdleStatus('Current tab is not a Webex meeting link.');
    return;
  }

  setActiveStatus(resp.info, resp.uri, tab.id);
}

function setIdleStatus(detail) {
  el('statusDot').className = 'status-dot status-dot--idle';
  el('statusLabel').textContent = 'No Webex link detected';
  el('statusDetail').textContent = detail;
  el('launchBtn').classList.add('d-none');
}

function setActiveStatus(info, uri, tabId) {
  el('statusDot').className = 'status-dot status-dot--active';
  el('statusLabel').textContent = 'Webex meeting detected';
  el('statusDetail').innerHTML =
    `<span class="text-secondary">Site:</span> <code>${escapeHtml(info.siteurl)}</code>` +
    `<br><span class="text-secondary">Meeting:</span> <code>${escapeHtml(info.meetingNum)}</code>`;

  const btn = el('launchBtn');
  btn.classList.remove('d-none');
  btn.onclick = () => {
    // Navigate the active tab to the URI so Chrome shows its native
    // "Open Cisco Webex?" prompt. Using chrome.tabs.update keeps the
    // behaviour identical whether the popup is open or closed.
    chrome.tabs.update(tabId, { url: uri });
    window.close();
  };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

function wireFeedbackButtons() {
  el('reportBugBtn').addEventListener('click', () => {
    chrome.tabs.create({
      url: buildIssueUrl(BUG_TEMPLATE_URL, '[Bug] '),
    });
  });
  el('featureBtn').addEventListener('click', () => {
    chrome.tabs.create({
      url: buildIssueUrl(FEATURE_TEMPLATE_URL, '[Feature] '),
    });
  });
}

document.addEventListener('DOMContentLoaded', async () => {
  wirePrefsPersistence();
  wireFeedbackButtons();
  await loadPrefs();
  await refreshStatus();
});
