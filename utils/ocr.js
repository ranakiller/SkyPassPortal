// Passport-photo -> MRZ OCR, via OCR.space (https://ocr.space/ocrapi).
// The actual network call happens in background.js (a service worker fetch
// is not subject to the host page's CSP/CORS the way a content-script fetch
// might be), reached here via chrome.runtime.sendMessage.
(function () {
    if (window.sptScanPassportImage) return;

    function fileToDataUrl(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onerror = () => reject(new Error('Could not read the selected file.'));
            reader.onload = () => resolve(reader.result);
            reader.readAsDataURL(file);
        });
    }

    function requestOcr(base64Image, settings) {
        return new Promise((resolve, reject) => {
            chrome.runtime.sendMessage({
                type: 'SPT_OCR_REQUEST',
                base64Image,
                apiKey: settings.ocrApiKey,
                engine: settings.ocrEngine
            }, (response) => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                if (!response || !response.ok) {
                    reject(new Error((response && response.error) || 'OCR request failed.'));
                    return;
                }
                resolve(response.text || '');
            });
        });
    }

    // Pulls a single 88-char MRZ string (the two TD3 lines concatenated, same
    // convention the existing bulk-paste box already uses) out of cleaned OCR
    // text, or throws if nothing MRZ-shaped was found.
    function extractSingleMrz(cleanedText) {
        const lines = cleanedText.split('\n').map(l => l.trim()).filter(Boolean);

        let mrz = null;
        if (lines.length === 1 && lines[0].length >= 80 && lines[0].startsWith('P')) {
            mrz = lines[0];
        } else if (lines.length >= 2 && lines[0].startsWith('P') && lines[0].length >= 40) {
            mrz = (lines[0] + lines[1]);
        }

        if (!mrz) {
            throw new Error('Could not find a valid MRZ in that photo. Try a clearer, well-lit shot of the bottom of the passport bio page.');
        }

        return mrz.padEnd(88, '<').slice(0, 88);
    }

    const MONTH_ABBR = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

    function toYYMMDD(y, mo, d) {
        y = String(y); mo = String(mo); d = String(d);
        if (y.length === 2) y = (Number(y) <= 35 ? '20' : '19') + y;
        const mm = mo.padStart(2, '0');
        const dd = d.padStart(2, '0');
        if (Number(mm) < 1 || Number(mm) > 12 || Number(dd) < 1 || Number(dd) > 31) return null;
        return y.slice(-2) + mm + dd;
    }

    // Handles the date formats passport bio pages actually print in:
    // dd/mm/yyyy, dd-mm-yyyy, dd MMM yyyy (e.g. "15 OCT 1985"), yyyy-mm-dd.
    // Returns MRZ-style YYMMDD, or null if nothing recognizable was found.
    function parseFlexibleDateToYYMMDD(str) {
        if (!str) return null;
        str = str.trim();

        let m = str.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
        if (m) return toYYMMDD(m[3], m[2], m[1]);

        m = str.match(/\b(\d{1,2})\s+([A-Za-z]{3,})\.?\s+(\d{4})\b/);
        if (m) {
            const idx = MONTH_ABBR.indexOf(m[2].slice(0, 3).toUpperCase());
            if (idx >= 0) return toYYMMDD(m[3], idx + 1, m[1]);
        }

        m = str.match(/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/);
        if (m) return toYYMMDD(m[1], m[2], m[3]);

        return null;
    }

    // Label -> regex, matched against each OCR line. Passport bio pages (VIZ -
    // the printed page, as opposed to the MRZ strip) are fairly consistent
    // about these labels internationally (ICAO Doc 9303 recommends them),
    // though wording/spacing varies enough that this is a best-effort match,
    // not a guaranteed one.
    const VIZ_LABELS = {
        passportNumber: /passport\s*no\.?|passport\s*number|document\s*no\.?/i,
        surname: /sur\s*name/i,
        givenname: /given\s*name\(?s?\)?|forename\(?s?\)?/i,
        nationality: /nationality/i,
        dateOfBirth: /date\s*of\s*birth|d\.?\s*o\.?\s*b\.?/i,
        dateOfExpiry: /date\s*of\s*expiry|expiry\s*date|date\s*of\s*expiration/i,
        gender: /^sex\b|\bsex\s*[:\-]/i
    };

    // Free-text nationality -> ISO3 code, for the common cases (a Pakistan-
    // based agency's clientele) when the printed page spells it out
    // ("PAKISTANI") rather than using the 3-letter code directly.
    const NATIONALITY_NAME_TO_CODE = {
        PAKISTAN: 'PAK', PAKISTANI: 'PAK',
        SAUDIARABIA: 'SAU', SAUDI: 'SAU',
        UNITEDARABEMIRATES: 'ARE', EMIRATI: 'ARE',
        UNITEDKINGDOM: 'GBR', BRITISH: 'GBR',
        UNITEDSTATES: 'USA', AMERICAN: 'USA',
        INDIA: 'IND', INDIAN: 'IND',
        BANGLADESH: 'BGD', BANGLADESHI: 'BGD',
        AFGHANISTAN: 'AFG', AFGHAN: 'AFG'
    };

    // True if a line looks like one of our OWN known field labels (as opposed
    // to an actual value). Passport bio pages are commonly laid out in a
    // multi-column grid - e.g. "Type | Country Code | Passport Number" on one
    // visual row, then "P | PAK | VJ0160691" on the next - and OCR frequently
    // emits that as a whole block of label lines followed by a whole block of
    // value lines, not neat label-then-its-own-value pairs. Skipping over
    // lines that are themselves recognized labels (rather than blindly taking
    // "the very next line") is what makes the scan below survive that layout.
    function isAnyLabelLine(line) {
        return Object.values(VIZ_LABELS).some(re => re.test(line));
    }

    // Finds a label's value: same OCR line first, then scans forward through
    // subsequent lines - skipping any that are themselves other field labels -
    // for the first one satisfying `accept(line)`. Free-text fields (surname
    // etc.) pass no `accept` and just take the first non-label line; fields
    // with a strict shape (a passport number, a date) pass an `accept` that
    // only takes a line actually shaped like one, skipping other stray text
    // in between (like a second value column) until it finds a match.
    function findLabelValue(lines, labelRegex, accept) {
        for (let i = 0; i < lines.length; i++) {
            const match = lines[i].match(labelRegex);
            if (!match) continue;

            const sameLine = lines[i].slice(match.index + match[0].length).replace(/^[\s:.\-]+/, '').trim();
            if (sameLine && !isAnyLabelLine(sameLine) && (!accept || accept(sameLine))) return sameLine;

            for (let j = i + 1; j < lines.length; j++) {
                const next = lines[j].trim();
                if (!next || isAnyLabelLine(next)) continue;
                if (!accept) return next;
                if (accept(next)) return next;
            }
        }
        return '';
    }

    // Best-effort extraction of the individually-printed passport fields (the
    // "visual inspection zone"), used when no MRZ could be found at all - e.g.
    // a photo cropped to just the bio page, or an MRZ strip that's
    // damaged/covered/unreadable/a 2D barcode instead of OCR-B text. Returns
    // whichever fields were actually found (a partial result is still useful -
    // whatever we get gets filled in, the rest is left for manual entry), or
    // null only if genuinely nothing usable was found at all.
    function extractVisualFields(rawText) {
        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);

        const passportNumberValue = findLabelValue(lines, VIZ_LABELS.passportNumber, v => /^[A-Z0-9]{5,10}$/i.test(v));
        const passportNumber = (passportNumberValue.match(/[A-Z0-9]{5,10}/i) || [''])[0].toUpperCase();

        const dobYYMMDD = parseFlexibleDateToYYMMDD(findLabelValue(lines, VIZ_LABELS.dateOfBirth, v => !!parseFlexibleDateToYYMMDD(v))) || '';
        const expiryYYMMDD = parseFlexibleDateToYYMMDD(findLabelValue(lines, VIZ_LABELS.dateOfExpiry, v => !!parseFlexibleDateToYYMMDD(v))) || '';
        const surname = findLabelValue(lines, VIZ_LABELS.surname).replace(/[^A-Za-z\s]/g, '').trim();
        const givenname = findLabelValue(lines, VIZ_LABELS.givenname).replace(/[^A-Za-z\s]/g, '').trim();

        if (!passportNumber && !dobYYMMDD && !expiryYYMMDD && !surname && !givenname) {
            return null;
        }

        const genderRaw = findLabelValue(lines, VIZ_LABELS.gender, v => /^[MF]/i.test(v)).toUpperCase();
        const gender = genderRaw.startsWith('F') ? 'F' : (genderRaw.startsWith('M') ? 'M' : '');

        const nationalityRaw = findLabelValue(lines, VIZ_LABELS.nationality).toUpperCase().replace(/[^A-Z]/g, '');
        let nationality = '';
        if (nationalityRaw.length === 3) {
            nationality = nationalityRaw;
        } else if (NATIONALITY_NAME_TO_CODE[nationalityRaw]) {
            nationality = NATIONALITY_NAME_TO_CODE[nationalityRaw];
        }

        return { passportNumber, surname, givenname, dobYYMMDD, expiryYYMMDD, gender, nationality };
    }

    // Main entry point: File -> { source: 'mrz', mrz } or { source: 'viz', fields },
    // or a rejected promise with a message safe to show the user directly.
    // 'mrz' is a real, checksum-shaped MRZ read straight off the image. 'viz'
    // means no MRZ was found but some printed fields were (see
    // extractVisualFields) - callers should apply those directly to the row's
    // own field inputs and flag it for manual review, not treat it as a
    // full-confidence scan.
    window.sptScanPassportImage = async function (file, settings) {
        if (!settings.ocrApiKey) {
            throw new Error('No OCR.space API key set. Add a free key in the extension settings popup.');
        }

        const base64Image = await fileToDataUrl(file);
        const rawText = await requestOcr(base64Image, settings);
        const cleaned = window.sptCleanMrzText(rawText);

        try {
            return { source: 'mrz', mrz: extractSingleMrz(cleaned) };
        } catch (mrzErr) {
            if (settings.enableVizFallback === false) throw mrzErr;

            const fields = extractVisualFields(rawText);
            if (!fields) throw mrzErr;

            return { source: 'viz', fields };
        }
    };

    // Extracts just the human-readable name from an MRZ string, for status
    // labels. Not the authoritative parse - each page's own parseMRZ (run via
    // the mrzInput 'input' listener) still owns the actual passenger data.
    function nameFromMrz(mrz) {
        const nameSection = mrz.slice(5, 44);
        const [surnameRaw, givennameRaw] = nameSection.split('<<');
        const surname = (surnameRaw || '').replace(/<+/g, ' ').trim();
        const givenname = (givennameRaw || '').replace(/<+/g, ' ').trim();
        return (surname + (givenname ? ', ' + givenname : '')).trim();
    }

    // Writes whichever VIZ-extracted fields are present directly into a row's
    // own field inputs (surname/givenname/passportNumber/dob/expiry/
    // nationality - any subset, whatever `rowFieldEls` exposes for this page
    // and whatever `vizFields` actually found). Returns the list of
    // human-readable field names actually filled, for status messages.
    window.sptApplyVizFields = function (vizFields, rowFieldEls) {
        const filled = [];
        if (!vizFields || !rowFieldEls) return filled;

        const directMap = [
            ['surname', 'surname', 'Surname'],
            ['givenname', 'givenname', 'Given Name'],
            ['passportNumber', 'passportNumber', 'Passport No'],
            ['nationality', 'nationality', 'Nationality']
        ];
        directMap.forEach(([fieldKey, elKey, label]) => {
            const value = vizFields[fieldKey];
            const el = rowFieldEls[elKey];
            if (value && el) {
                el.value = value;
                filled.push(label);
            }
        });

        if (vizFields.dobYYMMDD && rowFieldEls.dob) {
            rowFieldEls.dob.value = window.sptFormatYYMMDD(vizFields.dobYYMMDD);
            filled.push('DOB');
        }
        if (vizFields.expiryYYMMDD && rowFieldEls.expiry) {
            rowFieldEls.expiry.value = window.sptFormatYYMMDD(vizFields.expiryYYMMDD);
            filled.push('Expiry');
        }

        return filled;
    };

    // The small navy "Copy"-style button class already used throughout this
    // extension's other injected buttons (see skypass-enhancements.js), reused
    // here so the Browse button matches the Skypass theme instead of looking
    // like a generic unstyled Bootstrap button.
    const SPT_BTN_CLASS = 'btn bg-dark-4 btn_sm text-white';

    // Real Google Material Symbols (outlined) path data, fetched from
    // google/material-design-icons and visually verified before use - same
    // approach as the popup's icon set, so these render as crisp scalable
    // vectors instead of colored emoji.
    const ICON_FOLDER = 'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h240l80 80h320q33 0 56.5 23.5T880-640v400q0 33-23.5 56.5T800-160H160Zm0-80h640v-400H447l-80-80H160v480Zm0 0v-480 480Z';
    const ICON_CHECK_CIRCLE = 'm424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z';
    const ICON_CANCEL = 'm336-280 144-144 144 144 56-56-144-144 144-144-56-56-144 144-144-144-56 56 144 144-144 144 56 56ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z';
    const ICON_WARNING = 'm40-120 440-760 440 760H40Zm138-80h604L480-720 178-200Zm302-40q17 0 28.5-11.5T520-280q0-17-11.5-28.5T480-320q-17 0-28.5 11.5T440-280q0 17 11.5 28.5T480-240Zm-40-120h80v-200h-80v200Zm40-100Z';

    function makeIconSvg(pathD, sizePx, fill) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 -960 960 960');
        svg.setAttribute('width', String(sizePx));
        svg.setAttribute('height', String(sizePx));
        svg.style.display = 'block';
        svg.style.fill = fill;
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', pathD);
        svg.appendChild(path);
        return svg;
    }

    // A real spinning-circle loading indicator (not just a dimmed icon) needs
    // a @keyframes rule, which can't be expressed via inline style - inject it
    // once into the host page.
    function ensureSpinnerStyle() {
        if (document.getElementById('spt-ocr-spinner-style')) return;
        const style = document.createElement('style');
        style.id = 'spt-ocr-spinner-style';
        style.textContent = '@keyframes spt-ocr-spin { to { transform: rotate(360deg); } }' +
            '.spt-ocr-spinner { display: inline-block; width: 14px; height: 14px; ' +
            'border: 2px solid rgba(0,0,0,.15); border-top-color: #2b5876; border-radius: 50%; ' +
            'animation: spt-ocr-spin .7s linear infinite; }';
        document.head.appendChild(style);
    }
    ensureSpinnerStyle();

    // A native `title` attribute tooltip has the browser's own ~1s hover
    // delay baked in, which nothing in CSS/JS can shorten. This is a tiny
    // custom tooltip instead - a single reused element shown/hidden
    // immediately on mouseenter/mouseleave, so it appears the instant the
    // mouse is over the icon.
    let tooltipEl = null;
    function ensureTooltipEl() {
        if (tooltipEl) return tooltipEl;
        tooltipEl = document.createElement('div');
        tooltipEl.style.position = 'fixed';
        tooltipEl.style.zIndex = '999999';
        tooltipEl.style.background = '#1a1a1a';
        tooltipEl.style.color = '#fff';
        tooltipEl.style.padding = '4px 8px';
        tooltipEl.style.borderRadius = '4px';
        tooltipEl.style.fontSize = '11px';
        tooltipEl.style.lineHeight = '1.3';
        tooltipEl.style.maxWidth = '260px';
        tooltipEl.style.pointerEvents = 'none';
        tooltipEl.style.display = 'none';
        document.body.appendChild(tooltipEl);
        return tooltipEl;
    }

    // Attaches an instant tooltip to `el`, reading its text fresh from
    // `getMessage()` on every hover (since the message changes as the row's
    // scan state changes over time).
    function attachInstantTooltip(el, getMessage) {
        el.addEventListener('mouseenter', () => {
            const message = getMessage();
            if (!message) return;
            const tip = ensureTooltipEl();
            tip.textContent = message;
            tip.style.display = 'block';
            const rect = el.getBoundingClientRect();
            tip.style.left = rect.left + 'px';
            tip.style.top = (rect.bottom + 4) + 'px';
        });
        el.addEventListener('mouseleave', () => {
            if (tooltipEl) tooltipEl.style.display = 'none';
        });
    }

    // Maps a row's mrzInput -> { statusEl, button, message }, so both the
    // per-row button AND the bulk-browse flow (which updates rows it never
    // itself attached a click handler to) can show the same loading/tick/
    // cross feedback, disable/enable that row's own Browse button, and keep
    // the tooltip text current.
    const rowUiEls = new WeakMap();

    function setRowStatus(mrzInput, state, message) {
        const ui = rowUiEls.get(mrzInput);
        if (!ui) return;
        const { statusEl, button } = ui;

        statusEl.innerHTML = '';
        ui.message = message || '';
        button.disabled = state === 'scanning';

        if (state === 'scanning') {
            const spinner = document.createElement('span');
            spinner.className = 'spt-ocr-spinner';
            statusEl.appendChild(spinner);
        } else if (state === 'success') {
            statusEl.appendChild(makeIconSvg(ICON_CHECK_CIRCLE, 16, '#1a7f37'));
        } else if (state === 'partial') {
            // Filled from printed fields, not a real MRZ - visibly distinct
            // from a full-confidence green tick so it gets a second look
            // before the booking is confirmed.
            statusEl.appendChild(makeIconSvg(ICON_WARNING, 16, '#b8860b'));
        } else if (state === 'error') {
            statusEl.appendChild(makeIconSvg(ICON_CANCEL, 16, '#c0392b'));
        }
        // state === 'idle': leave empty, nothing scanned yet for this row.
    }

    // Lets the bulk-browse flow (in each content script) update a row's
    // loading/tick/cross even though it never touches that row's own Browse
    // button/click handler.
    window.sptSetOcrRowStatus = setRowStatus;

    // Replaces the visible MRZ text box with an icon-only folder button that
    // scans a passport photo instead. On a real MRZ read, `mrzInput`'s value
    // is set and an 'input' event dispatched, so whatever autofill listener
    // the caller already attached to it fires unchanged. When no MRZ is found
    // but printed fields were readable, `rowFieldEls` (optional) -
    // { surname, givenname, passportNumber, dob, expiry, nationality } DOM
    // elements for this same row - gets whichever of those fields were found
    // written directly. Idempotent: safe to call once per input.
    window.sptAttachOcrBrowseButton = function (mrzInput, settings, rowFieldEls) {
        if (mrzInput.dataset.sptOcrAttached) return;
        mrzInput.dataset.sptOcrAttached = '1';
        mrzInput.style.display = 'none';

        const wrap = document.createElement('span');
        wrap.className = 'spt-ocr-browse';
        wrap.style.display = 'inline-flex';
        wrap.style.alignItems = 'center';
        wrap.style.gap = '6px';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.style.display = 'none';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = SPT_BTN_CLASS;
        button.title = 'Select a photo of this passenger\'s passport - it will be scanned and this row filled in automatically.';
        button.style.display = 'inline-flex';
        button.style.alignItems = 'center';
        button.style.justifyContent = 'center';
        button.appendChild(makeIconSvg(ICON_FOLDER, 16, '#fff'));

        const status = document.createElement('span');
        status.style.display = 'inline-flex';
        status.style.alignItems = 'center';
        const ui = { statusEl: status, button, message: '' };
        rowUiEls.set(mrzInput, ui);
        attachInstantTooltip(status, () => ui.message);

        button.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async () => {
            const file = fileInput.files && fileInput.files[0];
            fileInput.value = '';
            if (!file) return;

            setRowStatus(mrzInput, 'scanning');

            try {
                const result = await window.sptScanPassportImage(file, settings);

                if (result.source === 'mrz') {
                    mrzInput.value = result.mrz;
                    mrzInput.dispatchEvent(new Event('input', { bubbles: true }));
                    setRowStatus(mrzInput, 'success', 'Scanned: ' + (nameFromMrz(result.mrz) || 'done'));
                } else if (rowFieldEls) {
                    const filled = window.sptApplyVizFields(result.fields, rowFieldEls);
                    setRowStatus(mrzInput, 'partial', filled.length
                        ? 'No MRZ - details updated from raw data, must double-check.'
                        : 'No MRZ found and no printed data could be matched. Fill manually.');
                } else {
                    setRowStatus(mrzInput, 'error', 'No MRZ found in that photo.');
                }
            } catch (err) {
                setRowStatus(mrzInput, 'error', err && err.message ? err.message : 'Scan failed');
            }
        });

        wrap.appendChild(button);
        wrap.appendChild(fileInput);
        wrap.appendChild(status);

        mrzInput.insertAdjacentElement('afterend', wrap);
    };

    // Small, non-blocking notice next to an element, auto-dismissing - used
    // instead of a jarring alert() popup for the one piece of bulk-scan
    // feedback that has no row of its own to show a tooltip on (extra photos
    // with nothing to match them to). Every other outcome (scanned, filled
    // from printed fields, failed) already gets its own icon + tooltip on the
    // affected row, so no separate summary popup is needed for those.
    function showTransientNotice(anchorEl, message) {
        const notice = document.createElement('span');
        notice.textContent = message;
        notice.style.marginLeft = '8px';
        notice.style.fontSize = '11px';
        notice.style.color = '#b8860b';
        anchorEl.insertAdjacentElement('afterend', notice);
        setTimeout(() => notice.remove(), 6000);
    }

    // Bulk version: pick several passport photos at once. Each photo is scanned
    // and applied to its row one at a time - photo 1 finishes and updates row 1
    // before photo 2 even starts - rather than scanning the whole batch first
    // and writing all rows at once at the end.
    //
    // `getTargetsForIndex(index)` maps a photo's position in the picked file
    // list to an array of `{ mrzInput, rowFieldEls }` (an array since one page
    // reuses the same index across three passenger-type tables; rowFieldEls
    // optional per entry). Row layout differs per page, so that mapping
    // intentionally isn't this module's job.
    window.sptCreateBulkOcrBrowseButton = function (settings, getTargetsForIndex) {
        const wrap = document.createElement('span');
        wrap.className = 'spt-ocr-bulk-browse';
        wrap.style.display = 'inline-flex';
        wrap.style.alignItems = 'center';

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.multiple = true;
        fileInput.style.display = 'none';

        const button = document.createElement('button');
        button.type = 'button';
        button.className = SPT_BTN_CLASS;
        button.title = 'Select multiple passport photos at once - each will be scanned and matched to a passenger row in the order you pick them.';
        button.textContent = 'Bulk Browse';
        const originalLabel = button.textContent;

        button.addEventListener('click', () => fileInput.click());

        fileInput.addEventListener('change', async () => {
            const files = Array.from(fileInput.files || []);
            fileInput.value = '';
            if (!files.length) return;

            button.disabled = true;

            // Resolve every file's target row(s) up front, and immediately show
            // every affected row as loading - before any network call starts -
            // so the user sees "these rows are now busy" right away.
            const targetsPerFile = files.map((_, index) => getTargetsForIndex(index) || []);
            targetsPerFile.forEach(targets => targets.forEach(t => setRowStatus(t.mrzInput, 'scanning')));

            let unmatchedCount = 0;

            for (let i = 0; i < files.length; i++) {
                button.textContent = `Scanning ${i + 1}/${files.length}...`;
                const targets = targetsPerFile[i];

                if (!targets.length) {
                    unmatchedCount++;
                    continue;
                }

                try {
                    const result = await window.sptScanPassportImage(files[i], settings);

                    targets.forEach(({ mrzInput, rowFieldEls }) => {
                        if (result.source === 'mrz') {
                            mrzInput.value = result.mrz;
                            mrzInput.dispatchEvent(new Event('input', { bubbles: true }));
                            setRowStatus(mrzInput, 'success', 'Scanned via Bulk Browse');
                        } else if (rowFieldEls) {
                            const filled = window.sptApplyVizFields(result.fields, rowFieldEls);
                            setRowStatus(mrzInput, 'partial', filled.length
                                ? 'No MRZ - details updated from raw data, must double-check.'
                                : 'No MRZ found and no printed data could be matched. Fill manually.');
                        } else {
                            setRowStatus(mrzInput, 'error', 'No MRZ found in that photo.');
                        }
                    });
                } catch (err) {
                    const message = err && err.message ? err.message : 'Scan failed';
                    targets.forEach(({ mrzInput }) => setRowStatus(mrzInput, 'error', message));
                }
            }

            button.textContent = originalLabel;
            button.disabled = false;

            if (unmatchedCount) {
                showTransientNotice(wrap, `${unmatchedCount} extra photo(s) had no matching row and were skipped.`);
            }
        });

        wrap.appendChild(button);
        wrap.appendChild(fileInput);
        return wrap;
    };
})();
