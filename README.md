# LinkConnect

LinkConnect is a lightweight Chrome extension that simplifies sending a LinkedIn connection request from an individual profile page.

Open a profile, click the extension icon, and LinkConnect handles the connection flow for that profile.

It is intentionally designed around one explicit user action at a time — no bulk requests, profile crawling, or background automation.

## Why LinkConnect?

On some LinkedIn profiles, the Connect action is directly visible. On others, it is hidden inside the More menu below the profile actions.

Sending a request can therefore involve several repetitive steps:

1. Open More.
2. Find Connect.
3. Open the invitation dialog.
4. Choose Send without a note.

LinkConnect reduces that interaction to a single extension click while keeping the process user initiated.

## How it works

When you click the LinkConnect extension icon on an individual LinkedIn profile, it:

1. Checks whether a Connect action is directly available.
2. If needed, opens the More menu and looks for Connect.
3. Opens LinkedIn's invitation dialog.
4. Selects Send without a note when automatic sending is enabled.
5. Shows a small status message on the page.

LinkConnect processes only the profile currently open in your active tab.

## Install

LinkConnect is currently distributed as a development build.

1. Download or clone this repository.
2. Open Chrome.
3. Go to `chrome://extensions`.
4. Enable Developer mode.
5. Click Load unpacked.
6. Select the repository folder containing `manifest.json`.
7. Pin LinkConnect from the Chrome extensions menu.

## Use

1. Open an individual LinkedIn profile:

   `https://www.linkedin.com/in/...`

2. Click the LinkConnect extension icon.

3. Wait for the status message shown on the page.

Depending on the current profile state, LinkConnect may report that:

- the connection request was sent,
- a request is already pending,
- the person is already connected,
- or the Connect action could not be found.

## Settings

Open the LinkConnect extension options to control:

### Send without a note automatically

Enabled by default.

When enabled:

`Connect → Send without a note`

is completed automatically after you click the extension.

When disabled, LinkConnect opens the LinkedIn invitation dialog and leaves the final action to you.

Settings are stored locally using Chrome extension storage.

## Privacy

LinkConnect is designed to operate locally inside your browser.

- No analytics
- No telemetry
- No advertising
- No remote server
- No profile database
- No background profile crawling
- No external API
- No LinkedIn data storage

The extension receives temporary access to the active tab when you explicitly invoke it.

## What LinkConnect does not do

LinkConnect intentionally does not provide:

- bulk connection requests,
- automatic connection campaigns,
- LinkedIn search-result automation,
- profile scraping,
- automatic profile navigation,
- scheduled connection requests,
- background crawling.

One click operates on one manually opened profile.

## Limitations

LinkedIn can change its interface, labels, accessibility attributes, menu structure, or invitation dialog at any time.

Because LinkConnect interacts with LinkedIn's current page interface, such changes may occasionally require updates to the extension.

Some profiles may also expose different actions depending on relationship state, account type, LinkedIn experiments, or regional UI variations.

## Development status

LinkConnect is currently a development build.

The core workflow is functional, but it is still being tested across different LinkedIn profile layouts and connection states.

Use it cautiously and review LinkedIn's applicable terms and account limits before use.

## License

MIT — see [LICENSE](LICENSE).
