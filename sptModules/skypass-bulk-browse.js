// Feature module: the "Bulk Browse" button on the seats-booking page, placed
// right before the "Confirm Booking" button. Extracted into its own file
// (rather than living inside skypass-mrz-bulk-fill.js) since this is the
// newest, highest-risk code (a page-wide MutationObserver) and isolating it
// means a bug here can't affect - and can't be affected by - the DOM churn
// from unrelated features like the WhatsApp copy buttons.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (!settings.enableMrzBulkFill || !settings.enableOcrBrowse) return;

        const tables = [
            { selector: '#dynamic-table-adult', prefix: 'adult' },
            { selector: '#dynamic-table-child', prefix: 'child' },
            { selector: '#dynamic-table-infants', prefix: 'infants' }
        ];

        const bulkBrowseBtn = window.sptCreateBulkOcrBrowseButton(
            settings,
            (index) => {
                const targets = [];
                tables.forEach(table => {
                    const rows = document.querySelectorAll(`${table.selector} tr`);
                    if (index < rows.length) {
                        const mrzInput = document.getElementById(`${table.prefix}_mrz_${index + 1}`);
                        if (mrzInput) {
                            targets.push({
                                mrzInput,
                                rowFieldEls: {
                                    surname: document.getElementById(`${table.prefix}_sur_name_${index + 1}`),
                                    givenname: document.getElementById(`${table.prefix}_given_name_${index + 1}`),
                                    passportNumber: document.getElementById(`${table.prefix}_passport_number_${index + 1}`),
                                    dob: document.getElementById(`${table.prefix}_dob_${index + 1}`),
                                    expiry: document.getElementById(`${table.prefix}_passport_expiry_${index + 1}`),
                                    nationality: document.getElementById(`${table.prefix}_nationality_${index + 1}`)
                                }
                            });
                        }
                    }
                });
                return targets;
            }
        );

        function findConfirmBookingButton() {
            const candidates = document.querySelectorAll('button, a.btn, input[type="submit"]');
            return Array.from(candidates).find(el => el.textContent.trim().toLowerCase() === 'confirm booking');
        }

        // Caches the found Confirm Booking button so the observer below
        // (which fires on every DOM mutation anywhere on the page, including
        // ones from completely unrelated features like the WhatsApp copy
        // buttons) can skip straight past with two cheap property checks
        // instead of re-running a full page-wide button scan + DOM write on
        // every single mutation. The expensive scan only happens on the rare
        // occasion the cached button actually disappears (e.g. a
        // passenger-count change re-rendering that part of the page).
        let cachedConfirmBtn = null;

        function ensureBulkBrowsePlacement() {
            if (cachedConfirmBtn && cachedConfirmBtn.isConnected) {
                if (cachedConfirmBtn.previousElementSibling !== bulkBrowseBtn) {
                    cachedConfirmBtn.parentNode.insertBefore(bulkBrowseBtn, cachedConfirmBtn);
                }
                return;
            }

            const confirmBtn = findConfirmBookingButton();
            if (!confirmBtn) return;
            cachedConfirmBtn = confirmBtn;

            // Force the shared parent into a horizontal row so Bulk Browse
            // sits beside Confirm Booking instead of stacking above it.
            // Skypass's own "d-inline-block" utility class on this div ships
            // display:inline-block !important (standard Bootstrap behavior),
            // which beats a plain inline style - so these need !important
            // too via setProperty (the style.display = '...' shorthand can't
            // express !important at all).
            const parent = confirmBtn.parentNode;
            if (parent.dataset.sptBulkRow !== '1') {
                parent.dataset.sptBulkRow = '1';
                parent.style.setProperty('display', 'flex', 'important');
                parent.style.setProperty('flex-direction', 'row', 'important');
                parent.style.setProperty('justify-content', 'center', 'important');
                parent.style.setProperty('align-items', 'center', 'important');
                parent.style.setProperty('gap', '12px', 'important');
            }

            parent.insertBefore(bulkBrowseBtn, confirmBtn);
        }

        window.addEventListener('load', ensureBulkBrowsePlacement);
        const placementObserver = new MutationObserver(ensureBulkBrowsePlacement);
        placementObserver.observe(document.body, { childList: true, subtree: true });
    });
})();
