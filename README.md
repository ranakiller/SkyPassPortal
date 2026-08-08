# Skypass Ticketing Portal Enhancements (Chrome/Edge Extension)

Standalone MV3 extension version of the three Tampermonkey userscripts:

- `Skypass Ticketing Portal Enhancements` → split into the 21 `sptModules/skypass-*.js` feature modules below
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
  - `dom-utils.js` — `window.sptWaitForSelector(selector, callback)`, see "Reliability: waiting for content" below
- **`sptModules/`** — `skypass.pk/*` page features (from the old `skypass-enhancements.js`), one file per feature toggle in the popup, plus `find-seats.js` (from the old `SPT Find Seats on All Flights` userscript, active on the book-tickets page):
  `skypass-right-click-fix.js`, `skypass-days-calculator.js`, `skypass-flight-filters.js`, `skypass-whatsapp-copy.js`, `skypass-seats-copy.js`, `skypass-confirmed-booking-copy.js`, `skypass-cancelled-overlay-fix.js`, `skypass-cancelled-mrz.js`, `skypass-edit-booking-link.js`, `skypass-dob-doe-formatting.js`, `skypass-mrz-bulk-fill.js`, `skypass-bulk-browse.js`, `skypass-max-adults-finder.js`, `skypass-auto-check-review.js`, `skypass-print-booking-button.js`, `skypass-download-csv.js`, `skypass-booking-print-title.js`, `skypass-umrah-packages-copy.js`, `skypass-pdf-download.js`, `skypass-suppress-autoprint.js`, `skypass-auto-login.js`, `find-seats.js`
- **`ebModules/`** — `agents/agent_ticket/*` (Edit Booking) page features (from the old `edit-booking-functions.js`):
  `editbooking-nav-buttons.js`, `editbooking-mrz-bulk-fill.js`, `editbooking-bulk-browse.js`, `editbooking-auto-check-review.js`

Two intentional exceptions kept multiple original sub-blocks together in one file each, since they share DOM state (not just a settings gate) and splitting them further would just add cross-file coupling without actually isolating anything:
- `skypass-mrz-bulk-fill.js` / `editbooking-mrz-bulk-fill.js` — the bulk-paste textarea, its MRZ-line cleanup, and the per-row autofill/input-box creation all read and write the same `#bulkMRZInput` element and table rows.
- The Bulk Browse button (`skypass-bulk-browse.js` / `editbooking-bulk-browse.js`) is deliberately its own separate file even though it's related to MRZ bulk-fill, since it's newer/higher-risk OCR code that benefits from being isolated from the older, more stable paste-box logic.

## Reliability: waiting for content instead of the page's `load` event

Most of Skypass's booking tables and lists (cancelled bookings, confirmed-booking view, seats summary, flight search results) render via the page's *own* data fetch, which finishes independently of - and often after - the browser's `load` event. Early versions of several features (`skypass-cancelled-overlay-fix.js`, `skypass-whatsapp-copy.js`, `skypass-seats-copy.js`, `skypass-confirmed-booking-copy.js`, `skypass-cancelled-mrz.js`, `skypass-flight-filters.js`, and others) checked for their target element exactly once on `load` with no retry - so depending on network speed and cache state, the check would randomly run before the content existed and the feature would silently do nothing that page-load. That's the root cause of the "works sometimes, not other times" reports.

Every one of those features (plus a few more found during the same sweep: `skypass-edit-booking-link.js`, `skypass-print-booking-button.js`, `skypass-mrz-bulk-fill.js`/`editbooking-mrz-bulk-fill.js`, `skypass-auto-login.js`, `skypass-pdf-download.js`, `find-seats.js`, `editbooking-nav-buttons.js`, `editbooking-bulk-browse.js`) now uses `window.sptWaitForSelector(selector, callback)` (`utils/dom-utils.js`) instead: it checks immediately (so already-rendered content fires with zero delay, same as before) and otherwise waits via a single MutationObserver shared across every feature on the page - not one observer per feature - until the element actually exists, how ever long that takes. Features that already had their own working self-healing retry (`skypass-days-calculator.js`, `skypass-download-csv.js`, `skypass-auto-check-review.js`/`editbooking-auto-check-review.js`, `skypass-dob-doe-formatting.js`, `skypass-bulk-browse.js`'s ongoing Confirm-Booking placement observer, `skypass-booking-print-title.js`'s `setTimeout` retry loop) were left as-is.

Three bugs in `skypass-flight-filters.js` (the City/Airline/Sector/Day filter buttons), the first two compounding each other:
- It gated itself on an *exact* string match against the page URL, so it always failed on `https://www.skypass.pk/...` or with so much as a trailing slash or query string, even though this file is wired into the manifest entry that matches both the naked and `www.` domain. Changed to a tolerant `.includes(...)` check, matching the convention already used for page-scoping everywhere else in this codebase.
- **That exact-match check itself was checking the wrong page** - `/agents/book-tickets` instead of the original userscript's real target, `/agents/book-group-tickets`. This was already wrong before this reliability sweep touched the file (likely a slip during the original port), so the feature was never actually reachable on the page it's meant for. Confirmed against the real userscript source and corrected.
- Once actually running on the right page, it still only ever produced the "Clear Filters" button with none of the actual City/Airline/Sector filter buttons next to it. That button is created unconditionally, while the rest are built by scanning `table tbody tr` rows - and waiting for `.col-lg-12` (an outer container) wasn't enough, since that container renders *before* the actual flight/airline rows populate inside it via their own later fetch. Now waits for an actual `tr.airline` row to exist first, guaranteeing real data is present by the time the scan runs.

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

**Setup required:** get a free API key at [ocr.space/ocrapi](https://ocr.space/ocrapi) (no credit card, 25,000 requests/month, 500/day) and paste it into the popup's **Edit → Passport photo OCR** section. Without a key, clicking Browse will show an error telling you to add one; you can also turn the whole feature off there.

The bulk MRZ paste textarea (from the original userscript) stays visible and usable at all times, alongside the per-row Browse buttons and Bulk Browse - it's not hidden when OCR is enabled. An earlier version of this extension did hide it whenever OCR was on (reasoning it was now redundant), but that wasn't what the original userscript did and the user asked for that original always-visible behavior back.

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

### Copy button on the Umrah packages page

Each package card on `agents/book-umrah-packages-api` gets a "Copy" button next to its existing "PDF" link, producing a WhatsApp-ready message. The top of the message is deliberately minimal - just the airline name and package duration (`` `SV-Saudi Arabian Airlines *21 Days*` ``), then both flight legs (in the same `` `FLIGHT DATE ROUTE TIME` `` code-block style used by every other copy button in this extension), then the baggage allowance line. No package price is shown up there. The card's available-seats count is appended as `` `💺 N` `` to just the first (departure) leg's line, since that's the one line per date that's actually specific to that date's inventory - in the bulk "Copy All" message (below), each merged date keeps its own seat count on its own first line even though the rest of that group's details are shared.

Below that is a `Package Options in PKR (Per Person)` section listing every Makkah/Madinah hotel combination on the card, each one numbered `*Package # 1*`, `*Package # 2*`, etc. (restarting at 1 for every card/group), with the hotel labels bolded WhatsApp-style (`*MAK*:`/`*MED*:`) and each of the four room-type prices on its own `* `-prefixed line (`* Sharing:`/`* Quad:`/`* Triple:`/`* Double:`) - the leading `"* "` is what makes WhatsApp render them as an indented list under the hotel pair. A literal `0` price (meaning that room type isn't actually available for that hotel combination) is shown as `N/A` instead, never as a bare zero.

The whole generated message can optionally be wrapped in your own text: the popup's **Umrah Packages page** section (under the Search tab) has a **Message prefix** and **Message suffix** field, both empty/off by default and deliberately not hardcoded, since this is meant to be personalized (a greeting, a contact number, a signature) rather than baked into the extension. When set, the prefix is prepended and the suffix appended, each separated from the message by a blank line.

**Bulk copy ("Copy All"):** a second button sits directly before the page's own **Clear Filters** button (in `.api-filter-controls`, next to the Sector/Airline/Hotel Makkah/Hotel Madina dropdowns) and builds one combined message from every *currently visible* package card - cards a page filter has hidden (`display: none`) are skipped entirely, so this always reflects whatever's actually on screen. Cards are walked in DOM order and folded into groups: consecutive cards with the same airline, route (the page's own `data-sector` attribute), duration, and hotel line-up (i.e. the same underlying package, just offered on a different departure date) get merged into one group, where only the flight-leg lines repeat per date - the baggage line and the hotel/price table are written once per group (taken from the first card in it), not once per card.

Room prices are compared with a tolerance rather than requiring an exact match - real per-date pricing on this page drifts by small amounts even for what's otherwise the same package (a few hundred PKR here or there), so requiring an exact match caused near-identical dates to wrongly split into separate groups/messages instead of merging. The **Price drift tolerance (PKR)** field (popup > Search > Umrah Packages page, default `1000`) controls how big that gap can be before it stops counting as "the same price": every one of the four room prices, across every hotel row, must be within that many PKR of the group's first date for a new date to fold into it - a room flipping between unavailable (`N/A`) and having a real price always counts as a difference regardless of tolerance. A gap bigger than the tolerance is treated as a genuine price change and starts a brand new group, so the displayed price table (taken from the first date in the group) never misrepresents any date in it by more than that tolerance. A genuinely different airline, route, duration, or hotel selection also always starts a new group, written as its own self-contained section (airline + duration, its date(s), baggage, hotel/price table) separated from the previous one by a blank line. The prefix/suffix settings above wrap the entire bulk message once, not each group individually.

Hotel names are cleaned up for display: Title-Cased, with a trailing `/ Similar` qualifier stripped, and their meta text turned into either `— 650m` (a walking distance) or `(Shuttle Service)` (no distance given). The word "Hotel" is never artificially appended to a name, even though some real package listings do that inconsistently - there was no reliable rule to reproduce that distinction, so this always shows the real hotel name as-is.

The hotel/room-price table (`.hotel-pricing-wrap`) is hidden behind a "Show Details" toggle (`display: none` until clicked), but it's fully present in the DOM either way - reading `.textContent` from a hidden element works exactly the same as a visible one, so the button never needs to click that toggle first to get at the data.

**City/Airline/Sector/Day filter buttons:** `skypass-umrah-packages-filters.js` adds the same button-style, cumulative-AND filter UI already used on the Book Group Tickets page (`skypass-flight-filters.js`) here too, filtering package cards instead of table rows. Filter categories (Airline, Sector, Day, and origin/destination City) are built once from whichever cards are visible when the page's data first loads, then inserted as their own rows directly below the page's own `.api-filter-controls` bar. Clicking a filter button hides any card that doesn't match every currently-checked category (AND across categories, OR within one), bolds the labels still represented among visible cards, and a "Clear Filters" button (in the Day row, same as the tickets page) resets everything back to visible.

This is a second, independent filtering mechanism alongside the page's own native Sector/Airline/Hotel Makkah/Hotel Madina dropdowns - both act by setting `card.style.display` directly, so using one after the other can undo what the other just hid or showed (e.g. a card the native dropdowns hid can get shown again by our button filters if it otherwise matches). That's an accepted limitation rather than something this reconciles, since only the button-style filters were asked for here, not a merge of the two systems.

Package cards render as part of the page's own data fetch, so this waits for at least one to exist (`window.sptWaitForSelector`) before processing, then keeps a lightweight `MutationObserver` running to catch any more cards that load afterward (pagination, filtering, etc.) - safe to re-run on every mutation since adding a button is skipped for cards that already have one.

### Download PDF (booking-print page)

A "Download PDF" button is appended after all of the booking-print page's own content (it waits for the ticket content to render first, so it's genuinely last - not fixed/floating over anything). Two rendering approaches were tried before landing on the current one:

1. **html2canvas + jsPDF, loaded from cdnjs** — abandoned. The `<script>` tag loading these from cdnjs is injected into the *host page*, so it's subject to that page's own Content-Security-Policy (not the extension's) - and this page's CSP blocks `cdnjs.cloudflare.com` outright, so the load always silently failed.
2. **html2canvas + jsPDF, bundled locally under `vendor/`** — also abandoned, for a more fundamental reason: this page's layout uses CSS Grid extensively (`.grid-container { display: grid; ...}`, `.line-12`/`.line-8`/etc. using `grid-column: span N`), and html2canvas has long-standing, well-known incomplete support for CSS Grid. It reliably collapsed/misplaced the layout and dropped the colored section backgrounds (the blue header, the orange flight-segment bar) - comparing an actual native browser print of this page against html2canvas's output on the same page made the gap obvious.

The page's own markup ends with an inline `<script>window.print();</script>` - it was already built to be printed by the browser's real print engine, not screenshotted. So the button now asks `background.js` to render the tab via the Chrome DevTools Protocol's `Page.printToPDF` command (through the `chrome.debugger` API), which **is** that same real print engine, just invoked programmatically instead of through the print dialog - guaranteed to match a manual Ctrl+P exactly, including CSS Grid, since it's the identical rendering path. `printBackground: true` is required in the CDP call (browsers don't print background colors by default) and `preferCSSPageSize: true` honors the page's own `@page { size: A4; margin: 0; }` rule. The resulting PDF (returned as base64) is handed to `chrome.downloads.download()` as a `data:` URL.

This needs the `debugger` and `downloads` permissions in `manifest.json`. The one real UX cost: `chrome.debugger.attach()` fails if something else is already debugging that tab (e.g. DevTools is open on it) - that's surfaced as a normal error alert rather than a stuck button, telling the user to close DevTools and retry.

Keeping the button itself out of the generated PDF took two attempts:
- First try (removed after it proved ineffective): `@media print { #spt-pdf-download-btn { display: none !important; } }`, relying on `Page.printToPDF` rendering under `print` CSS media. It doesn't reliably do that on its own, so `background.js` also explicitly called `Emulation.setEmulatedMedia({ media: 'print' })` before `Page.printToPDF` (the same switch a real Ctrl+P makes implicitly) and reset it to `''` afterward - but the button still showed up baked into the PDF (mid-click text and all), meaning `Page.printToPDF`'s own internal render pass doesn't consistently honor that emulation for this purpose. Since the emulation calls weren't achieving what they were added for, they were removed from `background.js` rather than left in as dead weight.
- What actually works, and is what's in place now: `skypass-pdf-download.js` sets the button to `display: none !important` directly the instant it's clicked (not gated by any media query), and restores it once the background script's response comes back (success or failure). With nothing left in the layout to render, there's no CSS behavior left to depend on - this is what the PDF actually reflects. The `@media print` rule *does* stay in place, purely for a manual Ctrl+P on this page (which - unlike `Page.printToPDF` - does reliably apply print media) - it's a different rendering pipeline than the button's own capture, so it still earns its keep there.

**Auto-print suppression:** this page's own markup also ends with an inline `<script>window.print();</script>` that pops the native print dialog on every single page load - redundant now that the button generates an identical PDF on demand. `sptModules/skypass-suppress-autoprint.js` neutralizes `window.print` before that inline script runs. This one has to be declared with `"world": "MAIN"` and `"run_at": "document_start"` in `manifest.json`, unlike every other content script in this extension (which run in the default *isolated* world, sharing globals with each other via `window.sptGetSettings` etc. but not with the page's own scripts). Overriding `window.print` from the isolated world would only affect other isolated-world content scripts - the page's own inline script runs in the *main* world and has its own separate global object, so silencing it requires actually running code there. Because `"world": "MAIN"` scripts have no access to `chrome.*` extension APIs (including `chrome.storage`), this suppression isn't gated by the `enablePdfDownload` toggle the way everything else is - it's unconditional on the booking-print page. It only blocks the JS-triggered dialog; Ctrl+P and the browser's own Print... menu item go through the browser directly, independently of `window.print`, and still work normally.

The button's look doesn't rely on the page's own CSS at all (inline styles with `!important`, matching the Download CSV button's color scheme) - the booking-print page turned out not to load the site's normal `bg-blue-1`/`button`/`h-50` class definitions, so a button styled only with those classes rendered unstyled.

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
- The "Download PDF" feature renders via the Chrome DevTools Protocol's `Page.printToPDF` (through `background.js`) rather than a client-side rendering library - see "Download PDF (booking-print page)" above for why.
- Icons are cropped from the real Skypass logo (`icons/skypass-logo-source.png`, the full wordmark) — the airplane/flight-path mark was isolated and recolored white on a rounded square in the brand's own blue (`#275981`, sampled directly from the source file), since the full wordmark's fine tagline text isn't legible at 16-48px. Regenerate at `icons/icon16.png`, `icon48.png`, `icon128.png` if the source logo changes.

## Updating

Since this loads unpacked from disk, edits to any file under `utils/`, `sptModules/`, `ebModules/` (or `popup.html`/`popup.js`/`background.js`) take effect after clicking the refresh icon on the extension card in `chrome://extensions` and reloading the Skypass tab.
