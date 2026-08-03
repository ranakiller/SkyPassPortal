// Feature module: adds the same City/Airline/Sector/Day button-style filters
// used on the book-group-tickets page (skypass-flight-filters.js) to the
// Umrah packages page, filtering .package-card.api-package-card elements
// instead of table rows. Split out as its own file so this feature can't be
// affected by unrelated features sharing a file/closure/observer.
//
// This runs independently of the page's own native Sector/Airline/Hotel
// Makkah/Hotel Madina dropdown filters (in .api-filter-controls) - both set
// card.style.display directly, so using one after the other can override
// what the other just hid/showed. That's an accepted limitation rather than
// something this reconciles, since only one filtering UI was asked for here.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableUmrahPackagesFilters) (function () {
            'use strict';

            if (!window.location.href.includes('/agents/book-umrah-packages-api')) return;

            window.sptWaitForSelector('.package-card.api-package-card', function () {
                const filterControls = document.querySelector('.api-filter-controls');
                if (!filterControls) return;

                const cityFilterDiv = document.createElement('div');
                cityFilterDiv.className = 'spt-umrah-filter-row spt-umrah-filter-cities';
                cityFilterDiv.style.marginTop = '10px';

                const sectorFilterDiv = document.createElement('div');
                sectorFilterDiv.className = 'spt-umrah-filter-row spt-umrah-filter-sectors';
                sectorFilterDiv.style.marginTop = '10px';

                const airlineFilterDiv = document.createElement('div');
                airlineFilterDiv.className = 'spt-umrah-filter-row spt-umrah-filter-airlines';
                airlineFilterDiv.style.marginTop = '10px';

                const dayFilterDiv = document.createElement('div');
                dayFilterDiv.className = 'spt-umrah-filter-row spt-umrah-filter-days';
                dayFilterDiv.style.marginTop = '10px';

                filterControls.parentNode.insertBefore(cityFilterDiv, filterControls.nextSibling);
                filterControls.parentNode.insertBefore(sectorFilterDiv, cityFilterDiv.nextSibling);
                filterControls.parentNode.insertBefore(airlineFilterDiv, sectorFilterDiv.nextSibling);
                filterControls.parentNode.insertBefore(dayFilterDiv, airlineFilterDiv.nextSibling);

                function getAllCards() {
                    return Array.from(document.querySelectorAll('.package-card.api-package-card'));
                }

                function getCardAirline(card) {
                    return (card.dataset.airline || '').trim().toUpperCase();
                }

                function getCardSector(card) {
                    return (card.dataset.sector || '').trim().toUpperCase();
                }

                function getCardDay(card) {
                    const durationText = card.querySelector('.package-nights')?.textContent || '';
                    const match = durationText.match(/(\d+)/);
                    return match ? parseInt(match[1], 10) : null;
                }

                function createFilterButton(parent, id, label, type) {
                    const input = document.createElement('input');
                    input.type = type === 'clear' ? 'button' : 'checkbox';
                    input.className = 'btn-check spt-umrah-filter-btn';
                    input.name = `sptUmrahFilterCheckbox-${type}`;
                    input.id = id;
                    input.value = label;

                    const buttonLabel = document.createElement('label');
                    buttonLabel.className = 'btn btn-outline-primary';
                    buttonLabel.setAttribute('for', id);
                    buttonLabel.textContent = label;
                    buttonLabel.style.margin = '1px';
                    buttonLabel.style.fontSize = '12px';
                    buttonLabel.style.width = 'auto';
                    buttonLabel.style.padding = '2px 6px';

                    parent.appendChild(input);
                    parent.appendChild(buttonLabel);

                    if (type === 'clear') {
                        buttonLabel.addEventListener('click', () => {
                            clearAllFilters();
                            applyCombinedFilter();
                        });
                    } else {
                        input.addEventListener('click', () => applyCombinedFilter());
                    }
                }

                function createAllFilterButtons() {
                    const uniqueAirlines = new Set();
                    const uniqueSectors = new Set();
                    const uniqueDays = new Set();
                    const originCities = new Set();
                    const destinationCities = new Set();

                    getAllCards().forEach(card => {
                        if (card.style.display === 'none') return;

                        const airline = getCardAirline(card);
                        if (airline) uniqueAirlines.add(airline);

                        const sector = getCardSector(card);
                        if (sector) {
                            uniqueSectors.add(sector);
                            const cities = sector.split('-').slice(0, 2);
                            if (cities[0]) originCities.add(cities[0]);
                            if (cities[1]) destinationCities.add(cities[1]);
                        }

                        const day = getCardDay(card);
                        if (day !== null) uniqueDays.add(day);
                    });

                    uniqueAirlines.forEach(airline => {
                        createFilterButton(airlineFilterDiv, `spt-umrah-airline-${airline}`, airline, 'airline');
                    });
                    uniqueSectors.forEach(sector => {
                        createFilterButton(sectorFilterDiv, `spt-umrah-sector-${sector}`, sector, 'sector');
                    });
                    Array.from(uniqueDays).sort((a, b) => a - b).forEach(day => {
                        createFilterButton(dayFilterDiv, `spt-umrah-day-${day}`, `${day} Days`, 'day');
                    });
                    createFilterButton(dayFilterDiv, 'spt-umrah-clear-filters', 'Clear Filters', 'clear');
                    originCities.forEach(city => {
                        createFilterButton(cityFilterDiv, `spt-umrah-city-${city}`, city, 'city');
                    });
                    destinationCities.forEach(city => {
                        if (!originCities.has(city)) {
                            createFilterButton(cityFilterDiv, `spt-umrah-city-${city}`, city, 'city');
                        }
                    });
                }

                function getSelectedValues(type, prefix) {
                    return Array.from(document.querySelectorAll(`input[name="sptUmrahFilterCheckbox-${type}"]:checked`))
                        .map(input => input.id.replace(prefix, ''));
                }

                function applyCombinedFilter() {
                    const selectedAirlines = getSelectedValues('airline', 'spt-umrah-airline-');
                    const selectedSectors = getSelectedValues('sector', 'spt-umrah-sector-');
                    const selectedDays = getSelectedValues('day', 'spt-umrah-day-').map(d => parseInt(d, 10));
                    const selectedCities = getSelectedValues('city', 'spt-umrah-city-');

                    getAllCards().forEach(card => {
                        const airline = getCardAirline(card);
                        const sector = getCardSector(card);
                        const day = getCardDay(card);

                        const airlineMatch = selectedAirlines.length === 0 || selectedAirlines.includes(airline);
                        const sectorMatch = selectedSectors.length === 0 || selectedSectors.includes(sector);
                        const dayMatch = selectedDays.length === 0 || selectedDays.includes(day);
                        const cityMatch = selectedCities.length === 0 || selectedCities.some(city => sector.includes(city));

                        card.style.display = (airlineMatch && sectorMatch && dayMatch && cityMatch) ? '' : 'none';
                    });

                    highlightButtonsFromVisibleCards();
                }

                function highlightButtonsFromVisibleCards() {
                    document.querySelectorAll('.spt-umrah-filter-btn').forEach(input => {
                        const label = document.querySelector(`label[for="${input.id}"]`);
                        if (label) label.style.fontWeight = 'normal';
                    });

                    const anyChecked = document.querySelectorAll('input.spt-umrah-filter-btn[type="checkbox"]:checked').length > 0;
                    if (!anyChecked) return;

                    const visibleCards = getAllCards().filter(card => card.style.display !== 'none');

                    const seen = { airline: new Set(), sector: new Set(), day: new Set(), city: new Set() };

                    visibleCards.forEach(card => {
                        const airline = getCardAirline(card);
                        if (airline) seen.airline.add(`spt-umrah-airline-${airline}`);

                        const sector = getCardSector(card);
                        if (sector) {
                            seen.sector.add(`spt-umrah-sector-${sector}`);
                            sector.split('-').slice(0, 2).forEach(city => {
                                if (city) seen.city.add(`spt-umrah-city-${city}`);
                            });
                        }

                        const day = getCardDay(card);
                        if (day !== null) seen.day.add(`spt-umrah-day-${day}`);
                    });

                    for (const type in seen) {
                        seen[type].forEach(id => {
                            const label = document.querySelector(`label[for="${id}"]`);
                            if (label) label.style.fontWeight = 'bold';
                        });
                    }
                }

                function clearAllFilters() {
                    document.querySelectorAll('input.spt-umrah-filter-btn[type="checkbox"]').forEach(cb => { cb.checked = false; });
                }

                createAllFilterButtons();
            });
        })();
    });
})();
