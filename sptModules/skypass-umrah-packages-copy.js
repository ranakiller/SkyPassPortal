// Feature module: adds a "Copy" button to each package card on the Umrah
// packages page, producing a WhatsApp-ready message: airline name + duration,
// flight legs, baggage, then every Makkah (*MAK*)/Madinah (*MED*) hotel
// combination numbered *Package # N*, with all four room-type prices
// (Sharing/Quad/Triple/Double, each prefixed "* " so WhatsApp indents them,
// shown as N/A wherever the page itself shows a literal 0 - that means
// unavailable, not free). Also adds a "Copy All" button next to the page's
// own "Clear Filters" button that walks every visible card and merges
// consecutive cards sharing the same airline/route/duration/hotel line-up
// (but not necessarily the same exact prices - see formatBulkMessage below
// for why) into one message with all their departure dates stacked
// together. An optional user-supplied prefix/suffix (popup > Search > Umrah
// Packages page) wraps whatever gets copied, single-card or bulk.
// Split out as its own file so this feature can't be affected by unrelated
// features sharing a file/closure/observer.
//
// The hotel/room-price table (.hotel-pricing-wrap) is hidden behind a
// "Show Details" toggle (display:none until clicked), but it's fully present
// in the DOM either way - reading .textContent from a hidden element works
// exactly the same as a visible one, so this never needs to click that
// toggle to get at the data.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableUmrahPackagesCopyButton) (function () {
            'use strict';

            if (!window.location.href.includes('/agents/book-umrah-packages-api')) return;

            const SPT_BTN_CLASS = 'btn bg-dark-4 btn_sm text-white';

            function toTitleCase(str) {
                return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
            }

            // Turns a raw hotel name + its "650 M 8 Nights" / "Shuttle 12
            // Nights" meta text into e.g. "Hamouda Al Masi Hotel — 650m" or
            // "Wedam Six (Shuttle Service)".
            function formatHotelLabel(nameRaw, metaRaw) {
                let name = (nameRaw || '').replace(/\s+/g, ' ').trim();
                // "/ Similar" is just a qualifier meaning "or an equivalent
                // hotel" - drop it rather than showing it literally.
                name = name.replace(/\s*\/\s*similar\s*$/i, '');
                name = toTitleCase(name);

                const meta = (metaRaw || '').replace(/\s+/g, ' ').trim();
                const metersMatch = meta.match(/(\d+)\s*M\b/i);
                if (metersMatch) {
                    return `${name} — ${metersMatch[1]}m`;
                }
                if (/shuttle/i.test(meta)) {
                    return `${name} (Shuttle Service)`;
                }
                return name;
            }

            // A price of "0" means that room type isn't actually available
            // for this hotel combination, not that it's free - show N/A
            // instead of a literal 0 (same for a missing/empty price cell).
            function formatPrice(raw) {
                const value = (raw || '').replace(/\s+/g, ' ').trim();
                return (!value || value === '0') ? 'N/A' : value;
            }

            function getCardAirline(card) {
                return card.querySelector('.airline-name')?.textContent.trim() || '';
            }

            function getCardDuration(card) {
                return card.querySelector('.package-nights')?.textContent.replace(/\s+/g, ' ').trim() || '';
            }

            // Returns one ```code block``` string per flight leg (departure,
            // return, etc.) - this is the part that differs between two
            // cards that otherwise share the same airline/hotel/price combo,
            // since each card represents one specific pair of dates.
            function getCardFlightLines(card) {
                const lines = [];
                card.querySelectorAll('.flight-leg').forEach(leg => {
                    const flightNo = leg.querySelector('.route-line__flight')?.textContent.replace(/\s+/g, '').trim() || '';
                    const points = leg.querySelectorAll('.route-point');
                    const dates = leg.querySelectorAll('.route-date');
                    if (points.length < 2 || dates.length < 2) return;

                    const fromAirport = points[0].querySelector('.route-airport')?.textContent.trim() || '';
                    const toAirport = points[1].querySelector('.route-airport')?.textContent.trim() || '';
                    const date = points[0].querySelector('.route-city')?.textContent.replace(/\s+/g, '').toUpperCase() || '';
                    const depTime = dates[0].textContent.replace(':', '').trim();
                    const arrTime = dates[1].textContent.replace(':', '').trim();

                    lines.push('```' + `${flightNo} ${date} ${fromAirport}-${toAirport} ${depTime}-${arrTime}` + '```');
                });
                return lines;
            }

            function getCardBaggage(card) {
                return card.querySelector('.route-baggage span')?.textContent.replace(/\s+/g, ' ').trim() || '';
            }

            // One entry per hotel-combination row: `text` is the fully
            // formatted block (numbered *Package # N*, bold MAK/MED labels,
            // the four star-prefixed prices) and `labelKey` is just the
            // MAK/MED hotel names with no prices, used by the bulk grouping
            // below - prices drift slightly date to date even for what's
            // otherwise the same package, so matching on labels rather than
            // the full row (prices included) is what actually groups them.
            function getCardPriceRows(card) {
                const rows = card.querySelectorAll('.hotel-pricing-table tbody tr.api-package-row');
                const result = [];
                let packageNumber = 0;
                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length < 6) return;
                    packageNumber++;

                    const makkahLabel = formatHotelLabel(
                        cells[0].querySelector('.hotel-name')?.textContent,
                        cells[0].querySelector('.summary-muted')?.textContent
                    );
                    const madinahLabel = formatHotelLabel(
                        cells[1].querySelector('.hotel-name')?.textContent,
                        cells[1].querySelector('.summary-muted')?.textContent
                    );
                    const sharing = formatPrice(cells[2].querySelector('.price-booking-link__amount')?.textContent);
                    const quad = formatPrice(cells[3].querySelector('.price-booking-link__amount')?.textContent);
                    const triple = formatPrice(cells[4].querySelector('.price-booking-link__amount')?.textContent);
                    const double = formatPrice(cells[5].querySelector('.price-booking-link__amount')?.textContent);

                    result.push({
                        labelKey: `${makkahLabel}${madinahLabel}`,
                        text: [
                            `*Package # ${packageNumber}*`,
                            `*MAK*: ${makkahLabel}`,
                            `*MED*: ${madinahLabel}`,
                            `* Sharing: ${sharing}`,
                            `* Quad: ${quad}`,
                            `* Triple: ${triple}`,
                            `* Double: ${double}`
                        ].join('\n')
                    });
                });
                return result;
            }

            // User-supplied text wrapped around whatever message gets built,
            // e.g. a greeting or a contact line - deliberately not hardcoded,
            // configurable per popup > Search > Umrah Packages page, and
            // shared by both the single-card and the bulk "Copy All" button.
            function wrapWithPrefixSuffix(message) {
                const prefix = (settings.umrahCopyPrefixText || '').trim();
                const suffix = (settings.umrahCopySuffixText || '').trim();
                if (prefix) message = prefix + '\n\n' + message;
                if (suffix) message = message + '\n\n' + suffix;
                return message;
            }

            function formatPackageCard(card) {
                const airline = getCardAirline(card);
                const duration = getCardDuration(card);
                const flightLines = getCardFlightLines(card);
                const baggage = getCardBaggage(card);
                const priceRows = getCardPriceRows(card);

                let message = airline ? `${airline}${duration ? ` *${duration}*` : ''}\n` : '';
                if (flightLines.length) message += flightLines.join('\n') + '\n';
                if (baggage) message += baggage + '\n';
                if (priceRows.length) {
                    message += '\n▬▬▬▬▬▬▬▬▬▬\nPackage Options in PKR (Per Person)\n▬▬▬▬▬▬▬▬▬▬\n' + priceRows.map(r => r.text).join('\n\n');
                }

                return wrapWithPrefixSuffix(message.trim());
            }

            // Walks every currently-visible card (respecting whatever the
            // page's own sector/airline/hotel filters have hidden) in DOM
            // order and folds consecutive cards into a single group when
            // they share the same airline, route (the page's own
            // data-sector attribute), duration, and hotel line-up - those
            // are the same underlying package just offered on another
            // departure date, so only the date's flight-leg lines need
            // repeating, not the whole hotel/price block. Room prices are
            // deliberately NOT part of this comparison: real per-date prices
            // drift by small amounts even for what's otherwise the same
            // package, so matching on exact prices caused near-identical
            // dates to wrongly split into separate groups. The first card in
            // each group supplies the baggage line and price table shown for
            // the whole group. A genuinely different airline/route/duration/
            // hotel line-up starts a brand new group (a separate message).
            function formatBulkMessage() {
                const cards = Array.from(document.querySelectorAll('.package-card.api-package-card'))
                    .filter(card => window.getComputedStyle(card).display !== 'none');

                const groups = [];
                cards.forEach(card => {
                    const airline = getCardAirline(card);
                    const duration = getCardDuration(card);
                    const flightLines = getCardFlightLines(card);
                    const baggage = getCardBaggage(card);
                    const priceRows = getCardPriceRows(card);
                    const sector = (card.dataset.sector || '').trim().toLowerCase();
                    const airlineKey = (card.dataset.airline || airline).trim().toLowerCase();
                    const hotelsKey = priceRows.map(r => r.labelKey).join('');
                    const key = [airlineKey, sector, duration, hotelsKey].join('');

                    const current = groups[groups.length - 1];
                    if (current && current.key === key) {
                        current.dateBlocks.push(flightLines.join('\n'));
                    } else {
                        groups.push({ key, airline, duration, baggage, priceRows, dateBlocks: [flightLines.join('\n')] });
                    }
                });

                const sections = groups.map(group => {
                    let msg = group.airline ? `${group.airline}${group.duration ? ` *${group.duration}*` : ''}\n` : '';
                    msg += group.dateBlocks.join('\n\n') + '\n';
                    if (group.baggage) msg += group.baggage + '\n';
                    if (group.priceRows.length) {
                        msg += '\n▬▬▬▬▬▬▬▬▬▬\nPackage Options in PKR (Per Person)\n▬▬▬▬▬▬▬▬▬▬\n' + group.priceRows.map(r => r.text).join('\n\n');
                    }
                    return msg.trim();
                });

                return wrapWithPrefixSuffix(sections.join('\n\n\n'));
            }

            function addCopyButton(card) {
                if (card.querySelector('.spt-umrah-copy-btn')) return;

                const actionsDiv = card.querySelector('.admin-package-export-actions');
                if (!actionsDiv) return;

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'spt-umrah-copy-btn ' + SPT_BTN_CLASS;
                btn.textContent = 'Copy';
                btn.style.marginLeft = '6px';

                btn.addEventListener('click', () => {
                    const message = formatPackageCard(card);
                    navigator.clipboard.writeText(message).then(() => {
                        btn.textContent = 'Copied!';
                        setTimeout(() => { btn.textContent = 'Copy'; }, 1000);
                    }).catch(err => {
                        console.error('[Skypass Umrah Copy] Failed to copy:', err);
                    });
                });

                actionsDiv.appendChild(btn);
            }

            function addBulkCopyButton() {
                const filterControls = document.querySelector('.api-filter-controls');
                if (!filterControls || filterControls.querySelector('.spt-umrah-bulk-copy-btn')) return;

                const btn = document.createElement('button');
                btn.type = 'button';
                btn.className = 'spt-umrah-bulk-copy-btn ' + SPT_BTN_CLASS;
                btn.textContent = 'Copy All';
                btn.style.marginRight = '6px';

                btn.addEventListener('click', () => {
                    const message = formatBulkMessage();
                    navigator.clipboard.writeText(message).then(() => {
                        btn.textContent = 'Copied!';
                        setTimeout(() => { btn.textContent = 'Copy All'; }, 1000);
                    }).catch(err => {
                        console.error('[Skypass Umrah Copy] Failed to bulk-copy:', err);
                    });
                });

                const clearBtn = filterControls.querySelector('#apiClearFilters');
                if (clearBtn) {
                    filterControls.insertBefore(btn, clearBtn);
                } else {
                    filterControls.appendChild(btn);
                }
            }

            function processAllCards() {
                document.querySelectorAll('.package-card.api-package-card').forEach(addCopyButton);
                addBulkCopyButton();
            }

            // Package cards render as part of the page's own data fetch,
            // independently of the browser's 'load' event, so wait for at
            // least one to actually exist rather than checking once on load.
            window.sptWaitForSelector('.package-card.api-package-card', function () {
                processAllCards();

                // If more package cards load later (pagination, filtering,
                // etc.), pick those up too - addCopyButton()/addBulkCopyButton()
                // are idempotent (skip elements that already have their
                // button), so re-running this on every mutation is cheap and
                // safe.
                const observer = new MutationObserver(processAllCards);
                observer.observe(document.body, { childList: true, subtree: true });
            });
        })();
    });
})();
