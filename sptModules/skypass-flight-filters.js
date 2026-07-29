// Feature module: adds dynamic City/Airline/Sector/Day filters to refine
// flight table results cumulatively on the book-tickets page.
// Split out of the old monolithic skypass-enhancements.js so this feature
// can't be affected by unrelated features sharing a file/closure/observer.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableFlightFilters) (function () {
            'use strict';

            if (window.location.href !== "https://skypass.pk/agents/book-tickets") return;

            window.addEventListener('load', function () {
                const colDiv = document.querySelector('.col-lg-12');
                if (!colDiv) return;

                const cityFilterDiv = document.createElement('div');
                cityFilterDiv.className = 'custom-filter-button-cities';
                cityFilterDiv.style.marginTop = '10px';

                const sectorFilterDiv = document.createElement('div');
                sectorFilterDiv.className = 'custom-filter-button-sectors';
                sectorFilterDiv.style.marginTop = '10px';

                const airlineFilterDiv = document.createElement('div');
                airlineFilterDiv.className = 'custom-filter-button-airlines';
                airlineFilterDiv.style.marginTop = '10px';

                const dayFilterDiv = document.createElement('div');
                dayFilterDiv.className = 'custom-filter-button-days';
                dayFilterDiv.style.marginTop = '10px';

                colDiv.parentNode.insertBefore(cityFilterDiv, colDiv.nextSibling);
                colDiv.parentNode.insertBefore(sectorFilterDiv, cityFilterDiv.nextSibling);
                colDiv.parentNode.insertBefore(airlineFilterDiv, sectorFilterDiv.nextSibling);
                colDiv.parentNode.insertBefore(dayFilterDiv, airlineFilterDiv.nextSibling);

                createAllFilterButtonsFromRows(document.querySelectorAll('table tbody tr'), null);

                function getCheckedStates() {
                    const checked = {
                        sector: new Set(),
                        airline: new Set(),
                        day: new Set(),
                        city: new Set(),
                    };

                    document.querySelectorAll('input[type="checkbox"]:checked').forEach(input => {
                        const type = input.name.replace('btncheckBox-', '');
                        checked[type].add(input.id);
                    });

                    return checked;
                }

                function restoreCheckedStates(checked) {
                    for (let type in checked) {
                        checked[type].forEach(id => {
                            const el = document.getElementById(id);
                            if (el) el.checked = true;
                        });
                    }
                }

                function createAllFilterButtonsFromRows(rows, skipType) {
                    const checked = getCheckedStates();

                    if (skipType !== 'sector') sectorFilterDiv.innerHTML = '';
                    if (skipType !== 'airline') airlineFilterDiv.innerHTML = '';
                    if (skipType !== 'day') dayFilterDiv.innerHTML = '';
                    if (skipType !== 'city') cityFilterDiv.innerHTML = '';

                    const uniqueAirlines = new Set();
                    const uniqueSectors = new Set();
                    const uniqueDays = new Set();
                    const originCities = new Set();
                    const destinationCities = new Set();

                    rows.forEach(row => {
                        if (row.style.display === 'none') return;

                        if (row.classList.contains('airline') && !row.classList.contains('group_name')) {
                            const classList = Array.from(row.classList);
                            const airlineClass = classList.find(cls => cls !== 'airline' && cls !== 'group_name');
                            if (airlineClass) {
                                const formattedAirline = airlineClass.replace(/-/g, ' ').toUpperCase();
                                uniqueAirlines.add(formattedAirline);
                            }

                            const sector = row.querySelector('h4')?.textContent.trim();
                            if (sector) {
                                uniqueSectors.add(sector); // Sectors & Below lines are for cities

                                const cities = sector.split('-').slice(0, 2);
                                originCities.add(cities[0]);
                                destinationCities.add(cities[1]);
                            }
                        }

                        const daysSpan = row.querySelector('span[id^="days-span-"]');
                        if (daysSpan) {
                            const match = daysSpan.textContent.trim().match(/(\d+)/);
                            if (match) {
                                uniqueDays.add(parseInt(match[1], 10));
                            }
                        }
                    });

                    if (skipType !== 'airline') {
                        uniqueAirlines.forEach(airline => {
                            createFilterButton(airlineFilterDiv, `airline-${airline}`, airline, 'airline');
                        });
                    }
                    if (skipType !== 'sector') {
                        uniqueSectors.forEach(sector => {
                            createFilterButton(sectorFilterDiv, `sector-${sector}`, sector, 'sector');
                        });
                    }
                    if (skipType !== 'day') {
                        Array.from(uniqueDays).sort((a, b) => a - b).forEach(day => {
                            createFilterButton(dayFilterDiv, `day-${day}`, `${day} Days`, 'day');
                        });
                        createFilterButton(dayFilterDiv, 'clear-filters', 'Clear Filters', 'clear');
                    }
                    if (skipType !== 'city') {
                        originCities.forEach(city => {
                            createFilterButton(cityFilterDiv, `city-${city}`, city, 'city');
                        });
                        destinationCities.forEach(city => {
                            if (!originCities.has(city)) {
                                createFilterButton(cityFilterDiv, `city-${city}`, city, 'city');
                            }
                        });
                    }

                    restoreCheckedStates(checked);
                }

                function createFilterButton(parent, id, label, type) {
                    const input = document.createElement('input');
                    input.type = type === 'clear' ? 'button' : 'checkBox';
                    input.className = 'btn-check top-filter-btn';
                    input.name = `btncheckBox-${type}`;
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
                            applyCombinedFilter(null);
                        });
                    } else {
                        input.addEventListener('click', () => applyCombinedFilter(type));
                    }
                }

                function applyCombinedFilter(triggeredByType) {
                    const selectedAirlineBtns = document.querySelectorAll('input[name="btncheckBox-airline"]:checked');
                    const selectedSectorBtns = document.querySelectorAll('input[name="btncheckBox-sector"]:checked');
                    const selectedDayBtns = document.querySelectorAll('input[name="btncheckBox-day"]:checked');
                    const selectedCityBtns = document.querySelectorAll('input[name="btncheckBox-city"]:checked');

                    const selectedAirlines = Array.from(selectedAirlineBtns).map(input => input.id.replace('airline-', '').toLowerCase().replace(/\s+/g, '-'));
                    const selectedSectors = Array.from(selectedSectorBtns).map(input => input.id.replace('sector-', ''));
                    const selectedDays = Array.from(selectedDayBtns).map(input => parseInt(input.id.replace('day-', ''), 10));
                    const selectedCities = Array.from(selectedCityBtns).map(input => input.id.replace('city-', ''));

                    const allRows = document.querySelectorAll('table tbody tr');
                    const airlineHeaderRows = document.querySelectorAll('table tr.airline');
                    const titleRow = document.querySelector('tr.bg-dark-4');

                    allRows.forEach(row => {
                        if (row === titleRow) {
                            row.style.display = '';
                            return;
                        }

                        const rowClass = row.className;
                        const airlineMatch = selectedAirlines.length === 0 || selectedAirlines.some(airline => rowClass.includes(airline));
                        const sectorMatch = selectedSectors.length === 0 || selectedSectors.some(sector => {
                            return Array.from(row.classList).some(cls => cls.includes(sector));
                        });

                        const daysSpan = row.querySelector('span[id^="days-span-"]');
                        let dayMatch = true;
                        if (selectedDays.length > 0) {
                            dayMatch = false;
                            if (daysSpan) {
                                const match = daysSpan.textContent.trim().match(/(\d+)/);
                                if (match) {
                                    const dayVal = parseInt(match[1], 10);
                                    if (selectedDays.includes(dayVal)) {
                                        dayMatch = true;
                                    }
                                }
                            }
                        }

                        let cityMatch = true;
                        if (selectedCities.length > 0) {
                            cityMatch = selectedCities.some(city => Array.from(row.classList).some(cls => cls.includes(city)));
                        }

                        const shouldShow = airlineMatch && sectorMatch && dayMatch && cityMatch;
                        row.style.display = shouldShow ? '' : 'none';
                    });

                    airlineHeaderRows.forEach(header => {
                        const dataAirline = header.getAttribute('data-airline');
                        if (!dataAirline) return;
                        const relatedRows = Array.from(document.querySelectorAll(`tr.${dataAirline}`));
                        const anyVisible = relatedRows.some(r => r.style.display !== 'none');
                        header.style.display = anyVisible ? '' : 'none';
                    });

                    // ✅ New function call to highlight buttons instead of regenerating
                    highlightButtonsFromVisibleRows();
                }

                function highlightButtonsFromVisibleRows() {
                    // If no filters are checked, reset all to normal and exit
                    const anyChecked = document.querySelectorAll('input.top-filter-btn[type="checkbox"]:checked').length > 0;
                    if (!anyChecked) {
                        document.querySelectorAll('.top-filter-btn').forEach(input => {
                            const label = document.querySelector(`label[for="${input.id}"]`);
                            if (label) label.style.fontWeight = 'normal';
                        });
                        return; // exit early
                    }

                    // Reset all to normal
                    document.querySelectorAll('.top-filter-btn').forEach(input => {
                        const label = document.querySelector(`label[for="${input.id}"]`);
                        if (label) label.style.fontWeight = 'normal';
                    });

                    const visibleRows = Array.from(document.querySelectorAll('table tbody tr')).filter(row => row.style.display !== 'none');

                    const seen = {
                        airline: new Set(),
                        sector: new Set(),
                        day: new Set(),
                        city: new Set()
                    };

                    visibleRows.forEach(row => {
                        if (row.classList.contains('airline') && !row.classList.contains('group_name')) {
                            // airline
                            const classList = Array.from(row.classList);
                            const airlineClass = classList.find(cls => cls !== 'airline' && cls !== 'group_name');
                            if (airlineClass) {
                                seen.airline.add(`airline-${airlineClass.replace(/-/g, ' ').toUpperCase()}`);
                            }

                            // sector
                            const sector = row.querySelector('h4')?.textContent.trim();
                            if (sector) seen.sector.add(`sector-${sector}`);

                            // cities
                            const parts = sector?.split('-') || [];
                            parts.forEach(city => seen.city.add(`city-${city}`));
                        }

                        const daysSpan = row.querySelector('span[id^="days-span-"]');
                        if (daysSpan) {
                            const match = daysSpan.textContent.trim().match(/(\d+)/);
                            if (match) seen.day.add(`day-${match[1]}`);
                        }
                    });

                    // Make visible ones bold
                    for (const type in seen) {
                        seen[type].forEach(id => {
                            const label = document.querySelector(`label[for="${id}"]`);
                            if (label) label.style.fontWeight = 'bold';
                        });
                    }
                }

                function clearAllFilters() {
                    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
                    checkboxes.forEach(checkbox => { checkbox.checked = false; });
                }
            });
        })();
    });
})();
