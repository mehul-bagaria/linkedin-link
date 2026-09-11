# LinkConnect

LinkConnect is a lightweight Chrome extension that performs a single, user-initiated LinkedIn connection request from the profile page.

Open a profile, click the extension icon, and LinkConnect will:

1. Look for a visible **Connect** action.
2. If needed, open the **More** menu and look for **Connect** there.
3. Handle LinkedIn's invitation dialog.
4. Choose **Send without a note** when that option is available.
5. Show a small status toast on the page.

## Install

1. Download or clone this folder.
2. Open `chrome://extensions`.
3. Enable **Developer mode**.
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. Pin LinkConnect to the Chrome toolbar.

## Use

1. Open a LinkedIn member profile such as `https://www.linkedin.com/in/...`.
2. Click the LinkConnect extension icon once.
3. Wait for the in-page status toast.

LinkConnect intentionally handles only one profile per explicit click. It does not include bulk requests, automatic crawling, or background connection campaigns.

## Setting

Open LinkConnect's extension options to control **Send without a note automatically**. It is enabled by default. When disabled, LinkConnect opens LinkedIn's invitation dialog and leaves the final choice to you.

The preference is stored locally in Chrome and is not synced or sent anywhere.

## Privacy

- No analytics.
- No remote server.
- No profile database.
- No background crawling.
- The extension only receives temporary access to the active tab after you click it.

## Development status

This is a development build. LinkedIn can change labels, accessibility attributes, menus, or dialogs at any time, which can require selector updates.

Use it cautiously and in accordance with LinkedIn's terms and account limits.
