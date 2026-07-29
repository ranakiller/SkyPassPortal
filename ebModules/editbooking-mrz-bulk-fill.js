// Feature module: bulk MRZ paste box, extraction/cleanup, and passenger-form
// autofill on the Edit Booking page. These three concerns stay together in
// one file (unlike every other feature) because they're inherently coupled -
// they all read/write the same #bulkMRZInput element and #booking-table-id
// rows, not just co-gated by the same setting.
//
// The Bulk Browse button (settings.enableOcrBrowse) is intentionally a
// separate file (editbooking-bulk-browse.js) even though it's related, since
// that part is standalone (positions itself in the bottom button row, no
// shared state with this file beyond the mrz_box ids it also knows how to
// compute) and is newer/higher-risk code that benefits from being isolated.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {

        // -------------- Put Text Box for Bulk MRZs and Fill All MRZs Box --------------
        if (settings.enableMrzBulkFill) (function() {
            'use strict';

            function addMRZDiv() {
                // Select the 1st and 2nd divs based on their class names
                const firstDiv = document.querySelector('.py-15.px-30.rounded-4.bg-white.custom_shadow');
                const secondDiv = document.querySelector('.py-15.px-30.rounded-4.bg-white.custom_shadow[style="margin-top: 20px"]');

                if (firstDiv && secondDiv) {
                    // Create the new div to hold the bulk MRZ textarea
                    const newDiv = document.createElement('div');
                    newDiv.className = 'py-30 px-30 rounded-4 bg-white custom_shadow';
                    newDiv.style.marginBottom = '30px'; // Add margin for spacing

                    // Create the text area for MRZ input
                    const textArea = document.createElement('textarea');
                    textArea.id = 'bulkMRZInput';
                    textArea.placeholder = 'Paste MRZs here in Bulk';
                    textArea.style.width = '100%';
                    textArea.style.resize = 'both';
                    textArea.style.fontFamily = 'Consolas, monospace'; // Monospaced font for easier reading

                    // Append the text area to the new div
                    newDiv.appendChild(textArea);

                    // Insert the new div between the first and second divs
                    firstDiv.parentNode.insertBefore(newDiv, secondDiv);

                    // When OCR scanning is on, the per-passenger Browse buttons
                    // and the bottom-row Bulk Browse button (see
                    // editbooking-bulk-browse.js) fully replace this paste box,
                    // so hide it - but keep it (and its wiring below) in the
                    // DOM untouched as the fallback for when OCR is off.
                    if (settings.enableOcrBrowse) {
                        newDiv.style.display = 'none';
                    }
                }
            }

            // Wait for the DOM to be fully loaded
            window.addEventListener('load', addMRZDiv);
        })();

        // -------------- Extract MRZs from raw passports OCRed data --------------
        if (settings.enableMrzBulkFill) (function() {
            'use strict';

            function filterMRZData() {
                var textBox = document.getElementById('bulkMRZInput');
                if (!textBox) return;

                var rawData = textBox.value;
                var lines = rawData.split('\n');

                // MRZ format regex for complete MRZ lines
                var mrzFullFormatRegex = /^P<.{43,44}[A-Z0-9<]{30,}$/;

                // Step 1: Process lines
                var filteredLines = lines.map(line => {
                    // If line matches the MRZ full format, leave it as it is
                    if (mrzFullFormatRegex.test(line)) {
                        return line;
                    }

                    // Remove lines that do not contain "<"
                    if (!(/^P<.*$/.test(line) || /<\d{2}$/.test(line))) {
                        return ''; // Remove line by returning an empty string
                    }

                    // Remove spaces from the line
                    line = line.replace(/\s+/g, '');

                    // Pad or trim the line to 44 characters if it starts with 'P<'
                    if (line.startsWith('P<')) {
                        if (line.length < 44) {
                            return line.padEnd(44, '<'); // Pad lines with '<' if needed
                        } else if (line.length > 44) {
                            return line.slice(0, 44); // Trim lines to 44 characters if they are too long
                        }
                    }

                    return line;
                }).filter(line => line); // Remove empty lines

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
            }

            function setupEventListener() {
                var textBox = document.getElementById('bulkMRZInput');
                if (!textBox) return;

                textBox.addEventListener('input', filterMRZData);
            }

            window.addEventListener('load', function() {
                setupEventListener();
                filterMRZData(); // Initial run to process MRZ data
            });

        })();

        // This function handles the entire process of extracting, parsing, and populating the MRZ data into a form, as well as providing default values and managing bulk MRZ input.
        if (settings.enableMrzBulkFill) (function() {
            'use strict';

            // Function to format date as (dd mmm yyyy) from "yymmdd" (the output of MRZ)
            function formatMRZDateOutput(dateStr) {
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const year = dateStr.slice(0, 2);
                const month = dateStr.slice(2, 4);
                const day = dateStr.slice(4, 6);
                const fullYear = parseInt(year, 10) <= 35 ? 2000 + parseInt(year, 10) : 1900 + parseInt(year, 10);
                return `${('0' + day).slice(-2)} ${months[parseInt(month, 10) - 1]} ${fullYear}`;
            }

            // Function to format a standard date (dd mmm yyyy)
            function formatDate(date) {
                const day = String(date.getDate()).padStart(2, '0');
                const month = date.toLocaleString('default', { month: 'short' });
                const year = date.getFullYear();
                return `${day} ${month} ${year}`;
            }

            // Function to parse the MRZ code and extract relevant information
            function parseMRZ(mrzCode) {
                let data = {};
                const nameSection = mrzCode.slice(5, 44);
                const [surname, givenname] = nameSection.split('<<');
                data.surname = surname.replace(/<+/g, ' ').trim();
                data.givenname = (givenname || '').replace(/<+/g, ' ').trim();
                data.passportNumber = mrzCode.slice(44, 53).trim();
                data.nationality = mrzCode.slice(54, 57).trim();
                let dob = mrzCode.slice(57, 63);
                data.dateOfBirth = formatMRZDateOutput(dob);
                data.gender = mrzCode[64];
                let expiryDate = mrzCode.slice(65, 71);
                data.dateOfExpiry = formatMRZDateOutput(expiryDate);

                return data;
            }

            // Function to calculate the passenger's age based on date of birth
            function calculateAge(dob) {
                const [day, month, year] = dob.split(' ');
                const dobDate = new Date(`${month} ${day}, ${year}`);
                const diff = Date.now() - dobDate.getTime();
                return Math.abs(new Date(diff).getUTCFullYear() - 1970);
            }

            // Function to autofill the form based on MRZ input or default data
            function autofillFormNewPage() {
                const today = new Date();
                const minusYears = new Date(today.getFullYear() - settings.adultAgeOffset, today.getMonth(), today.getDate()); // Default DOB
                const plus5Years = new Date(today.getFullYear() + 5, today.getMonth(), today.getDate()); // Default Expiry Date (+5 years)

                const rows = document.querySelectorAll('#booking-table-id tr');
                rows.forEach((row, index) => {
                    const mrzInput = row.querySelector(`#mrz_box_${index}`);
                    const mrzCode = mrzInput ? mrzInput.value : '';

                    let data;
                    if (mrzCode) {
                        data = parseMRZ(mrzCode);
                    } else {
                        // Default data filling if no MRZ code
                        data = {
                            surname: `${index + 1}`,
                            givenname: 'PASSENGER',
                            passportNumber: settings.defaultPassportNumber,
                            dateOfBirth: formatDate(minusYears),
                            dateOfExpiry: formatDate(plus5Years),
                            nationality: 'C/O ',
                            gender: 'M'
                        };
                    }

                    // Autofill the form fields with parsed MRZ data or default data
                    row.querySelector(`#sur_name_${index}`).value = data.surname;
                    row.querySelector(`#given_name_${index}`).value = data.givenname;
                    row.querySelector(`#passport_number_${index}`).value = data.passportNumber;
                    row.querySelector(`#dob_${index}`).value = data.dateOfBirth;
                    row.querySelector(`#passport_expiry_${index}`).value = data.dateOfExpiry;
                    // row.querySelector(`#nationality_${index}`).value = data.nationality;

                    // Update the title based on gender and age
                    const age = calculateAge(data.dateOfBirth);
                    const titleElement = row.querySelector(`#title_${index}`);
                    if (data.gender === 'F') {
                        titleElement.value = age < 18 ? "Miss" : "Mrs";
                    } else {
                        titleElement.value = "Mr";
                    }
                });
            }

            // Nationality synchronization across rows
            function setupNationalityListener() {
                const firstNationality = document.querySelector(`#nationality_0`);
                if (firstNationality) {
                    firstNationality.addEventListener('input', () => {
                        const newNationality = firstNationality.value;
                        const rows = document.querySelectorAll('#booking-table-id tr');
                        rows.forEach((row, index) => {
                            const nationalityElement = row.querySelector(`#nationality_${index}`);
                            if (nationalityElement) {
                                nationalityElement.value = newNationality.toUpperCase();
                            }
                        });
                    });
                }
            }

            // Function to create and attach MRZ input boxes dynamically
            function createMRZInputBoxes() {
                const rows = document.querySelectorAll('#booking-table-id tr');
                rows.forEach((row, index) => {
                    // Create MRZ input field
                    let mrzInput = document.createElement('input');
                    mrzInput.type = 'text';
                    mrzInput.id = `mrz_box_${index}`;
                    mrzInput.className = 'form-control';
                    mrzInput.placeholder = 'Enter MRZ Code';

                    if (settings.enableOcrBrowse) {
                        // Give the Browse button its own cell at the very end
                        // of the row instead of crowding it into the Title cell.
                        const ocrCell = document.createElement('td');
                        row.appendChild(ocrCell);
                        ocrCell.appendChild(mrzInput);
                        window.sptAttachOcrBrowseButton(mrzInput, settings, {
                            surname: row.querySelector(`#sur_name_${index}`),
                            givenname: row.querySelector(`#given_name_${index}`),
                            passportNumber: row.querySelector(`#passport_number_${index}`),
                            dob: row.querySelector(`#dob_${index}`),
                            expiry: row.querySelector(`#passport_expiry_${index}`),
                            nationality: row.querySelector(`#nationality_${index}`)
                        });
                    } else {
                        // Find the title cell
                        const titleCell = row.querySelector('td:nth-child(2)');
                        titleCell.appendChild(mrzInput);
                    }

                    // Add listener to trigger autofill when MRZ code is input
                    mrzInput.addEventListener('input', () => {
                        autofillFormNewPage();
                    });
                });
            }

            // Function to handle MRZ input from bulk MRZ box
            function handleBulkMRZInput() {
                const bulkMRZInput = document.getElementById('bulkMRZInput'); // Bulk input field for MRZ codes
                const mrzCodes = bulkMRZInput ? bulkMRZInput.value.split('\n').map(code => code.trim()) : [];

                const rows = document.querySelectorAll('#booking-table-id tr');
                rows.forEach((row, index) => {
                    const mrzInput = row.querySelector(`#mrz_box_${index}`);
                    if (mrzInput) {
                        if (mrzCodes[index]) {
                            mrzInput.value = mrzCodes[index]; // Set the MRZ code if it exists
                            autofillFormNewPage(); // Autofill form based on the new MRZ input
                        } else {
                            mrzInput.value = ''; // Clear the MRZ box if no code exists for this row
                        }
                    }
                });
            }

            // Initialize MRZ input boxes and handle bulk MRZ input
            function initialize() {
                createMRZInputBoxes(); // Creates MRZ input fields
                setupNationalityListener(); // Set up nationality synchronization

                // Ensure bulkMRZInput exists before adding the event listener
                const bulkMRZInputField = document.getElementById('bulkMRZInput');
                if (bulkMRZInputField) {
                    bulkMRZInputField.addEventListener('input', handleBulkMRZInput);
                }
            }

            // Wait for DOMContentLoaded or until bulk MRZ input field is available
            function initializeWhenElementExists() {
                const checkInterval = setInterval(() => {
                    const bulkMRZInputField = document.getElementById('bulkMRZInput');
                    if (bulkMRZInputField) {
                        clearInterval(checkInterval); // Stop checking once the element is found
                        initialize(); // Call initialize when the element is available
                    }
                }, 500); // Check every 500ms
            }

            initializeWhenElementExists();

        })();

    });
})();
