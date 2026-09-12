<div align="center">
  <img src="icons/icon128.png" alt="Webex Direct Linker logo" width="140" />
  <h1>Webex Direct Linker</h1>
  <p><b>Open Webex meetings straight in the desktop app.</b><br/>A tiny, privacy-respecting Chrome extension that skips the sluggish web client.</p>
  <p>
    <a href="LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-blue.svg"></a>
    <img alt="Chrome Extension MV3" src="https://img.shields.io/badge/Chrome%20Extension-MV3-4285F4?logo=googlechrome&logoColor=white">
    <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black">
    <img alt="Bootstrap 5" src="https://img.shields.io/badge/Bootstrap-5-7952B3?logo=bootstrap&logoColor=white">
  </p>
</div>

---

A tiny, privacy-respecting Chrome Extension (Manifest V3) that intercepts
Webex meeting URLs and launches them directly in the **Cisco Webex Desktop
App** via the `ciscowebexapp://` URI scheme — bypassing the sluggish web
client's audio, video, and login-loop issues.

No telemetry, no external scripts, no broad host permissions.

## Features

- **URL interception** for the three canonical Webex entry points:
  - `https://<site>.webex.com/meet/<username-or-id>`
  - `https://<site>.webex.com/join/<meeting-number>`
  - `https://<site>.webex.com/j.php?MTID=…` / `?MK=…`
- **Protocol redirection** to `ciscowebexapp://join?siteurl=…&meetingNum=…`.
- **Fallback chooser** (the "intercept" page) with a prominent
  *Open in Desktop App* action and a secondary *Stay in Browser* button
  that clearly warns about the web client's audio limitations.
- **Dark-themed popup** (Bootstrap 5 `data-bs-theme="dark"` on a
  `#121212` canvas) with:
  - Live status indicator for the active tab.
  - Toggle: *Always open in Desktop App* (auto-launch without chooser).
  - Toggle: *Show fallback chooser* (recommended on).
  - One-click *Report Bug* / *Request Feature* buttons that open
    GitHub Issues pre-filled with extension version and environment info.

## Why not the official Cisco extension?

The official Cisco Webex Chrome Extension demands broad permissions,
injects into every browsing session, and adds meaningful memory overhead.
This extension does one thing only: when you navigate to a known Webex
meeting URL, it redirects you to your local Webex Desktop App.

## Permissions (all minimal)

| Permission | Reason |
|---|---|
| `webNavigation` | Detect navigations to Webex meeting URLs. |
| `storage` | Persist the two user toggles. |
| `activeTab` | Read the current tab's URL from the popup. |
| Host: `*://*.webex.com/*` | Filter `webNavigation` events; no content-script injection. |

There is **no** `tabs`, `scripting`, `<all_urls>`, or "Read all site data"
permission.

## Project layout

```
.
├── manifest.json        # MV3 manifest
├── background.js        # Service worker — URL parser + redirector
├── popup.html           # Bootstrap 5 dark popup
├── popup.js             # Popup logic (status, prefs, feedback buttons)
├── popup.css            # Theme overrides on top of Bootstrap dark
├── intercept.html       # Local chooser page (dark, card-style)
├── intercept.js         # Protocol launcher + fallback to browser
├── lib/
│   └── bootstrap.min.css  # Bundled locally (MV3 disallows remote CSS)
└── icons/               # 16/32/48/128 PNGs
```

## Install (developer mode)

1. Clone or download this folder.
2. Open `chrome://extensions` in Chrome or Edge.
3. Enable **Developer mode** (top-right toggle).
4. Click **Load unpacked** and select this directory.

The extension icon should now appear in your toolbar.

## Test it

1. Visit any link of the form `https://<site>.webex.com/meet/<username>`.
2. You should be redirected to the intercept page, which triggers your
   OS handler for `ciscowebexapp://` (Chrome will show its
   *Open Cisco Webex?* prompt the first time).

## Customising the feedback buttons

The *Report Bug* / *Request Feature* buttons open a GitHub Issues URL.
Edit the `GITHUB_REPO` constant at the top of `popup.js`:

```js
const GITHUB_REPO = 'your-org/webex-direct-linker';
```

If you prefer Google Forms, replace the two template URLs with your
form's prefill URL
(`https://docs.google.com/forms/d/e/<id>/viewform?usp=pp_url&entry.<field>=<value>`).

## Icons

The bundled PNGs are placeholder marks generated programmatically. Drop
in your own artwork at `icons/icon{16,32,48,128}.png` to replace them.

## License

Released under the [MIT License](LICENSE) © 2026 Olivier Lüthy. You're free to use, modify and distribute this
software, including commercially, as long as the copyright notice and license are included.

## Author

Built by **Olivier Lüthy** — [GitHub](https://github.com/olivierluethy).
