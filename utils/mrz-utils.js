// Shared MRZ text-cleaning helper. Extracted verbatim from the bulk-MRZ-paste
// "filterMRZData" logic already used in both skypass-enhancements.js and
// edit-booking-functions.js, so the new OCR flow (ocr.js) benefits from the
// exact same noise-filtering the paste-box workflow already relies on -
// raw OCR text (whether pasted from another tool or produced by our own
// OCR.space call) is equally messy, so the same cleanup applies either way.
(function () {
    if (window.sptCleanMrzText) return;

    window.sptCleanMrzText = function (rawData) {
        const lines = (rawData || '').split('\n');

        // MRZ format regex for full valid MRZ lines
        const mrzFullFormatRegex = /^P<.{43,44}[A-Z0-9<]{30,}$/;

        // Step 1: Process lines
        const filteredLines = lines.map(line => {
            if (mrzFullFormatRegex.test(line)) {
                return line;
            }

            if (!(/^P<.*$/.test(line) || /<\d{2}$/.test(line))) {
                return '';
            }

            line = line.replace(/\s+/g, '');

            if (line.startsWith('P<')) {
                if (line.length < 44) {
                    return line.padEnd(44, '<');
                } else if (line.length > 44) {
                    return line.slice(0, 44);
                }
            }

            return line;
        }).filter(line => line);

        // Step 2: Merge lines in pairs if they are exactly 44 characters long
        const mergedLines = [];
        let tempLine = '';

        for (let i = 0; i < filteredLines.length; i++) {
            const currentLine = filteredLines[i];

            if (currentLine.length === 44) {
                if (tempLine) {
                    mergedLines.push(tempLine + currentLine);
                    tempLine = '';
                } else {
                    tempLine = currentLine;
                }
            } else {
                if (tempLine) {
                    mergedLines.push(tempLine);
                    tempLine = '';
                }
                mergedLines.push(currentLine);
            }
        }

        if (tempLine) {
            mergedLines.push(tempLine);
        }

        return mergedLines.join('\n');
    };

    // Converts an MRZ-style YYMMDD string to the "dd MMM yyyy" display format
    // every passenger row's date fields already use - the same logic each
    // content script's own formatMRZDateOutput() has, centralized here since
    // ocr.js's VIZ fallback (see extractVisualFields) needs it too.
    window.sptFormatYYMMDD = function (yymmdd) {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const year = yymmdd.slice(0, 2);
        const month = yymmdd.slice(2, 4);
        const day = yymmdd.slice(4, 6);
        const fullYear = parseInt(year, 10) <= 35 ? 2000 + parseInt(year, 10) : 1900 + parseInt(year, 10);
        return `${('0' + day).slice(-2)} ${months[parseInt(month, 10) - 1]} ${fullYear}`;
    };
})();
