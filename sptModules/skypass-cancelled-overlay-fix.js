// Feature module: removes the blurry overlay Skypass puts on cancelled bookings.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableCancelledOverlayFix) (function() {
            'use strict';

            // Wait for the page to be fully loaded
            window.addEventListener('load', function() {
                // Find the div with the class 'cancelled-overlay'
                const cancelledOverlayDiv = document.querySelector('.cancelled-overlay');

                // Check if the div exists
                if (cancelledOverlayDiv) {
                    // Remove the 'cancelled-overlay' class
                    cancelledOverlayDiv.classList.remove('cancelled-overlay');
                }
            });
        })();
    });
})();
