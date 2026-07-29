// Feature module: auto-formats DOB & passport expiry fields from d/m/yy to
// dd MMM yyyy on blur.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableDobDoeFormatting) (function() {
            'use strict';

            // Function to format date from d/m/yy to dd mmm yyyy
            function formatDate(dateStr) {
                const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                const [day, month, year] = dateStr.split('/').map(num => parseInt(num, 10));
                const fullYear = year < 50 ? 2000 + year : 1900 + year; // Assuming 50 as the cutoff for year 2000 and above
                return `${('0' + day).slice(-2)} ${months[month - 1]} ${fullYear}`;
            }

            // Function to update date fields on blur
            function updateDateFields(event) {
                const target = event.target;
                const datePattern = /^\d{1,2}\/\d{1,2}\/\d{2}$/;
                if (datePattern.test(target.value) && /^adult_(dob|passport_expiry)_\d+$/.test(target.id)) {
                    target.value = formatDate(target.value);
                }
            }

            // Function to observe changes in the DOM
            function observeDOMChanges() {
                const target = document.querySelector('body');

                const observer = new MutationObserver(function(mutationsList) {
                    for (let mutation of mutationsList) {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            document.querySelectorAll('[id^="adult_dob_"], [id^="adult_passport_expiry_"]').forEach(element => {
                                element.addEventListener('blur', updateDateFields);
                            });
                        }
                    }
                });

                observer.observe(target, { childList: true, subtree: true });
            }

            // Initial setup
            window.addEventListener('load', function() {
                document.querySelectorAll('[id^="adult_dob_"], [id^="adult_passport_expiry_"]').forEach(element => {
                    element.addEventListener('blur', updateDateFields);
                });
                observeDOMChanges();
            });
        })();
    });
})();
