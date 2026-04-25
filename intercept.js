/**
 * Intercept page logic.
 *
 * Triggered by background.js when a Webex meeting URL is navigated to.
 * Reads the query string, renders meeting info, and either auto-launches
 * the `ciscowebexapp://` handler (when autoRedirect=1) or waits for the
 * user to click. Always offers a "Stay in Browser" fallback.
 */

const params = new URLSearchParams(location.search);
const originalUrl = params.get('original') || '';
const uri = params.get('uri') || '';
const siteurl = params.get('siteurl') || '';
const meetingNum = params.get('meetingNum') || '';
const auto = params.get('auto') === '1';

const el = (id) => document.getElementById(id);

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[c]);
}

function render() {
  document.title = `Opening Webex • ${meetingNum || siteurl}`;
  el('meetingFacts').innerHTML =
    (siteurl ? `<span>Site: <code>${escapeHtml(siteurl)}</code></span> &nbsp;` : '') +
    (meetingNum ? `<span>Meeting: <code>${escapeHtml(meetingNum)}</code></span>` : '');
  el('uriPreview').textContent = uri;
  el('originalPreview').textContent = originalUrl;
}

/**
 * Trigger the custom-protocol URI. Chrome will either launch the handler
 * silently or show its "Open Cisco Webex?" system prompt. We use an
 * iframe rather than `location.href =` so that a missing handler does
 * not replace the current page with a browser error.
 */
function launchDesktopApp() {
  const frame = document.createElement('iframe');
  frame.style.display = 'none';
  frame.src = uri;
  document.body.appendChild(frame);
  // Clean up after the handshake completes.
  setTimeout(() => frame.remove(), 4000);

  el('statusText').textContent =
    'Sent to Desktop App. If nothing happens, click "Open in Desktop App" again or fall back to the browser.';
}

function stayInBrowser() {
  if (originalUrl) location.replace(originalUrl);
}

function wire() {
  el('relaunchBtn').addEventListener('click', launchDesktopApp);
  el('stayBrowserBtn').addEventListener('click', stayInBrowser);
}

document.addEventListener('DOMContentLoaded', () => {
  if (!uri) {
    el('statusText').textContent =
      'Something went wrong: no meeting information was provided.';
    return;
  }
  render();
  wire();
  if (auto) {
    // Small delay so the page is painted before the OS prompt appears.
    setTimeout(launchDesktopApp, 100);
  }
});
