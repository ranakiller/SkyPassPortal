// Feature module: downloads the booking-print page as an A4 PDF.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
//
// Note: this still loads html2canvas/jsPDF from cdnjs, but it injects that
// <script> tag into the Skypass page itself (not an extension page), so it's
// unaffected by the extension's own MV3 CSP - same behavior as under
// Tampermonkey.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enablePdfDownload) (function () {
            'use strict';

            // Function to load external scripts dynamically
            function loadScript(src, callback) {
                const script = document.createElement('script');
                script.src = src;
                script.onload = callback;
                document.head.appendChild(script);
            }

            // Wait for the page to load
            window.addEventListener('load', () => {
                const targetCell = document.querySelector('.card-header table tbody tr:nth-child(2) td:nth-child(2)');

                if (targetCell) {
                    // Make the text clickable
                    targetCell.style.cursor = 'pointer';

                    // Add a click event listener to download the page as PDF
                    targetCell.addEventListener('click', () => {
                        // Load required libraries
                        loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => {
                            loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => {
                                const { jsPDF } = window.jspdf;
                                if (!jsPDF) {
                                    console.error('jsPDF failed to load.');
                                    return;
                                }

                                // A4 size in mm (210mm x 297mm) - Original
                                const pageWidth = 190; // A4 width in mm
                                const pageHeight = 297; // A4 height in mm

                                // Create a new jsPDF instance with A4 page size
                                const pdf = new jsPDF({
                                    unit: 'mm', // Set units to mm
                                    format: 'a4', // A4 format
                                    orientation: 'portrait', // Portrait orientation
                                });

                                console.log('Generating PDF...');

                                // Calculate scale to fit horizontally
                                const contentWidth = document.body.scrollWidth; // Full page width
                                const scale = pageWidth / contentWidth; // Scale factor to fit page width

                                // Ensure the content fits horizontally without scaling text vertically
                                pdf.html(document.body, {
                                    callback: function (doc) {
                                        // After rendering the HTML content, save the PDF
                                        doc.save(document.title + '.pdf');
                                        console.log('PDF successfully downloaded.');
                                    },
                                    x: 10, // Horizontal margin
                                    y: 10, // Vertical margin
                                    html2canvas: {
                                        scale: scale, // Apply the scale to fit horizontally
                                        logging: true, // Enable logging for debugging
                                        width: pageWidth, // Set the width for fitting horizontally
                                        height: pageHeight, // Prevent cutting off the height of the content
                                        letterRendering: true, // Improve font rendering
                                    },
                                });
                            });
                        });
                    });
                }
            });
        })();
    });
})();
