// Feature module: copy button on the multi-city seat-booking page.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableSeatsCopyButton) (function () {
            'use strict';

            // Function to create a "Copy" button
            function createCopyButton(div, id, formattedTextCallback) {
                let button = document.getElementById(id);
                if (!button) {
                    // Find the first image in the div
                    let imageElement = div.querySelector('.flight_logo img');
                    if (imageElement) {
                        button = document.createElement('button');
                        button.id = id;
                        button.innerText = 'Copy';
                        button.className = 'btn bg-dark-4 btn_sm text-white';

                        // Insert the button in place of the image
                        imageElement.parentElement.replaceChild(button, imageElement);

                        // Add the copy functionality
                        button.addEventListener('click', () => {
                            const formattedText = formattedTextCallback();
                            navigator.clipboard.writeText(formattedText).then(() => {
                                button.textContent = 'Done';
                                setTimeout(() => {
                                    button.textContent = 'Copy';
                                }, 1000);
                            }).catch(err => {
                                console.error('Failed to copy text:', err);
                            });
                        });
                    }
                }
            }

            // Function to put copy button on the booking details page
            function formatDivContent(div) {
                let message = '';

                // Extract fare (Adult Price)
                let fareElement = div.querySelector('.flight_search_middel:nth-of-type(5) .fw-bold');
                let fare = fareElement ? fareElement.textContent.trim().replace(/PKR|,/g, '').trim() : '0';
                message += `*FARE ${fare}*`;

                // Extract days
                let daysElement = div.querySelector('#days-span-1');
                let days = daysElement ? daysElement.textContent.trim() : '';
                message += days !== '' ? ` \`${days}\`` : '';

                // Extract seats
                let seatsElement = div.querySelector('.flight_search_middel:nth-of-type(6) .text-white');
                let seats = seatsElement ? seatsElement.textContent.trim() : '0';
                message += ` 💺(${seats})\n`;

                // Extract sector information
                let sectors = div.querySelectorAll('.flight_search_sector_info');
                sectors.forEach((sector, index) => {
                    let details = Array.from(sector.querySelectorAll('span.fw-bold')).map(el => el.textContent.trim());
                    if (details.length >= 4) {
                        let flight = details[0].replace(/\s/g, '');
                        let date = details[1].toUpperCase().replace(/\s/g, '').replace(/\d{4}/, '');
                        let route = details[2].replace(/-/g, '');
                        let times = details[3];
                        let baggage = details[4].replace('-KG Baggage', '').trim();

                        message += `\`\`\`${flight} ${date} ${route} ${times}\`\`\` \`${baggage}\`\n`;
                    }
                });

                return message.trim();
            }

            // Function to observe changes to the seats element
            function observeSeatsChange(div, buttonId, formattedTextCallback) {
                let seatsElement = div.querySelector('.flight_search_middel:nth-of-type(6) .text-white');
                if (seatsElement) {
                    const observer = new MutationObserver(() => {
                        // Update button with the latest formatted text
                        const button = document.getElementById(buttonId);
                        if (button) {
                            button.remove(); // Remove the old button to ensure updated data
                        }
                        createCopyButton(div, buttonId, formattedTextCallback);
                    });

                    observer.observe(seatsElement, { childList: true, subtree: true, characterData: true });
                } else {
                    console.error('Seats element not found for observation.');
                }
            }

            // Main logic
            window.addEventListener('load', function () {
                let targetDiv = document.querySelector('.multi_city_flight_lists');
                if (!targetDiv) {
                    // console.error('Target div not found.');
                    return;
                }

                const formattedTextCallback = () => formatDivContent(targetDiv);
                createCopyButton(targetDiv, 'copy-button', formattedTextCallback);
                observeSeatsChange(targetDiv, 'copy-button', formattedTextCallback);
            });
        })();
    });
})();
