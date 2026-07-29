// Ported from userscript "SPT Find Seats on All Flights" v0.1 (author: Rana Furqan)
// Original @match: https://skypass.pk/agents/book-tickets

(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (!settings.enableFindSeats) return;

        // Select all buttons with the specified class
        const buttons = Array.from(document.querySelectorAll('a.btn.bg-dark-4.btn_sm.text-white'));

        // How many adults to try loading before giving up and showing "N+".
        // Configurable from the popup (default 6, i.e. shows up to "5+").
        const maxAdultsToProbe = settings.findSeatsMaxAdultsToProbe;

        // Function to create a single iframe
        function createIframe() {
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            return iframe;
        }

        // Function to inject minimal styles into the iframe
        function injectMinimalStyles(iframe) {
            const style = document.createElement('style');
            style.innerHTML = `
                body, * {
                    all: unset; /* Disable all styles */
                    display: block !important;
                    visibility: visible !important;
                    font-size: 16px !important;
                }
                body {
                    background: white !important;
                    margin: 0;
                    padding: 0;
                }
            `;
            iframe.contentDocument.head.appendChild(style);
        }

        // Function to simulate setting the number of adults
        function setAdults(iframe, num) {
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
                    }, 50); // Small delay to ensure event handling
                } else {
                    resolve(false);
                }
            });
        }

        async function findMaxAdults(iframe, url) {
            return new Promise((resolve) => {
                iframe.src = url;
                iframe.onload = async () => {
                    // Inject minimal styles after the iframe loads
                    injectMinimalStyles(iframe);

                    let maxAdults = 0;

                    for (let i = 1; i <= maxAdultsToProbe; i++) {
                        let isValid = await setAdults(iframe, i);
                        if (!isValid) {
                            maxAdults = i - 1;
                            break;
                        } else if (i === maxAdultsToProbe) {
                            maxAdults = maxAdultsToProbe - 1;
                        } else {
                            maxAdults = i;
                        }
                    }

                    // Prepare the text to display
                    let seatText = maxAdults < maxAdultsToProbe - 1 ? `${maxAdults}` : `${maxAdultsToProbe - 1}+`;

                    // Find the corresponding button and append the result below it
                    const button = buttons.find(btn => btn.href === url);
                    if (button) {
                        // Update the text inside the button
                        button.textContent = `💺 ${seatText}`;
                    }

                    resolve();
                };
            });
        }

        async function processAllUrls(buttons) {
            const iframe = createIframe();

            for (let i = 0; i < buttons.length; i++) {
                const sectorURL = buttons[i].href;
                // console.log(`Processing ${i + 1}/${buttons.length}: ${sectorURL}`);

                await findMaxAdults(iframe, sectorURL);

                // Slight delay between each URL to allow browser to catch up
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            document.body.removeChild(iframe); // Clean up after processing all URLs
        }

        // Start processing all URLs
        processAllUrls(buttons);
    });
})();
