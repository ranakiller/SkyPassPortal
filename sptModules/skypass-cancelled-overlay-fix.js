// Feature module: removes the blurry overlay Skypass puts on cancelled bookings.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableCancelledOverlayFix) (function() {
            'use strict';

            // The cancelled-bookings list renders asynchronously (after its own
            // data fetch), independently of the browser's 'load' event, so a
            // one-shot check on 'load' would randomly miss it depending on how
            // fast that fetch finishes. Wait for the element to actually exist
            // instead, however long that takes.
            window.sptWaitForSelector('.cancelled-overlay', function (cancelledOverlayDiv) {
                cancelledOverlayDiv.classList.remove('cancelled-overlay');
            });
        })();
    });
})();
