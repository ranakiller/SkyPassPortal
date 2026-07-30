// Feature module: Back/Print Booking/View Booking buttons at the bottom of
// the Edit Booking page.
// Split out of the old monolithic edit-booking-functions.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableEditBookingButtons) (function() {
            'use strict';

            function duplicateAndModifyButtons(updateButtonDiv) {
                // Clone the update button div for other buttons (Back, Print, View)
                let clonedBackButtonDiv = updateButtonDiv.cloneNode(true);
                let clonedPrintButtonDiv = updateButtonDiv.cloneNode(true);
                let clonedViewButtonDiv = updateButtonDiv.cloneNode(true);

                // Modify the first cloned button to be the "Back" button
                let backButton = clonedBackButtonDiv.querySelector("button");
                backButton.innerText = "Back";
                backButton.addEventListener("click", function(event) {
                    event.preventDefault(); // Prevent the form submission
                    window.history.back(); // Go back to the previous page
                });

                // Insert the Back button before the original update button
                updateButtonDiv.parentNode.insertBefore(clonedBackButtonDiv, updateButtonDiv);

                // Modify the second cloned button to be the "Print Booking" button
                let printButton = clonedPrintButtonDiv.querySelector("button");
                printButton.innerText = "Print Booking";
                printButton.addEventListener("click", function(event) {
                    event.preventDefault(); // Prevent the form submission
                    // Navigate directly without checking form validity
                    window.location.href = window.location.href.replace('/agent_ticket/', '/booking-print/');
                });

                // Insert the Print Booking button after the original update button
                updateButtonDiv.parentNode.insertBefore(clonedPrintButtonDiv, updateButtonDiv.nextSibling);

                // Modify the third cloned button to be the "View Booking" button
                let viewButton = clonedViewButtonDiv.querySelector("button");
                viewButton.innerText = "View Booking";
                viewButton.addEventListener("click", function(event) {
                    event.preventDefault(); // Prevent the form submission
                    // Navigate directly without checking form validity
                    window.location.href = window.location.href.replace('/agent_ticket/', '/view-booking/');
                });

                // Insert the View Booking button after the Print Booking button
                updateButtonDiv.parentNode.insertBefore(clonedViewButtonDiv, clonedPrintButtonDiv.nextSibling);
            }

            // The booking form (including this button row) renders after its
            // own data fetch, independently of the browser's 'load' event, so
            // wait for it to actually exist rather than checking once on load.
            window.sptWaitForSelector(".col-xxl-2.col-xl-2.col-md-2.col-sm-12.mt-20", duplicateAndModifyButtons);
        })();
    });
})();
