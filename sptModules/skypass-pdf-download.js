// Feature module: downloads the booking-print page as an A4 PDF via a
// "Download PDF" button appended after all of the page's own content
// (replaces the earlier "click the booking number to download" trigger, and
// an even earlier version pinned to the top-left of the page).
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
//
// This used to render the page via html2canvas + jsPDF, but this page's
// layout uses CSS Grid extensively (see its .grid-container/.line-12/etc.
// rules), and html2canvas has long-standing incomplete support for CSS
// Grid - it reliably collapsed/misplaced the layout and dropped the colored
// section backgrounds, which is why the downloaded PDF looked so different
// from a normal browser print. The page's own inline <script>window.print()
// at the bottom already proves this page was built to be printed by the
// browser's real engine, not screenshotted - so the button now asks
// background.js to render it via the Chrome DevTools Protocol's
// Page.printToPDF (see background.js), which IS that same real engine, just
// invoked programmatically instead of through a dialog.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enablePdfDownload) (function () {
            'use strict';

            if (!window.location.href.includes('/booking-print/')) return;

            // Same class names as this extension's other injected buttons
            // (see skypass-download-csv.js's Download CSV button), for
            // whatever consistency that provides if the page's own CSS
            // defines them. The booking-print page turned out NOT to load
            // that CSS (the button rendered plain white/unstyled with only
            // these classes) - so the explicit inline styles below are the
            // real source of the look, not these classes.
            const SPT_BTN_CLASS = 'button h-50 px-24 -dark-1 bg-blue-1 text-white';

            function generatePdf(button) {
                const originalText = button.textContent;
                button.textContent = 'Generating...';
                button.disabled = true;

                // Page.printToPDF turned out not to reliably honor the
                // @media print rule below (it doesn't consistently apply
                // 'print' CSS media for its own rendering pass, even after
                // explicitly requesting it via Emulation.setEmulatedMedia in
                // background.js), so the button - disabled text and all -
                // still showed up baked into the PDF. Actually removing it
                // from layout for the duration of the capture can't fail the
                // same way, since there's nothing left in the DOM to render.
                button.style.setProperty('display', 'none', 'important');

                function resetButton() {
                    button.textContent = originalText;
                    button.disabled = false;
                    button.style.setProperty('display', 'block', 'important');
                }

                function failWith(message, err) {
                    if (err) console.error('[Skypass PDF]', message, err);
                    else console.error('[Skypass PDF]', message);
                    resetButton();
                    alert(message + ' Open the browser console (F12) for details.');
                }

                chrome.runtime.sendMessage({
                    type: 'SPT_GENERATE_PDF',
                    filename: (document.title || 'booking') + '.pdf'
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        failWith('PDF generation failed.', chrome.runtime.lastError);
                        return;
                    }
                    if (!response || !response.ok) {
                        // A debugger is very likely already attached (e.g.
                        // DevTools is open on this tab) if this specific
                        // message comes back.
                        failWith((response && response.error) || 'PDF generation failed.');
                        return;
                    }
                    console.log('PDF successfully downloaded.');
                    resetButton();
                });
            }

            // Hides the button when the user does a native browser print
            // (Ctrl+P). This does NOT cover generatePdf()'s own
            // Page.printToPDF capture (see the display:none toggle there
            // instead) - Page.printToPDF didn't reliably honor this rule.
            function ensurePrintHiddenStyle() {
                if (document.getElementById('spt-pdf-print-hide-style')) return;
                const style = document.createElement('style');
                style.id = 'spt-pdf-print-hide-style';
                style.textContent = '@media print { #spt-pdf-download-btn { display: none !important; } }';
                document.head.appendChild(style);
            }

            function createPdfButton() {
                if (document.getElementById('spt-pdf-download-btn')) return;

                const btn = document.createElement('button');
                btn.id = 'spt-pdf-download-btn';
                btn.type = 'button';
                btn.textContent = 'Download PDF';
                btn.title = 'Download this booking as a PDF';
                btn.className = SPT_BTN_CLASS;

                // Inline fallback so the button looks like this extension's
                // other buttons (Download CSV, Copy, etc.) even on pages
                // like this one where the site's own bg-blue-1/button/h-50
                // classes turned out not to be defined - !important beats
                // any stray page rule the same way the site's own utility
                // classes would. Normal (non-fixed) flow this time, since the
                // button now sits after all the ticket content instead of
                // floating over it.
                btn.style.setProperty('display', 'block', 'important');
                btn.style.setProperty('margin', '40px auto 20px', 'important');
                btn.style.setProperty('background-color', '#275981', 'important');
                btn.style.setProperty('color', '#fff', 'important');
                btn.style.setProperty('border', 'none', 'important');
                btn.style.setProperty('border-radius', '6px', 'important');
                btn.style.setProperty('height', '50px', 'important');
                btn.style.setProperty('padding', '0 24px', 'important');
                btn.style.setProperty('font-size', '14px', 'important');
                btn.style.setProperty('font-weight', '600', 'important');
                btn.style.setProperty('box-shadow', '0 2px 6px rgba(0,0,0,.35)', 'important');
                btn.style.setProperty('cursor', 'pointer', 'important');

                btn.addEventListener('click', () => generatePdf(btn));

                document.body.appendChild(btn);
            }

            ensurePrintHiddenStyle();

            // Wait for the ticket content itself to have rendered before
            // appending the button, so it's genuinely the last thing on the
            // page (after every real content div) instead of racing ahead of
            // content that renders after its own data fetch.
            window.sptWaitForSelector('.card-header table tbody tr:nth-child(2) td:nth-child(2)', createPdfButton);
        })();
    });
})();
