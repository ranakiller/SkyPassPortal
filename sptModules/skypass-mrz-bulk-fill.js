// Feature module: bulk MRZ paste box, extraction/cleanup, and passenger-form
// autofill on the seats-booking page (adult/child/infant tables). These three
// concerns stay together in one file (unlike every other feature) because
// they're inherently coupled - they all read/write the same #bulkMRZInput
// element and #dynamic-table-* rows, not just co-gated by the same setting.
//
// The Bulk Browse button (settings.enableOcrBrowse) is intentionally a
// separate file (skypass-bulk-browse.js) even though it's related, since that
// part is standalone (positions itself near Confirm Booking, no shared state
// with this file beyond the mrzInput ids it also knows how to compute) and is
// newer/higher-risk code that benefits from being isolated on its own.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {

        // -------------- Put Text Box for Bulk MRZs --------------
        if (settings.enableMrzBulkFill) (function() {
            'use strict';

            function addMRZDiv(secondDiv) {
                // Select the first div (the second was already found by the wait below)
                const firstDiv = document.querySelector('.custom_shadow.scrollsets');
                if (!firstDiv) return;

                // Create the new div
                const newDiv = document.createElement('div');
                newDiv.className = 'py-30 px-30 rounded-4 bg-white custom_shadow';
                newDiv.style.marginBottom = '30px'; // Add some space between the divs if needed

                // Create the text area
                const textArea = document.createElement('textarea');
                textArea.id = 'bulkMRZInput';
                textArea.placeholder = 'Paste MRZs here in Bulk';
                textArea.style.width = '100%';
                textArea.style.resize = 'both';
                textArea.style.fontFamily = 'Consolas, monospace'; // Set font to Consolas

                // Append the text area to the new div
                newDiv.appendChild(textArea);

                // Insert the new div after the first div and before the second div
                firstDiv.parentNode.insertBefore(newDiv, secondDiv);

                // When OCR scanning is on, the per-passenger Browse buttons
                // and the Bulk Browse button (see skypass-bulk-browse.js,
                // placed right before Confirm Booking) fully replace manual
                // paste, so hide the textarea - but keep it (and its wiring
                // below) in the DOM untouched as the fallback for when OCR
                // is off.
                if (settings.enableOcrBrowse) {
                    textArea.style.display = 'none';
                }
            }

            // Both divs render as part of the page's own data fetch,
            // independently of the browser's 'load' event, so wait for them
            // to actually exist rather than checking once on load.
            window.sptWaitForSelector('.table-responsive.no-data.settable-view', addMRZDiv);
        })();

        // -------------- Extract MRZs from raw passports OCRed data --------------
        if (settings.enableMrzBulkFill) (function() {
            'use strict';

            function filterMRZData() {
                var textBox = document.getElementById('bulkMRZInput');
                if (!textBox) return;

                var rawData = textBox.value;
                var lines = rawData.split('\n');

                // MRZ format regex for full valid MRZ lines
                var mrzFullFormatRegex = /^P<.{43,44}[A-Z0-9<]{30,}$/;

                // Step 1: Process lines
                var filteredLines = lines.map(line => {
                    // If the line matches the full MRZ format, leave it unchanged
                    if (mrzFullFormatRegex.test(line)) {
                        return line;
                    }

                    // Otherwise, apply the regular filtering logic
                    if (!(/^P<.*$/.test(line) || /<\d{2}$/.test(line))) {
                        return ''; // Filter out invalid lines
                    }

                    // Remove spaces from the line
                    line = line.replace(/\s+/g, '');

                    // Pad or trim the line to 44 characters if it starts with 'P<'
                    if (line.startsWith('P<')) {
                        if (line.length < 44) {
                            return line.padEnd(44, '<'); // Pad the line with '<' to 44 characters
                        } else if (line.length > 44) {
                            return line.slice(0, 44); // Trim the line to 44 characters
                        }
                    }

                    return line;
                }).filter(line => line); // Remove any empty lines after processing

                // Step 2: Merge lines in pairs if they are exactly 44 characters long
                var mergedLines = [];
                var tempLine = '';

                for (var i = 0; i < filteredLines.length; i++) {
                    var currentLine = filteredLines[i];

                    if (currentLine.length === 44) {
                        if (tempLine) {
                            // Merge with the previous tempLine if it also has 44 characters
                            mergedLines.push(tempLine + currentLine);
                            tempLine = '';
                        } else {
                            // Store the current line in tempLine for potential merging
                            tempLine = currentLine;
                        }
                    } else {
                        // If current line is not 44 characters, push the tempLine as is (if any)
                        if (tempLine) {
                            mergedLines.push(tempLine);
                            tempLine = '';
                        }
                        // Push the current line as is (since it's not 44 characters long)
                        mergedLines.push(currentLine);
                    }
                }

                // Push any remaining tempLine that wasn't merged
                if (tempLine) {
                    mergedLines.push(tempLine);
                }

                var filteredData = mergedLines.join('\n');
                textBox.value = filteredData;

                // Update adults number after filtering
                updateAdultsNumber();
            }

            function updateAdultsNumber() {
                const bulkMRZInput = document.getElementById('bulkMRZInput');
                if (bulkMRZInput) {
                    const mrzLines = bulkMRZInput.value.trim().split('\n').filter(line => line.trim() !== '');
                    const adultsInput = document.getElementById('adults');
                    if (adultsInput) {
                        adultsInput.value = mrzLines.length;

                        // Create and dispatch the 'change' event
                        const changeEvent = new Event('change', { bubbles: true });
                        adultsInput.dispatchEvent(changeEvent);

                        // Create and dispatch the 'input' event
                        const inputEvent = new Event('input', { bubbles: true });
                        adultsInput.dispatchEvent(inputEvent);
                    }
                }
            }

            // #bulkMRZInput is created by addMRZDiv() above once the
            // surrounding page content renders, which can happen well after
            // (or before) the browser's 'load' event - wait for it directly
            // instead of assuming it exists by 'load'.
            window.sptWaitForSelector('#bulkMRZInput', function (textBox) {
                textBox.addEventListener('input', filterMRZData);
                filterMRZData(); // Initial run to set up the adults number
            });

        })();

        // -------------- Put MRZ Text Box and fill data from it or fill dummy data --------------
        if (settings.enableMrzBulkFill) (function() {
            'use strict';

            // Function to Format date as (dd mmm yyyy) from "yymmdd"(the output of MRZ)
            function formatMRZDateOutput(dateStr) {
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

                // Extract year, month, and day from the date string
                const year = dateStr.slice(0, 2); // Extract the first two characters for year
                const month = dateStr.slice(2, 4); // Extract the next two characters for month
                const day = dateStr.slice(4, 6); // Extract the last two characters for day

                // Determine the full year
                const fullYear = parseInt(year, 10) <= 35 ? 2000 + parseInt(year, 10) : 1900 + parseInt(year, 10);

                // Format and return the date as dd MMM yyyy
                return `${('0' + day).slice(-2)} ${months[parseInt(month, 10) - 1]} ${fullYear}`;
            }

            // Function to Format date as (dd mmm yyyy)
            function formatDate(date) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = date.toLocaleString('default', { month: 'short' });
                const year = date.getFullYear();
                return `${day} ${month} ${year}`;
            }

            // Calculate Age
            function calculateAge(dobStr) {
                const [day, month, year] = dobStr.split(' ');
                const dob = new Date(`${month} ${day}, ${year}`);
                const diff = new Date() - dob;
                const age = Math.floor(diff / (1000 * 60 * 60 * 24 * 365.25)); // Convert to years
                return age;
            }

            function parseMRZ(mrzCode) {
                let data = {};

                // Extracting Data from MRZ
                const nameSection = mrzCode.slice(5, 44);
                const [surname, givenname] = nameSection.split('<<');
                data.surname = surname.replace(/<+/g, ' ').trim();
                data.givenname = (givenname || '').replace(/<+/g, ' ').trim();
                data.passportNumber = mrzCode.slice(44, 53).trim();
                data.nationality = mrzCode.slice(54, 57).trim();
                let dob = mrzCode.slice(57, 63);
                data.dateOfBirth = formatMRZDateOutput(dob);
                let doe = mrzCode.slice(65, 71);
                data.dateOfExpiry = formatMRZDateOutput(doe);
                data.gender = mrzCode.charAt(64) === 'F' ? 'Female' : 'Male'; // Extract gender based on MRZ character

                return data;
            }

            function autofillForm() {
                const today = new Date();
                const tables = [
                    { selector: '#dynamic-table-adult', prefix: 'adult', ageOffset: settings.adultAgeOffset },
                    { selector: '#dynamic-table-child', prefix: 'child', ageOffset: settings.childAgeOffset },
                    { selector: '#dynamic-table-infants', prefix: 'infants', ageOffset: settings.infantAgeOffset }
                ];

                tables.forEach(table => {
                    const minusYears = new Date(today.getFullYear() - table.ageOffset, today.getMonth(), today.getDate());
                    const plus5Years = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate());
                    const numRows = document.querySelectorAll(`${table.selector} tr`).length;

                    for (let i = 1; i <= numRows; i++) {
                        const mrzInput = document.getElementById(`${table.prefix}_mrz_${i}`);
                        const mrzCode = mrzInput ? mrzInput.value : '';

                        let data = {};

                        if (mrzCode) {
                            data = parseMRZ(mrzCode);
                        } else {
                            data = {
                                surname: `${String(i).padStart(2, '0')}`,
                                givenname: `${table.prefix}`.toUpperCase(),
                                passportNumber: settings.defaultPassportNumber,
                                dateOfBirth: formatDate(minusYears),
                                dateOfExpiry: formatDate(plus5Years),
                                nationality: 'C/O ',
                                gender: 'Male' // Default gender if not using MRZ
                            };
                        }

                        const age = calculateAge(data.dateOfBirth);

                        document.getElementById(`${table.prefix}_sur_name_${i}`).value = data.surname;
                        document.getElementById(`${table.prefix}_given_name_${i}`).value = data.givenname;
                        document.getElementById(`${table.prefix}_passport_number_${i}`).value = data.passportNumber;
                        document.getElementById(`${table.prefix}_dob_${i}`).value = data.dateOfBirth;
                        document.getElementById(`${table.prefix}_passport_expiry_${i}`).value = data.dateOfExpiry;
                        document.getElementById(`${table.prefix}_nationality_${i}`).value = data.nationality;

                        // Update the title based on gender and age
                        const titleElement = document.getElementById(`${table.prefix}_title_${i}`);
                        if (data.gender === 'Female') {
                            if (age < 2) {
                                titleElement.value = 'INF'; // Female infant
                            } else if (age < 18) {
                                titleElement.value = 'Ms'; // Female under 18
                            } else {
                                titleElement.value = 'Mrs'; // Female 18 or older
                            }
                        } else {
                            if (age < 2) {
                                titleElement.value = 'INF'; // Male infant
                            } else {
                                titleElement.value = 'Mr'; // Default for Male
                            }
                        }
                    }
                });
            }

            function addMRZInputs() {
                const tables = [
                    { selector: '#dynamic-table-adult', prefix: 'adult' },
                    { selector: '#dynamic-table-child', prefix: 'child' },
                    { selector: '#dynamic-table-infants', prefix: 'infants' }
                ];

                // Get MRZ values from bulk input box
                const bulkMRZInput = document.getElementById('bulkMRZInput');
                const mrzCodes = bulkMRZInput ? bulkMRZInput.value.split('\n').map(code => code.trim()) : [];

                tables.forEach(table => {
                    const rows = document.querySelectorAll(`${table.selector} tr`);
                    rows.forEach((row, index) => {
                        const mrzInputExists = row.querySelector(`input[id^="${table.prefix}_mrz_"]`);
                        if (!mrzInputExists) {
                            // Insert MRZ input field after title cell
                            const mrzInput = document.createElement('input');
                            mrzInput.type = 'text';
                            mrzInput.className = 'form-control';
                            mrzInput.id = `${table.prefix}_mrz_${index + 1}`;
                            mrzInput.placeholder = 'Enter MRZ code';

                            // Set the MRZ value from the bulk input
                            if (mrzCodes[index]) {
                                mrzInput.value = mrzCodes[index];
                            }

                            if (settings.enableOcrBrowse) {
                                // Give the Browse button its own cell at the
                                // very end of the row instead of crowding it
                                // into the title cell.
                                const ocrCell = document.createElement('td');
                                row.appendChild(ocrCell);
                                ocrCell.appendChild(mrzInput);
                                window.sptAttachOcrBrowseButton(mrzInput, settings, {
                                    surname: document.getElementById(`${table.prefix}_sur_name_${index + 1}`),
                                    givenname: document.getElementById(`${table.prefix}_given_name_${index + 1}`),
                                    passportNumber: document.getElementById(`${table.prefix}_passport_number_${index + 1}`),
                                    dob: document.getElementById(`${table.prefix}_dob_${index + 1}`),
                                    expiry: document.getElementById(`${table.prefix}_passport_expiry_${index + 1}`),
                                    nationality: document.getElementById(`${table.prefix}_nationality_${index + 1}`)
                                });
                            } else {
                                // Add MRZ Input Field into the title cell
                                const titleCell = row.cells[1];
                                titleCell.appendChild(mrzInput);
                            }

                            // Add event listener to MRZ input field
                            mrzInput.addEventListener('input', () => {
                                mrzInput.value = mrzInput.value.replace(/\s+/g, '').replace(/\n/g, ''); // Remove all spaces and newlines on input
                                autofillForm();
                            });
                        }
                    });
                });
            }

            function setupNationalityListener() {
                const firstNationality = document.getElementById('adult_nationality_1');
                if (firstNationality) {
                    firstNationality.addEventListener('input', () => {
                        const newNationality = firstNationality.value;
                        updateNationalities(newNationality);
                    });
                }
            }

            // Initial setup. #adults is part of the page's own async-rendered
            // form, so wait for it to actually exist rather than checking once
            // immediately.
            window.sptWaitForSelector('#adults', function (adultsElement) {
                adultsElement.addEventListener('change', () => {
                    setTimeout(() => {
                        addMRZInputs();
                        autofillForm();
                        setupNationalityListener();
                    }, 500);
                });
            });

            function updateNationalities(newNationality) {
                const tables = [
                    { selector: '#dynamic-table-adult', prefix: 'adult' },
                    { selector: '#dynamic-table-child', prefix: 'child' },
                    { selector: '#dynamic-table-infants', prefix: 'infants' }
                ];

                tables.forEach(table => {
                    const numRows = document.querySelectorAll(`${table.selector} tr`).length;
                    for (let i = 1; i <= numRows; i++) {
                        const nationalityElement = document.getElementById(`${table.prefix}_nationality_${i}`);
                        if (nationalityElement) {
                            nationalityElement.value = newNationality.toUpperCase();
                        }
                    }
                });
            }

            // Monitor changes and autofill form. These tables render as part
            // of the page's own data fetch, so wait for at least one to
            // actually exist before attaching observers - querying
            // immediately would silently attach to nothing if the fetch
            // hadn't finished yet.
            window.sptWaitForSelector('#dynamic-table-adult, #dynamic-table-child, #dynamic-table-infants', function () {
                const observer = new MutationObserver(() => {
                    addMRZInputs();
                    autofillForm();
                    setupNationalityListener();
                });
                const config = { childList: true };
                const targetNodes = document.querySelectorAll('#dynamic-table-adult, #dynamic-table-child, #dynamic-table-infants');
                targetNodes.forEach(node => observer.observe(node, config));
            });

        })();

    });
})();
