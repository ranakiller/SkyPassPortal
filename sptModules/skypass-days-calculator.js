// Feature module: flags multi-day layovers/stopovers on flight search tables.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableDaysCalculator) (function() {
            'use strict';

            let spanCounter = 1; // Counter to generate unique IDs
            const longLayoverThresholdDays = settings.longLayoverThresholdDays;

            function createDaysSpan(textContent) {
                const span = document.createElement('span');
                span.className = 'fw-bold';
                span.style.fontSize = "0.8em";
                span.style.color = "gray";
                span.textContent = textContent;
                span.id = `days-span-${spanCounter++}`; // Assign a unique ID
                return span;
            }

            function processFlightDates() {
                const flightInfo = document.querySelectorAll('.flight_search_sector_info span:nth-child(2)');
                if (!flightInfo || flightInfo.length < 2) return;

                // Collect all flight dates
                const flightDates = Array.from(flightInfo).map(span => span.textContent.trim());

                // Parse the dates
                const parsedDates = flightDates.map((dateStr) => {
                    let [day, month, year] = dateStr.split(/\s+/);
                    day = parseInt(day, 10);
                    month = new Date(`${month} 1`).getMonth(); // Convert month name to index

                    if (!year) {
                        // Handle missing year by inferring it
                        const currentYear = new Date().getFullYear();
                        const currentMonth = new Date().getMonth();
                        const assumedYear = (month < currentMonth && month < 2) ? currentYear + 1 : currentYear;
                        year = assumedYear;
                    }

                    return new Date(year, month, day);
                });

                // Sort dates in ascending order
                parsedDates.sort((a, b) => a - b);

                // Calculate differences between consecutive dates
                for (let i = 0; i < parsedDates.length - 1; i++) {
                    const diff = Math.floor((parsedDates[i + 1] - parsedDates[i]) / (1000 * 60 * 60 * 24)) + 1;

                    if (diff > longLayoverThresholdDays) {
                        // Find the destination div and ensure no days span is already added
                        const destinationDivs = document.querySelectorAll('.flight_search_destination');
                        if (destinationDivs.length >= 2) {
                            const secondDestinationDiv = destinationDivs[1];

                            // Check if a span with the ID already exists
                            if (!secondDestinationDiv.querySelector(`[id^="days-span-"]`)) {
                                const daysSpan = createDaysSpan(`${diff}D`);
                                secondDestinationDiv.appendChild(daysSpan);
                            }
                        }
                    }
                }
            }

            function processDatesAndCalculateDays() {
                const cells = document.querySelectorAll("td.text-center span.fw-bold:first-of-type");

                const currentYear = new Date().getFullYear();
                const currentMonth = new Date().getMonth(); // 0-based index (0 = January)

                for (const cell of cells) {
                    const text = cell.textContent.trim();
                    const matches = text.match(/(\d{2}\s[A-Za-z]+)(\s\d{4})?/g); // Match dates with or without year

                    if (matches && matches.length > 1) {
                        // Parse dates and handle missing years
                        const parsedDates = matches.map((dateStr) => {
                            let [day, month, year] = dateStr.split(/\s+/);
                            day = parseInt(day, 10);
                            month = new Date(`${month} 1`).getMonth(); // Convert month name to index

                            if (!year) {
                                // Handle missing year by inferring it
                                const assumedYear = (month < currentMonth && month < 2) ? currentYear + 1 : currentYear;
                                year = assumedYear;
                            }

                            return new Date(year, month, day);
                        });

                        // Sort dates
                        parsedDates.sort((a, b) => a - b);

                        // Calculate differences between consecutive dates
                        for (let i = 0; i < parsedDates.length - 1; i++) {
                            const diff = Math.floor((parsedDates[i + 1] - parsedDates[i]) / (1000 * 60 * 60 * 24)) + 1;

                            if (diff > longLayoverThresholdDays && !cell.parentNode.querySelector(`[id^="days-span-"]`)) {
                                const daysSpan = createDaysSpan(`${diff} Days`);
                                cell.parentNode.insertBefore(daysSpan, cell.nextSibling);
                            }
                        }
                    }
                }

                processFlightDates(); // Retain this to process flight-specific dates if needed
            }

            function observeDOM() {
                const targetNode = document.body;
                const config = { childList: true, subtree: true };

                const callback = (mutationsList) => {
                    for (const mutation of mutationsList) {
                        if (mutation.type === 'childList') {
                            // Re-run the function if any spans are missing
                            const missingSpans = document.querySelectorAll('[id^="days-span-"]').length === 0;
                            if (missingSpans) {
                                processDatesAndCalculateDays();
                            }
                        }
                    }
                };

                const observer = new MutationObserver(callback);
                observer.observe(targetNode, config);
            }

            processDatesAndCalculateDays(); // Initial execution
            observeDOM(); // Start observing for changes
        })();
    });
})();
