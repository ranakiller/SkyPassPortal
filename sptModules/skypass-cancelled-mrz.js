// Feature module: generates an MRZ string and inserts it into each passenger
// row on the cancelled-bookings page (display-only, not fed through the OCR
// pipeline).
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableMrzOnCancelledBookings) (function() {
            'use strict';

            // Select all rows with the class 'accordion-toggle'
            const rows = document.querySelectorAll('.accordion-toggle');

            rows.forEach(row => {
                // Extract the relevant details from each row
                const title = row.children[1].textContent.trim();
                const givenName = row.children[2].textContent.trim();
                const surName = row.children[3].textContent.trim();
                const passportNumber = row.children[4].textContent.trim();
                const dob = row.children[5].textContent.trim();
                const expiryDate = row.children[6].textContent.trim();
                const nationality = settings.mrzNationalityCode;

                // MRZ Line 1: P<Nationality<<Surname<<Givenname<<<<<<<<<<<<<<<<< (Total 44 characters)
                let mrzLine1 = `P<${nationality}${givenName}<<${surName}`;
                mrzLine1 = padWithPlaceholders(mrzLine1, 44); // Pad to 44 characters

                // Determine gender based on the title
                const gender = (title === "Mr") ? "M" : "F";

                // Format DOB and Expiry Date to YYMMDD
                const dobFormatted = formatDateForMRZ(dob);
                const expiryFormatted = formatDateForMRZ(expiryDate);

                // MRZ Line 2: PassportNumber<CheckDigit<Nationality<DOB<CheckDigit<Gender<ExpiryDate<CheckDigit<<<<<<<<<<<<<<00 (Total 44 characters)
                let mrzLine2 = `${passportNumber}0${nationality}${dobFormatted}0${gender}${expiryFormatted}0<<<<<<<<<<<<<<00`;

                // Create a text input box for MRZ
                const mrzInput = document.createElement('input');
                mrzInput.type = 'text';
                mrzInput.value = `${mrzLine1}${mrzLine2}`; // MRZ lines combined into one string
                mrzInput.className = 'form-control';

                // Append the input box to the last cell of the row
                const lastTd = row.lastElementChild;
                lastTd.appendChild(mrzInput); // Append the MRZ input to the last <td>
            });

            // Helper function to format date to YYMMDD for MRZ
            function formatDateForMRZ(dateStr) {
                const months = {
                    'Jan': '01', 'Feb': '02', 'Mar': '03', 'Apr': '04', 'May': '05',
                    'Jun': '06', 'Jul': '07', 'Aug': '08', 'Sep': '09', 'Oct': '10', 'Nov': '11', 'Dec': '12'
                };
                const [day, month, year] = dateStr.split(' ');
                return `${year.slice(2)}${months[month]}${day.padStart(2, '0')}`;
            }

            // Helper function to pad with '<' to reach the required length (44 characters for MRZ)
            function padWithPlaceholders(str, length) {
                return str.padEnd(length, '<');
            }

        })();
    });
})();
