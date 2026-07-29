// Feature module: finds the maximum number of adults bookable on a single
// flight page by brute-forcing the seat count via a hidden iframe.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableMaxAdultsFinder) (function() {
            'use strict';

            // Function to create an iframe and load the target page
            function createIframe(url) {
                return new Promise((resolve) => {
                    const iframe = document.createElement('iframe');
                    iframe.style.display = 'none';
                    iframe.src = url;
                    document.body.appendChild(iframe);
                    iframe.onload = () => resolve(iframe);
                });
            }

            // Function to simulate setting the number of adults
            async function setAdults(iframe, num) {
                return new Promise((resolve) => {
                    const adultInput = iframe.contentDocument.querySelector('#adults');

                    if (adultInput) {
                        adultInput.value = num;
                        let event = new Event('input', { bubbles: true });
                        adultInput.dispatchEvent(event);

                        setTimeout(() => {
                            let error = iframe.contentDocument.querySelector('#top-alert-message.alert.alert-danger');
                            if (error && error.innerText.includes("Seats not available")) {
                                resolve(false);
                            } else {
                                resolve(true);
                            }
                        }, 0); // Adjust delay as necessary
                    } else {
                        resolve(false);
                    }
                });
            }

            async function findMaxAdults(url) {
                const iframe = await createIframe(url);
                let maxAdults = 0;

                for (let i = 1; i <= 200; i++) {
                    let isValid = await setAdults(iframe, i);
                    if (!isValid) {
                        maxAdults = i - 1;
                        break;
                    } else {
                        maxAdults = i; // Update maxAdults to the current valid number
                    }
                }

                document.body.removeChild(iframe); // Clean up

                // Find the parent div and replace the 5th flight_search_middel div
                const parentDiv = document.querySelector('.flight_multis_area_wrapper');
                if (parentDiv) {
                    const flightSearchMiddles = parentDiv.querySelectorAll('.flight_search_middel');
                    if (flightSearchMiddles.length >= 5) {
                        // Create and insert the new div
                        const newDiv = document.createElement('div');
                        newDiv.className = 'flight_search_middel';
                        newDiv.style.justifyContent = 'center';
                        newDiv.innerHTML = `
                            <div class="flight_search_destination">
                                <p class="text-center">Seats</p>
                                <span class="text-white rounded-100 py-4 px-10 text-center text-14 fw-500 bg-danger">${maxAdults}</span>
                            </div>
                        `;

                        // Insert the new div before the 5th flight_search_middel
                        const referenceDiv = flightSearchMiddles[4]; // 0-based index for 5th element
                        parentDiv.insertBefore(newDiv, referenceDiv);

                        // Remove the old 5th flight_search_middel div
                        referenceDiv.parentElement.removeChild(referenceDiv);
                    }
                }
            }

            // Run the function with the current page's URL
            const currentURL = window.location.href;
            findMaxAdults(currentURL);
        })();
    });
})();
