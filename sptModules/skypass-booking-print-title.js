// Feature module: sets the page title using Booking ID and a timestamp on
// the booking-print page.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableBookingPrintTitle) (function () {
            'use strict';

            if (!window.location.href.includes("/booking-print/")) return;

            function pad(n) {
                return n.toString().padStart(2, '0');
            }

            function formatTimestamp() {
                const now = new Date();
                return (
                    pad(now.getDate()) +
                    pad(now.getMonth() + 1) +
                    now.getFullYear().toString().slice(-2) +
                    pad(now.getHours()) +
                    pad(now.getMinutes()) +
                    pad(now.getSeconds())
                );
            }

            function tryChangeTitle(attempt = 0) {
                const allTds = document.querySelectorAll('td');
                let bookingNumber = null;
                let pnr = null;

                for (let i = 0; i < allTds.length; i++) {
                    const label = allTds[i].textContent.trim();

                    if (label === "Booking ID") {
                        const nextTd = allTds[i + 1];
                        if (nextTd) bookingNumber = nextTd.textContent.trim();
                    }

                    if (label === "Booking Reference Number (PNR)") {
                        const nextTd = allTds[i + 1];
                        if (nextTd) pnr = nextTd.textContent.trim();
                    }

                    if (bookingNumber && pnr) break; // Exit early if both are found
                }

                if (!bookingNumber || !pnr) {
                    if (attempt > 10) return;
                    return setTimeout(() => tryChangeTitle(attempt + 1), 500);
                }

                const timestamp = formatTimestamp();
                const newTitle = `BK-${bookingNumber}-PNR-${pnr}-Customer-Confirmation-${timestamp}`;
                document.title = newTitle;
            }

            tryChangeTitle();
        })();
    });
})();
