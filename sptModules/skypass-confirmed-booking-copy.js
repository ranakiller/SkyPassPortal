// Feature module: "Copy Flight Info" button on the confirmed view-booking page.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableConfirmedBookingCopyButton) (function () {
            'use strict';

            function formatDate(dateStr) {
                const [day, monthName] = dateStr.split(' ').slice(0, 2);
                return `${day}${monthName.slice(0, 3).toUpperCase()}`;
            }

            function formatTime(timeStr) {
                return timeStr.replace(':', '');
            }

            function addCopyButtonForFlightTable(tableSelector, buttonId) {
                const table = document.querySelector(tableSelector);
                if (!table) return;

                if (document.getElementById(buttonId)) return;

                const button = document.createElement('button');
                button.id = buttonId;
                button.innerText = 'Copy Flight Info';
                button.className = 'btn bg-dark-4 btn_sm text-white';

                table.parentNode.insertBefore(button, table);

                button.addEventListener('click', () => {
                    const rows = table.querySelectorAll('tbody tr');
                    let message = '';

                    rows.forEach(row => {
                        const cells = row.querySelectorAll('td');
                        if (cells.length < 6) return;

                        const flight = cells[0].innerText.trim().replace(/\s+/g, '');
                        const depDate = formatDate(cells[1].innerText.trim());
                        const route = cells[3].innerText.trim().replace(/-/g, '');
                        const depTime = formatTime(cells[2].innerText.trim());
                        const arrTime = formatTime(cells[5].innerText.trim());

                        message += `\`\`\`${flight} ${depDate} ${route} ${depTime} ${arrTime}\`\`\`\n`;
                    });

                    navigator.clipboard.writeText(message.trim()).then(() => {
                        button.textContent = 'Copied!';
                        setTimeout(() => {
                            button.textContent = 'Copy Flight Info';
                        }, 1000);
                    }).catch(err => {
                        console.error('Copy failed:', err);
                    });
                });
            }

            const currentUrl = window.location.href;
            if (currentUrl.startsWith('https://skypass.pk/agents/view-booking/')) {
                // The flight table renders after its own data fetch,
                // independently of the browser's 'load' event, so wait for it
                // to actually exist rather than checking once on load.
                window.sptWaitForSelector('table.table-4', function () {
                    addCopyButtonForFlightTable('table.table-4', 'flight-table-copy-btn');
                });
            }
        })();
    });
})();
