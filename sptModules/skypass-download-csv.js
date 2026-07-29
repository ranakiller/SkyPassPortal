// Feature module: "Download CSV" button on the view-booking page, exporting
// booking info for the eTravel CRM import.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableDownloadCsvButton) (function () {
            'use strict';

            function waitForSelector(selector, callback) {
                const el = document.querySelector(selector);
                if (el) return callback(el);
                const observer = new MutationObserver(() => {
                    const el = document.querySelector(selector);
                    if (el) {
                        observer.disconnect();
                        callback(el);
                    }
                });
                observer.observe(document.body, { childList: true, subtree: true });
            }

            function formatDate(input) {
                const date = new Date(input.replace(/(\d{1,2}) (\w+) (\d{4})/, '$1 $2 $3'));
                const day = String(date.getDate()).padStart(2, '0');
                const month = String(date.getMonth() + 1).padStart(2, '0');
                return `${day}/${month}/${date.getFullYear()}`;
            }

            function cleanAmount(str) {
                return parseInt(str.replace(/[^\d]/g, ''), 10);
            }

            function addDownloadButton() {
                const printBtn = Array.from(document.querySelectorAll('#tab-button a')).find(
                    a => a.textContent.trim().toLowerCase() === 'print booking'
                );

                if (!printBtn) return;

                const printDiv = printBtn.closest('#tab-button');
                if (!printDiv) return;

                // Create new sibling div just like others
                const newDiv = document.createElement('div');
                newDiv.className = 'd-inline-block pt-30';
                newDiv.id = 'tab-button'; // optional, or remove if you prefer unique IDs

                const btn = document.createElement('a');
                btn.textContent = 'Download CSV';
                btn.className = 'button h-50 px-24 -dark-1 bg-blue-1 text-white';
                btn.style.cursor = 'pointer';
                btn.style.marginLeft = '3px';
                btn.addEventListener('click', generateCSV);

                newDiv.appendChild(btn);

                // Insert after printDiv
                printDiv.parentNode.insertBefore(newDiv, printDiv.nextSibling);
            }

            function generateCSV() {
                const customerID = prompt('Enter Customer ID')?.toUpperCase();
                if (!customerID) return;

                const bookingTable = document.querySelectorAll('tbody')[0];
                const bookingRows = bookingTable.querySelectorAll('tr');
                const bookedOnRaw = bookingRows[1].children[1].textContent.trim();
                const bookedOn = formatDate(bookedOnRaw.split(',')[0]);
                const bkNumber = bookingRows[1].children[3].textContent.trim();
                const routeRaw = bookingRows[2].children[1].textContent.trim();
                const routeType = routeRaw.toUpperCase() === 'ROUND TRIP' ? 'Two Way' : routeRaw;
                const pnr = bookingRows[2].children[3].textContent.trim();

                const flightRows = [...document.querySelectorAll('.table-striped.dataTable tbody tr')];
                const paxRows = [...document.querySelectorAll('.table-4.-border-bottom tbody tr')];

                const header = `SNO,Date,Link Umrah,Customer ID,Order Ref,Ticket No,Ticket Airline,Issue Date,PNR,Title,Surname,Givenname,CNIC,PAX,Passport No,Expiry Date,Nationality,Basic Fare,SPAPT,RGCEDCVT,PBADV,Other Tax,Airline Charges,Air Comm%,Air WH%,Charges,Customer WH%,Discount%,Exchange Rate,Service Provider ID,Airline or BSP ID,Notes,Route,Flight No 1,Sector From 1,Sector To 1,Departure Date 1,Departure Time 1,Arrival Date 1,Arrival Time 1,Baggage 1,Class 1,RBD 1,Flight No 2,Sector From 2,Sector To 2,Departure Date 2,Departure Time 2,Arrival Date 2,Arrival Time 2,Baggage 2,Class 2,RBD 2,Flight No 3,Sector From 3,Sector To 3,Departure Date 3,Departure Time 3,Arrival Date 3,Arrival Time 3,Baggage 3,Class 3,RBD 3,Flight No 4,Sector From 4,Sector To 4,Departure Date 4,Departure Time 4,Arrival Date 4,Arrival Time 4,Baggage 4,Class 4,RBD 4`;

                const rows = [];

                paxRows.forEach((row, index) => {
                    const cells = row.children;
                    const title = cells[1].textContent.trim();
                    const surname = cells[2].textContent.trim();
                    const given = cells[3].textContent.trim();
                    const passport = cells[4].textContent.trim();
                    const expiryRaw = cells[6].textContent.trim();
                    const expiry = formatDate(expiryRaw);
                    const nationality = cells[7].textContent.trim();
                    const notes = nationality.toUpperCase() !== 'PAKISTAN' ? nationality : '';
                    const price = cleanAmount(cells[8].innerText);
                    const discountCell = cleanAmount(cells[9].innerText);
                    const discount = /^\d+$/.test(discountCell) ? parseInt(discountCell, 10) : settings.csvDiscountDefault;
                    const fare = price - discount;
                    const ticketAirline = flightRows[0]?.children[0]?.textContent.trim().split(' ')[0] || '';
                    const ticketNo = `000-${bkNumber}-000-${String(index + 1).padStart(3, '0')}`;
                    const charges = settings.csvCharges;

                    const flightsData = flightRows.map(f => {
                        const flightNoFull = f.children[0].textContent.trim();
                        const flightNo = flightNoFull.split(' ')[1];
                        const fromTo = f.children[3].textContent.trim().split('-');
                        return [
                            flightNo,
                            fromTo[0],
                            fromTo[1],
                            formatDate(f.children[1].textContent.trim()),
                            f.children[2].textContent.trim(),
                            formatDate(f.children[4].textContent.trim()),
                            f.children[5].textContent.trim(),
                            f.children[7].textContent.trim(), // baggage
                            'Economy',
                            'A'
                        ];
                    });

                    // Pad flight segments to 4
                    while (flightsData.length < 4) {
                        flightsData.push(['', '', '', '', '', '', '', '', '', '']);
                    }

                    const rowData = [
                        index + 1,
                        bookedOn,
                        'No',
                        customerID,
                        '',
                        ticketNo,
                        ticketAirline,
                        bookedOn,
                        pnr,
                        title,
                        surname,
                        given,
                        '',
                        'A',
                        passport,
                        expiry,
                        'Pakistan',
                        fare,
                        0, 0, 0, 0, 0, 0, 0,
                        charges,
                        0, 0,
                        settings.csvExchangeRate,
                        settings.csvServiceProviderId,
                        '',
                        notes,
                        routeType,
                        ...flightsData.flat()
                    ];
                    rows.push(rowData.join(','));
                });

                const csv = `${header}\n${rows.join('\n')}`;
                const blob = new Blob([csv], { type: 'text/csv' });
                const link = document.createElement('a');
                link.download = `booking_${bkNumber}.csv`;
                link.href = URL.createObjectURL(blob);
                link.click();
            }

            waitForSelector('#tab-button', addDownloadButton);
        })();
    });
})();
