/**
 * Webex Direct Linker — service worker.
 *
 * Listens for navigations to Webex meeting URLs and redirects the tab to a
 * local intercept page that triggers the `ciscowebexapp://` protocol handler.
 * The service worker stays idle until a matching navigation fires, keeping
 * memory use minimal.
 */

const DEFAULT_PREFS = Object.freeze({
  // When true, the intercept page auto-launches the desktop app without
  // waiting for a user click.
  autoRedirect: true,
  // When true, a lightweight chooser is shown even when autoRedirect is on,
  // so users can fall back to the browser. Kept on by default — the chooser
  // is what makes a failed app-launch recoverable.
  showChooser: true,
});

/**
 * Parse a Webex URL into the pieces we need to build a `ciscowebexapp://`
 * deep link. Returns null when the URL is not one we should intercept.
 */
function parseWebexUrl(rawUrl) {
  let u;
  try {
    u = new URL(rawUrl);
  } catch {
    return null;
  }

  const hostMatch = u.hostname.match(/^([\w-]+)\.webex\.com$/i);
  if (!hostMatch) return null;
  const siteurl = hostMatch[1].toLowerCase();

  // Personal Meeting Room: /meet/<username-or-id>
  let m = u.pathname.match(/^\/meet\/([^/?#]+)/i);
  if (m) return { siteurl, meetingNum: decodeURIComponent(m[1]), type: 'meet' };

  // Scheduled meeting: /join/<meeting-number>
  m = u.pathname.match(/^\/join\/([^/?#]+)/i);
  if (m) return { siteurl, meetingNum: decodeURIComponent(m[1]), type: 'join' };

  // Legacy launcher: /j.php?MTID=... or ?MK=...
  if (/^\/j\.php$/i.test(u.pathname)) {
    const mtid = u.searchParams.get('MTID');
    const mk = u.searchParams.get('MK');
    const meetingNum = mk || mtid;
    if (meetingNum) {
      return { siteurl, meetingNum, type: 'jphp', mtid: mtid || undefined };
    }
  }

  return null;
}

/**
 * Build the Cisco Webex protocol URI from a parsed Webex URL.
 * Format: ciscowebexapp://join?siteurl=<sub>&meetingNum=<id>[&MTID=<mtid>]
 */
function buildWebexUri({ siteurl, meetingNum, mtid }) {
  const params = new URLSearchParams({ siteurl, meetingNum });
  if (mtid) params.set('MTID', mtid);
  return `ciscowebexapp://join?${params.toString()}`;
}

/**
 * Read prefs from sync storage, falling back to defaults for missing keys.
 */
async function getPrefs() {
  const stored = await chrome.storage.sync.get(DEFAULT_PREFS);
  return { ...DEFAULT_PREFS, ...stored };
}

// Seed defaults on first install so the popup UI shows the right toggle state.
chrome.runtime.onInstalled.addListener(async () => {
  const existing = await chrome.storage.sync.get(null);
  const seed = {};
  for (const [key, value] of Object.entries(DEFAULT_PREFS)) {
    if (!(key in existing)) seed[key] = value;
  }
  if (Object.keys(seed).length) await chrome.storage.sync.set(seed);
});

/**
 * Main interception point. Runs on the tab's top frame before the Webex
 * page starts loading so we can swap the navigation out for our chooser.
 */
async function onBeforeWebexNavigation(details) {
  if (details.frameId !== 0) return; // ignore subframes

  // Do not loop on our own intercept page.
  if (details.url.startsWith(chrome.runtime.getURL(''))) return;

  const info = parseWebexUrl(details.url);
  if (!info) return;

  const prefs = await getPrefs();
  const uri = buildWebexUri(info);

  const params = new URLSearchParams({
    original: details.url,
    uri,
    siteurl: info.siteurl,
    meetingNum: info.meetingNum,
    type: info.type,
  });
  if (prefs.autoRedirect) params.set('auto', '1');

  const target = chrome.runtime.getURL('intercept.html') + '?' + params.toString();

  try {
    await chrome.tabs.update(details.tabId, { url: target });
  } catch (err) {
    // Tab may have been closed mid-navigation; nothing to do.
    console.debug('[WebexDirectLinker] tab update failed', err);
  }
}

chrome.webNavigation.onBeforeNavigate.addListener(onBeforeWebexNavigation, {
  url: [
    { hostSuffix: '.webex.com', pathPrefix: '/meet/' },
    { hostSuffix: '.webex.com', pathPrefix: '/join/' },
    { hostSuffix: '.webex.com', pathEquals: '/j.php' },
  ],
});

// Expose the parser to the popup via runtime messaging so it can classify
// the active tab without duplicating regex logic.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === 'parseWebexUrl' && typeof msg.url === 'string') {
    const info = parseWebexUrl(msg.url);
    sendResponse({ info, uri: info ? buildWebexUri(info) : null });
    return true;
  }
  return false;
});
chrome.runtime.setUninstallURL("https://forms.gle/zQaPnUWYdhnBxusCA");