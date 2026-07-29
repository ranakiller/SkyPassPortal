// Feature module: auto-checks the review/confirm checkbox on the seats page.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableAutoCheckReviewCheckbox) (function () {
            'use strict';

            // Wait for the page to fully load
            window.addEventListener('load', function () {
                // Function to check and click the checkbox
                function autoClickCheckbox() {
                    // Find the checkbox by its ID
                    const checkbox = document.getElementById('confirm-cehckbox');
                    if (checkbox && !checkbox.checked) {
                        checkbox.click(); // Click the checkbox if it's not already checked

                        // Stop observing once the checkbox is checked
                        observer.disconnect();
                    }
                }

                // Create a MutationObserver
                const observer = new MutationObserver(() => {
                    autoClickCheckbox();
                });

                // Start observing changes in the DOM
                observer.observe(document.body, { childList: true, subtree: true });

                // Initial call in case the checkbox is already present
                autoClickCheckbox();
            });
        })();
    });
})();
