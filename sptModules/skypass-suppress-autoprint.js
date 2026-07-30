// Feature module: the booking-print page auto-triggers window.print() via an
// inline <script> at the very end of its own HTML, popping open the
// browser's print dialog on every single page load. Now that "Download PDF"
// (see skypass-pdf-download.js) generates an identical PDF programmatically
// via the Chrome DevTools Protocol, that automatic dialog is just an
// unwanted interruption - this neutralizes window.print() before the page's
// own script runs.
//
// This has to run in the page's own MAIN world (see the "world": "MAIN"
// entry for this file in manifest.json), not the extension's usual isolated
// world - overriding window.print in the isolated world only affects calls
// made from other isolated-world content scripts, not the page's own
// inline <script>, since each world has its own separate global object.
//
// This only blocks the JS-triggered dialog. Ctrl+P and the browser's own
// Print... menu item are handled by the browser directly, independently of
// window.print, and still work normally if ever needed.
(function () {
    'use strict';
    if (!window.location.href.includes('/booking-print/')) return;
    window.print = function () {};
})();
