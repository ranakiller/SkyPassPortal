# Skypass Ticketing Portal Enhancements (Chrome/Edge Extension)

Standalone MV3 extension version of the three Tampermonkey userscripts:

- `Skypass Ticketing Portal Enhancements` → split into the 19 `sptModules/skypass-*.js` feature modules below
- `SPT Edit Booking Functions` → split into the 4 `ebModules/editbooking-*.js` feature modules below
- `SPT Find Seats on All Flights` → `sptModules/find-seats.js`

This folder **is** the unpacked extension root — `manifest.json` lives right here alongside `popup.html`/`background.js`, there's no nested `extension/` subfolder.

## File layout: one file per feature

Each of the two original monolithic scripts bundled many unrelated features into a single closure sharing one `window.sptGetSettings` callback — a bug or a heavy `MutationObserver` in one feature could end up slowing down or interfering with a totally unrelated one on the same page (this is exactly what happened once: an overly-broad `document.body` observer added for the Bulk Browse button was quietly costing every other feature on the page). Every feature now lives in its own file, each an independent `window.sptGetSettings(settings => { if (settings.enableX) (function(){ ... })(); })` IIFE, so features can't share DOM/observer state unless they genuinely need to (see the two intentional exceptions below).

Three top-level module folders, one per concern:
- **`utils/`** — shared helpers, loaded first on every page (order matters — everything else calls their globals):
  - `settings.js` — `window.SPT_DEFAULT_SETTINGS` + `window.sptGetSettings(callback)`
  - `mrz-utils.js` — `window.sptCleanMrzText`, `window.sptFormatYYMMDD`
  - `ocr.js` — `window.sptScanPassportImage`, `window.sptApplyVizFields`, `window.sptAttachOcrBrowseButton`, `window.sptCreateBulkOcrBrowseButton`, `window.sptSetOcrRowStatus`
- **`sptModules/`** — `skypass.pk/*` page features (from the old `skypass-enhancements.js`), one file per feature toggle in the popup, plus `find-seats.js` (from the old `SPT Find Seats on All Flights` userscript, active on the book-tickets page):
  `skypass-right-click-fix.js`, `skypass-days-calculator.js`, `skypass-flight-filters.js`, `skypass-whatsapp-copy.js`, `skypass-seats-copy.js`, `skypass-confirmed-booking-copy.js`, `skypass-cancelled-overlay-fix.js`, `skypass-cancelled-mrz.js`, `skypass-edit-booking-link.js`, `skypass-dob-doe-formatting.js`, `skypass-mrz-bulk-fill.js`, `skypass-bulk-browse.js`, `skypass-max-adults-finder.js`, `skypass-auto-check-review.js`, `skypass-print-booking-button.js`, `skypass-download-csv.js`, `skypass-booking-print-title.js`, `skypass-pdf-download.js`, `skypass-auto-login.js`, `find-seats.js`
- **`ebModules/`** — `agents/agent_ticket/*` (Edit Booking) page features (from the old `edit-booking-functions.js`):
  `editbooking-nav-buttons.js`, `editbooking-mrz-bulk-fill.js`, `editbooking-bulk-browse.js`, `editbooking-auto-check-review.js`

Two intentional exceptions kept multiple original sub-blocks together in one file each, since they share DOM state (not just a settings gate) and splitting them further would just add cross-file coupling without actually isolating anything:
- `skypass-mrz-bulk-fill.js` / `editbooking-mrz-bulk-fill.js` — the bulk-paste textarea, its MRZ-line cleanup, and the per-row autofill/input-box creation all read and write the same `#bulkMRZInput` element and table rows.
- The Bulk Browse button (`skypass-bulk-browse.js` / `editbooking-bulk-browse.js`) is deliberately its own separate file even though it's related to MRZ bulk-fill, since it's newer/higher-risk OCR code that benefits from being isolated from the older, more stable paste-box logic.

## Load it (unpacked)

1. Open `chrome://extensions` (or `edge://extensions` on Edge).
2. Enable **Developer mode** (top right).
3. Click **Load unpacked** and select this project's root folder (the one containing `manifest.json`).
4. Visit `https://skypass.pk/...` — the scripts run automatically, no popup or config needed.

Chrome reserves top-level file/folder names starting with `_` inside an unpacked extension (`_locales` is the built-in example) and will refuse to load the extension if one exists that it doesn't recognize — keep that in mind if you ever add your own folders here.

## Settings popup

Click the extension icon in the toolbar to open the settings popup. Every feature is individually toggleable, and a handful of values that used to be hardcoded in the userscripts are now editable there too:

- **Long layover threshold** (was hardcoded `2` days)
- **MRZ nationality code** (was hardcoded `"PAK"`)
- **Dummy passport number** used when no MRZ is entered (was `"PP1234567"`)
- **Default adult/child/infant ages** used for dummy DOB when no MRZ is entered (was `18`/`11`/`1`)
- **CSV export defaults**: discount, charges, exchange rate, Service Provider ID (were `2000`/`1000`/`75`/`"SPT"`)
- **Find-seats probe limit** — how many adults to try before showing "N+" (was hardcoded `6`)

Settings are stored in `chrome.storage.sync` (so they follow you across signed-in Chrome/Edge profiles) via the shared `utils/settings.js` module, read by each content script through `window.sptGetSettings(callback)`. Changes take effect on the next page load/reload of the Skypass tab — there's no need to reload the extension itself.

### Passport-photo OCR (Browse button instead of MRZ paste)

On the seats-booking page and the Edit Booking page, every passenger row gets a new trailing cell at the end of the row with a small folder-icon **Browse** button (styled with the same `btn bg-dark-4 btn_sm text-white` classes this extension's other injected buttons already use) instead of a raw MRZ text box. Pick a photo of the passport's bio page and the extension:

1. Sends the image to [OCR.space](https://ocr.space/ocrapi)'s hosted OCR API (via `background.js`, so the request isn't subject to Skypass's own page CSP)
2. Runs the raw recognized text through the same MRZ-cleanup regex the old bulk-paste textbox already used (`utils/mrz-utils.js` — noisy full-page OCR text is filtered down to just the two MRZ lines the same way messy pasted text always was)
3. Writes the result into the same (now hidden) MRZ input and fires an `input` event on it — so the existing, unchanged autofill logic in each script picks it up exactly as if you'd pasted it
4. Shows a real spinner next to the folder icon while scanning, then a green tick on success (hover it to see the scanned name) or a red cross on failure (hover for the error) — so a bad scan is obvious at a glance instead of silently writing wrong data

**Fallback for passports without a readable MRZ:** some passport photos won't have a usable MRZ strip — cropped too tight, damaged, or (as with Pakistani NADRA passports) a 2D barcode instead of OCR-B text. If no valid MRZ is found, the extension tries a second pass: it scans the same OCR text for the individually-printed fields (passport no., surname, given name(s), date of birth, date of expiry, sex, nationality — the standard labels ICAO Doc 9303 recommends bio pages use) and **writes whichever of those it actually found straight into that row's own Surname/Given Name/Passport No/DOB/Expiry/Nationality inputs** (`utils/ocr.js`'s `sptApplyVizFields`) — MRZ stays the first, most accurate priority, but a partial printed-field read still beats nothing. Fields it couldn't find are simply left for you to fill in manually; this can only add filled-in data, never overwrite a real failure with something worse.

Real passport bio pages are commonly laid out in a multi-column grid (e.g. "Type | Country Code | Passport Number" as one row, "P | PAK | VJ0160691" as the next), and OCR frequently emits that as a whole block of labels followed by a whole block of values rather than tidy label-then-value pairs — the field matcher accounts for this by skipping over lines that are themselves other recognized labels while scanning forward for each field's actual value, rather than blindly grabbing "the next line."

Because this is regex-based label matching on noisy OCR text (not a checksum-verified MRZ read), rows filled this way get a distinct **amber warning icon** instead of a green tick, with a short "No MRZ - details updated from raw data, must double-check" tooltip — treat those as needing a manual double-check (and manual completion of whatever wasn't found) before confirming the booking. All of the OCR row-status tooltips (tick/warning/cross) are a small custom tooltip, not the native browser `title` attribute, specifically so they appear the instant the mouse is over the icon instead of after the browser's usual ~1s hover delay. This applies to both the per-row Browse button and Bulk Browse, and can be turned off in the popup (**Edit → Passport photo OCR → Fill from printed fields if no MRZ**) if you'd rather it just fail cleanly when there's no MRZ.

**Bulk Browse:** a second button sits next to Back / Update changes / Print Booking / View Booking (Edit Booking page), or right before the **Confirm Booking** button (seats-booking / new-booking page — that area re-renders as you change the adult/child/infant counts, so a small observer keeps the button pinned in place instead of losing it on a re-render). Click it, multi-select several passport photos at once (ctrl/shift-click in the file picker), and each photo gets scanned and matched to a passenger row **in the order you selected them, one at a time** — row 1 updates as soon as the first photo finishes scanning, then row 2, and so on (not all at once at the end). Every affected row shows a spinner immediately on selection, then a green tick, amber warning, or red cross per row with the details in that row's own tooltip — there's no separate summary popup, since every outcome that has a row to show it on already shows it there directly.

**Photo count vs. row count mismatches:**
- **Fewer photos than rows** (e.g. 5 rows, 2 photos): only the first 2 rows are touched; the rest are left exactly as they were.
- **More photos than rows** (e.g. 2 rows, 5 photos): only the first 2 photos are matched to rows and scanned. The remaining photos are **never even sent to OCR.space** — no wasted API quota. Since there's no row to attach a tooltip to for these, you instead get a small non-blocking text notice next to the Bulk Browse button ("N extra photo(s) had no matching row and were skipped") that fades out on its own rather than an interrupting popup. If you need more rows, set the adult/child/infant count first, then Bulk Browse.

**Setup required:** get a free API key at [ocr.space/ocrapi](https://ocr.space/ocrapi) (no credit card, 25,000 requests/month, 500/day) and paste it into the popup's **Edit → Passport photo OCR** section. Without a key, clicking Browse will show an error telling you to add one; you can also turn the whole feature off there, which brings back the old plain MRZ text box as a fallback.

Settings exposed there:
- **OCR.space API key** — required for scanning to work at all
- **OCR engine (1-3)** — defaults to `3`, which OCR.space's own docs currently recommend as the most accurate for MRZ (OCR-B monospace) text; drop it to `2` if you find engine 3 underperforms on your photos
- **Fill from printed fields if no MRZ** — the fallback described above, on by default; turn it off if you'd rather a missing MRZ just fail outright than get a best-effort, needs-review fill

Notes/limitations:
- Needs an internet connection every scan (it's a cloud API, not offline)
- HEIC photos (default format on newer iPhones) aren't supported by OCR.space — use JPG/PNG
- Bulk Browse only fills rows that already exist when you click it. On the seats-booking page (dynamic adult/child/infant counts), it does **not** automatically bump the passenger count to match the number of photos the way the old bulk-paste box did — set the adult/child/infant counts first so the rows exist, then Bulk Browse. On the Edit Booking page this doesn't apply since the row count there is already fixed by the booking.
- A blurry or poorly-lit photo will still fail to OCR cleanly; the confirmation label is there specifically so a bad scan doesn't silently write wrong passenger data

### Auto-login (Login tab)

The original userscript had an auto-login block with the Skypass email and password hardcoded as plaintext literals directly in the script file — it shipped disabled/commented-out for exactly that reason. The popup's **Login** tab replaces it properly: enter your Skypass email and password there once, toggle **Auto-login to Skypass** on, and `sptModules/skypass-auto-login.js` fills and submits the login form for you on your next visit to the login page.

Credentials are stored in `chrome.storage.sync` the same way every other setting (including the OCR API key) already is — nothing is hardcoded in any file, and the feature defaults **off** until both a toggle and both fields are set. This is still plaintext at rest (browser extensions have no practical way to encrypt storage without a master password prompt on every page load), so only enable it on a machine/profile you trust, the same tradeoff as using any browser's built-in saved-password feature.

### Design system

The popup is styled against Google's **Material Design 3** ("Material You"), using the actual published M3 tokens rather than an invented palette:

- **Color** — the M3 baseline scheme seeded from `#6750A4` (primary/on-primary/primary-container/surface-container tonal ladder/outline, both light and dark variants) — [M3 color roles](https://m3.material.io/styles/color/roles)
- **Switch** — 52×32dp track, 16dp unselected thumb growing to 24dp when selected, per the M3 Switch spec — [M3 switch specs](https://m3.material.io/components/switch/specs)
- **Navigation** — the tab bar follows the M3 Navigation Bar pattern: a pill-shaped `secondary-container`-colored indicator behind the active icon, not a plain underline
- **Buttons** — filled (primary) and outlined button styles use M3's fully-rounded "full" corner, not a soft rectangle
- **Snackbar** — the save confirmation toast uses the M3 Snackbar spec: `inverse-surface`/`inverse-on-surface` colors and a 4px ("extra-small") corner, deliberately *not* pill-shaped, to match the spec's distinction between buttons and snackbars
- **Shape/type scale** — corner radii and font sizes map to M3's shape scale (xs/sm/md/lg/xl/full) and type scale (title/body/label tokens), scaled down to fit a compact popup
- **Icons** — real Google Material Symbols (outlined), inline SVG so they tint with the theme via `currentColor` instead of colored emoji. Path data was pulled straight from [google/material-design-icons](https://github.com/google/material-design-icons) and visually verified (rendered + screenshotted) before use — one batch of the initial icon lookups had returned mismatched paths, which is why they're now hardcoded in `popup.js`'s `ICONS` map rather than re-fetched at runtime

## Notes on the conversion

- No Tampermonkey `GM_*` APIs were used in the originals (`@grant none`), so the code runs as-is inside MV3 content scripts — no shims needed.
- Each *feature* is now its own content script file (see "File layout" above), scoped to the same `@match` pattern the original userscript used (plus the `www.` subdomain variant for safety). `utils/settings.js` is injected first in every entry so settings are available before any feature code runs; it's guarded against being injected more than once into the same page.
- The original script had two fully commented-out, non-executing blocks: an auto-login snippet (hardcoded email/password) and a "freeze filter div on scroll" experiment. The auto-login behavior is now a real, working, opt-in feature — see "Auto-login (Login tab)" above. The "freeze filter div" experiment had no live code in any userscript version and wasn't carried forward.
- The "Download PDF" feature still loads `html2canvas`/`jsPDF` from a CDN, but it injects that `<script>` tag into the **Skypass page itself** (not an extension page), so it's unaffected by the extension's own CSP — same behavior as under Tampermonkey.
- Icons are cropped from the real Skypass logo (`icons/skypass-logo-source.png`, the full wordmark) — the airplane/flight-path mark was isolated and recolored white on a rounded square in the brand's own blue (`#275981`, sampled directly from the source file), since the full wordmark's fine tagline text isn't legible at 16-48px. Regenerate at `icons/icon16.png`, `icon48.png`, `icon128.png` if the source logo changes.

## Updating

Since this loads unpacked from disk, edits to any file under `utils/`, `sptModules/`, `ebModules/` (or `popup.html`/`popup.js`) take effect after clicking the refresh icon on the extension card in `chrome://extensions` and reloading the Skypass tab.
