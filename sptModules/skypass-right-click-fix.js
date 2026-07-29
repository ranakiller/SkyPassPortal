// Feature module: re-enable right-click on Skypass pages that block it.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableRightClickFix) (function() {
            'use strict';

            // Function to enable right-click
            const enableRightClick = () => {
                // Remove event listeners blocking right-click
                document.addEventListener('contextmenu', event => event.stopPropagation(), true);
                document.addEventListener('contextmenu', event => event.stopImmediatePropagation(), true);
                document.addEventListener('contextmenu', event => event.preventDefault(), true);
            };

            // Run the function after the page has loaded
            window.addEventListener('load', enableRightClick);
        })();
    });
})();
