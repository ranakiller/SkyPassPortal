// Feature module: copy buttons that build WhatsApp-ready flight text on the
// flight search results table.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableWhatsappCopyButtons) (function () {
            'use strict';

            // Helper function to create and style a copy button
            function createCopyButton(parent, id, getTextCallback) {
                let button = document.getElementById(id);
                if (!button) {
                    button = document.createElement('button');
                    button.id = id;
                    button.innerText = 'Copy';
                    button.className = 'button h-40 px-24 -dark-1 bg-blue-1 text-white"'; // Add your preferred styling classes
                    button.style.marginLeft = '10px';
                    button.style.color = 'white';
                    parent.appendChild(button);

                    // Add click event to copy text to clipboard
                    button.addEventListener('click', () => {
                        let text = getTextCallback(); // Get updated visible text
                        navigator.clipboard.writeText(text).then(() => {
                            // Change button text and color to indicate success
                            button.textContent = 'Done';
                            button.style.color = 'black';

                            // Revert back to original state after 1 second
                            setTimeout(() => {
                                button.textContent = 'Copy';
                                button.style.backgroundColor = '#007bff';
                            }, 1000);
                        }).catch(err => {
                            console.error('Failed to copy text: ', err);
                        });
                    });
                }

                return button;
            }

            // Helper function to get only visible row data for a given header
            function getVisibleHeaderText(headerId) {
                let rows = document.querySelectorAll("tr");
                let visibleText = "";

                rows.forEach(row => {
                    if (row.offsetParent !== null && window.getComputedStyle(row).display !== "none") {
                        let rowCopyButton = row.querySelector(`button[id^="${headerId}-r"]`);
                        if (rowCopyButton) {
                            visibleText += rowCopyButton.getAttribute("data-text") + "\n\n";
                        }
                    }
                });

                return visibleText.trim();
            }

            // Header processing function
            function processHeaders(container, headerTexts) {
                const airlineHeaders = document.querySelectorAll('tr.airline td .d-flex');

                airlineHeaders.forEach((targetDiv) => {
                    const h4Text = targetDiv.querySelector('h4') ? targetDiv.querySelector('h4').innerText.trim() : 'unknown';
                    const nextRow = targetDiv.closest('tr').nextElementSibling;
                    const airlineCode = nextRow?.querySelector('.flight-number')?.innerText.trim().substring(0, 2) || 'xx';

                    const id = `${airlineCode}-${h4Text.replace(/\s+/g, '-')}-Head`;

                    if (!(id in headerTexts)) {
                        headerTexts[id] = ''; // Initialize text storage for this header
                    }

                    // Create a copy button that dynamically updates based on visible text
                    createCopyButton(targetDiv.parentElement, id, () => getVisibleHeaderText(id));
                });

                return headerTexts;
            }

            // Helper function to process individual rows
            function processRow(row, rowIndex, currentHeaderId, headerTexts, processedRows, prevRowDetails) {
                if (window.getComputedStyle(row).display === 'none') return prevRowDetails; // Skip hidden rows dynamically

                const cells = row.getElementsByTagName('td');
                if (cells.length < 6) return;

                const durationElement = row.querySelector('span[id^="days-span"]');
                const duration = durationElement ? durationElement.innerText.trim() : '';

                const dates = cells[0].querySelector('span.fw-bold')?.innerText.trim().split('\n') || [];
                const flightNumbers = cells[1].querySelector('.flight-number')?.innerText.trim().split('\n') || [];
                const routes = cells[2].querySelector('span.fw-bold')?.innerText.trim().split('\n') || [];
                const times = cells[3].querySelector('span.fw-bold')?.innerText.trim().split('\n') || [];
                const price = cells[6].querySelector('.price-format span:nth-child(2)')?.innerText.trim().replace(/,/g, '') || '';

                // **Header Aggregation Logic**
                let headerMessageText = `*FARE ${price}*`;
                if (duration) {
                    headerMessageText = `\n*FARE ${price}* ${duration ? `\`${duration}\`` : '\n'}`;
                } else if (prevRowDetails?.prevFare === price && prevRowDetails?.prevDuration === duration) {
                    headerMessageText = ''; // Skip fare and duration only if no days are present
                } else {
                    headerMessageText = `\n*FARE ${price}*\n`;
                }

                // **Individual Row Message Logic** (always include fare and duration)
                let individualMessageText = `*FARE ${price}* ${duration ? `\`${duration}\`` : '\n'}`;
                if (flightNumbers.length > 0 && dates.length > 0 && routes.length > 0 && times.length > 0) {
                    for (let i = 0; i < flightNumbers.length; i++) {
                        const flight = flightNumbers[i]?.replace(/\s+/g, '') || '';
                        const date = dates[i]?.replace(/\s+/g, '').replace(/\d{4}/g, '').toUpperCase() || '';
                        const route = routes[i]?.replace(/\s+/g, '').replace(/-/g, '') || '';
                        const time = times[i]?.replace(/-/g, ' ') || '';

                        // Conditionally add '\n' only if there are multiple lines
                        const prefix = flightNumbers.length > 1 ? '\n' : '';
                        const flightInfo = `${prefix}\`\`\`${flight} ${date} ${route} ${time}\`\`\``;

                        headerMessageText += flightInfo;
                        individualMessageText += flightInfo;
                    }
                }

                // Attach individual copy button with its specific message
                let rowButton = createCopyButton(cells[5], `${currentHeaderId}-r${rowIndex}`, () => individualMessageText);
                rowButton.setAttribute("data-text", individualMessageText); // Store text for visibility filtering

                // Aggregate message text for headers
                if (currentHeaderId && headerTexts[currentHeaderId] !== undefined) {
                    headerTexts[currentHeaderId] += headerMessageText + '\n';
                }
                processedRows.add(row);

                // Store current row details for comparison with the next row
                return {
                    prevFare: price,
                    prevDuration: duration
                };
            }

            window.addEventListener('load', function () {
                const container = document.getElementById('colcontent');
                if (!container) return;
                const processedRows = new Set();
                let headerTexts = {};
                let prevRowDetails = null;

                function processRows() {
                    const rows = container.querySelectorAll('tr');
                    let currentHeaderId = '';
                    rows.forEach((row, index) => {
                        const airlineHeader = Array.from(document.querySelectorAll('tr.airline td .d-flex')).find(
                            (div) => div.closest('tr') === row
                        );

                        if (airlineHeader) {
                            const h4Text = airlineHeader.querySelector('h4')?.innerText.trim() || 'unknown';
                            const nextRow = airlineHeader.closest('tr').nextElementSibling;
                            const airlineCode = nextRow?.querySelector('.flight-number')?.innerText.trim().substring(0, 2) || 'xx';
                            currentHeaderId = `${airlineCode}-${h4Text.replace(/\s+/g, '-')}-Head`;
                            prevRowDetails = null; // Correctly resets for a new header
                        } else {
                            if (!processedRows.has(row)) {
                                prevRowDetails = processRow(row, index, currentHeaderId, headerTexts, processedRows, prevRowDetails);
                            }
                        }
                    });
                }
                const observer = new MutationObserver(() => {
                    processHeaders(container, headerTexts);
                    processRows();
                });

                observer.observe(container, { childList: true, subtree: true, attributes: true, attributeFilter: ['style'] });
                headerTexts = processHeaders(container, headerTexts);
                processRows();
            });
        })();
    });
})();
