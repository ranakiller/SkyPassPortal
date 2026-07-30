// Feature module: duplicates the tab-button div into a "Print Booking" button
// on the view-booking / edit-booking pages.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enablePrintBookingButton) (function () {
            function duplicateButtonDiv(originalDiv) {
                const newDiv = originalDiv.cloneNode(true);
                const newButton = newDiv.querySelector("a");

                if (newButton) {
                    newButton.href = window.location.href.replace("/view-booking/", "/booking-print/");
                    newButton.textContent = "Print Booking";
                }

                originalDiv.parentNode.appendChild(newDiv);
            }

            // The booking page's own button row renders after its data
            // fetch, independently of the browser's 'load' event, so wait for
            // it to actually exist rather than checking once immediately.
            window.sptWaitForSelector("#tab-button", duplicateButtonDiv);
        })();
    });
})();
