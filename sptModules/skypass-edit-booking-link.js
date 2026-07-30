// Feature module: on the view-booking page, replaces the "Confirm" cell's
// link so it points at the edit-booking (agent_ticket) page instead.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableEditBookingLink) (function() {
            'use strict';

            // Get the current URL
            let currentUrl = window.location.href;

            // Replace 'view-booking' with 'agent_ticket'
            let updatedUrl = currentUrl.replace("view-booking", "agent_ticket");

            // The booking details (including this cell) render after their
            // own data fetch, independently of the browser's 'load' event, so
            // wait for the element to actually exist.
            window.sptWaitForSelector("td.text-center.text-success", function (targetTd) {
                targetTd.innerHTML = `<a href="${updatedUrl}" class="text-success">Confirm</a>`;
            });
        })();
    });
})();
