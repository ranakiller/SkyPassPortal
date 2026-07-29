// Feature module: "Bulk Browse" button on the Edit Booking page - scans
// several passport photos at once and fills MRZ/raw fields into every row.
// Split out of the old monolithic edit-booking-functions.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableMrzBulkFill && settings.enableOcrBrowse) (function () {
            'use strict';

            function addBulkBrowseButton() {
                // Clone the same native button row Back/Print/View already clone
                // from, so this button matches the page's own button styling
                // exactly (not just our own injected buttons' theme).
                const updateButtonDiv = document.querySelector(".col-xxl-2.col-xl-2.col-md-2.col-sm-12.mt-20");
                if (!updateButtonDiv) return;

                const bulkDiv = updateButtonDiv.cloneNode(true);
                const nativeButton = bulkDiv.querySelector("button");
                if (nativeButton) nativeButton.remove();

                const bulkBrowseBtn = window.sptCreateBulkOcrBrowseButton(
                    settings,
                    (index) => {
                        const row = document.querySelectorAll('#booking-table-id tr')[index];
                        const mrzInput = document.getElementById(`mrz_box_${index}`);
                        if (!row || !mrzInput) return [];
                        return [{
                            mrzInput,
                            rowFieldEls: {
                                surname: row.querySelector(`#sur_name_${index}`),
                                givenname: row.querySelector(`#given_name_${index}`),
                                passportNumber: row.querySelector(`#passport_number_${index}`),
                                dob: row.querySelector(`#dob_${index}`),
                                expiry: row.querySelector(`#passport_expiry_${index}`),
                                nationality: row.querySelector(`#nationality_${index}`)
                            }
                        }];
                    }
                );
                bulkDiv.appendChild(bulkBrowseBtn);

                updateButtonDiv.parentNode.appendChild(bulkDiv);
            }

            window.addEventListener('load', addBulkBrowseButton);
        })();
    });
})();
