// Popup settings UI for Skypass Ticketing Portal Enhancements.
// Reads/writes the same chrome.storage.sync keys the content scripts read via
// window.sptGetSettings (see utils/settings.js, loaded before this file).

(function () {
    'use strict';

    // Google Material Symbols (outlined, 24px grid), used verbatim - fetched
    // and visually verified against m3.material.io / the official
    // google/material-design-icons repo rather than approximated.
    const ICONS = {
        mouse: 'M480-80q-116 0-198-82t-82-198v-240q0-116 82-198t198-82q116 0 198 82t82 198v240q0 116-82 198T480-80Zm40-520h160q0-72-45.5-127T520-796v196Zm-240 0h160v-196q-69 14-114.5 69T280-600Zm200 440q83 0 141.5-58.5T680-360v-160H280v160q0 83 58.5 141.5T480-160Zm0-360Zm40-80Zm-80 0Zm40 80Z',
        settings: 'm370-80-16-128q-13-5-24.5-12T307-235l-119 50L78-375l103-78q-1-7-1-13.5v-27q0-6.5 1-13.5L78-585l110-190 119 50q11-8 23-15t24-12l16-128h220l16 128q13 5 24.5 12t22.5 15l119-50 110 190-103 78q1 7 1 13.5v27q0 6.5-2 13.5l103 78-110 190-118-50q-11 8-23 15t-24 12L590-80H370Zm70-80h79l14-106q31-8 57.5-23.5T639-327l99 41 39-68-86-65q5-14 7-29.5t2-31.5q0-16-2-31.5t-7-29.5l86-65-39-68-99 42q-22-23-48.5-38.5T533-694l-13-106h-79l-14 106q-31 8-57.5 23.5T321-633l-99-41-39 68 86 64q-5 15-7 30t-2 32q0 16 2 31t7 30l-86 65 39 68 99-42q22 23 48.5 38.5T427-266l13 106Zm42-180q58 0 99-41t41-99q0-58-41-99t-99-41q-59 0-99.5 41T342-480q0 58 40.5 99t99.5 41Zm-2-140Z',
        search: 'M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z',
        receipt_long: 'M240-80q-50 0-85-35t-35-85v-120h120v-560l60 60 60-60 60 60 60-60 60 60 60-60 60 60 60-60 60 60v680q0 50-35 85t-85 35H240Zm480-80q17 0 28.5-11.5T760-200v-560H320v440h360v120q0 17 11.5 28.5T720-160ZM360-600v-80h240v80H360Zm0 120v-80h240v80H360Zm320-120q-17 0-28.5-11.5T640-640q0-17 11.5-28.5T680-680q17 0 28.5 11.5T720-640q0 17-11.5 28.5T680-600Zm0 120q-17 0-28.5-11.5T640-520q0-17 11.5-28.5T680-560q17 0 28.5 11.5T720-520q0 17-11.5 28.5T680-480ZM240-160h360v-80H200v40q0 17 11.5 28.5T240-160Zm-40 0v-80 80Z',
        edit_note: 'M160-400v-80h280v80H160Zm0-160v-80h440v80H160Zm0-160v-80h440v80H160Zm360 560v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q8 9 12.5 20t4.5 22q0 11-4 22.5T863-380L643-160H520Zm300-263-37-37 37 37ZM580-220h38l121-122-18-19-19-18-122 121v38Zm141-141-19-18 37 37-18-19Z',
        calendar_month: 'M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Zm280 240q-17 0-28.5-11.5T440-440q0-17 11.5-28.5T480-480q17 0 28.5 11.5T520-440q0 17-11.5 28.5T480-400Zm-160 0q-17 0-28.5-11.5T280-440q0-17 11.5-28.5T320-480q17 0 28.5 11.5T360-440q0 17-11.5 28.5T320-400Zm320 0q-17 0-28.5-11.5T600-440q0-17 11.5-28.5T640-480q17 0 28.5 11.5T680-440q0 17-11.5 28.5T640-400ZM480-240q-17 0-28.5-11.5T440-280q0-17 11.5-28.5T480-320q17 0 28.5 11.5T520-280q0 17-11.5 28.5T480-240Zm-160 0q-17 0-28.5-11.5T280-280q0-17 11.5-28.5T320-320q17 0 28.5 11.5T360-280q0 17-11.5 28.5T320-240Zm320 0q-17 0-28.5-11.5T600-280q0-17 11.5-28.5T640-320q17 0 28.5 11.5T680-280q0 17-11.5 28.5T640-240Z',
        tune: 'M440-120v-240h80v80h320v80H520v80h-80Zm-320-80v-80h240v80H120Zm160-160v-80H120v-80h160v-80h80v240h-80Zm160-80v-80h400v80H440Zm160-160v-240h80v80h160v80H680v80h-80Zm-480-80v-80h400v80H120Z',
        event_seat: 'M160-120v-240h640v240h-80v-160H240v160h-80Zm20-280q-25 0-42.5-17.5T120-460q0-25 17.5-42.5T180-520q25 0 42.5 17.5T240-460q0 25-17.5 42.5T180-400Zm100 0v-360q0-33 23.5-56.5T360-840h240q33 0 56.5 23.5T680-760v360H280Zm500 0q-25 0-42.5-17.5T720-460q0-25 17.5-42.5T780-520q25 0 42.5 17.5T840-460q0 25-17.5 42.5T780-400Zm-420-80h240v-280H360v280Zm0 0h240-240Z',
        groups: 'M0-240v-63q0-43 44-70t116-27q13 0 25 .5t23 2.5q-14 21-21 44t-7 48v65H0Zm240 0v-65q0-32 17.5-58.5T307-410q32-20 76.5-30t96.5-10q53 0 97.5 10t76.5 30q32 20 49 46.5t17 58.5v65H240Zm540 0v-65q0-26-6.5-49T754-397q11-2 22.5-2.5t23.5-.5q72 0 116 26.5t44 70.5v63H780Zm-455-80h311q-10-20-55.5-35T480-370q-55 0-100.5 15T325-320ZM160-440q-33 0-56.5-23.5T80-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T160-440Zm640 0q-33 0-56.5-23.5T720-520q0-34 23.5-57t56.5-23q34 0 57 23t23 57q0 33-23 56.5T800-440Zm-320-40q-50 0-85-35t-35-85q0-51 35-85.5t85-34.5q51 0 85.5 34.5T600-600q0 50-34.5 85T480-480Zm0-80q17 0 28.5-11.5T520-600q0-17-11.5-28.5T480-640q-17 0-28.5 11.5T440-600q0 17 11.5 28.5T480-560Zm1 240Zm-1-280Z',
        chat: 'M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z',
        content_copy: 'M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z',
        block: 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q54 0 104-17.5t92-50.5L228-676q-33 42-50.5 92T160-480q0 134 93 227t227 93Zm252-124q33-42 50.5-92T800-480q0-134-93-227t-227-93q-54 0-104 17.5T284-732l448 448Z',
        badge: 'M160-80q-33 0-56.5-23.5T80-160v-440q0-33 23.5-56.5T160-680h200v-120q0-33 23.5-56.5T440-880h80q33 0 56.5 23.5T600-800v120h200q33 0 56.5 23.5T880-600v440q0 33-23.5 56.5T800-80H160Zm0-80h640v-440H600q0 33-23.5 56.5T520-520h-80q-33 0-56.5-23.5T360-600H160v440Zm80-80h240v-18q0-17-9.5-31.5T444-312q-20-9-40.5-13.5T360-330q-23 0-43.5 4.5T276-312q-17 8-26.5 22.5T240-258v18Zm320-60h160v-60H560v60Zm-200-60q25 0 42.5-17.5T420-420q0-25-17.5-42.5T360-480q-25 0-42.5 17.5T300-420q0 25 17.5 42.5T360-360Zm200-60h160v-60H560v60ZM440-600h80v-200h-80v200Zm40 220Z',
        link: 'M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z',
        print: 'M640-640v-120H320v120h-80v-200h480v200h-80Zm-480 80h640-640Zm560 100q17 0 28.5-11.5T760-500q0-17-11.5-28.5T720-540q-17 0-28.5 11.5T680-500q0 17 11.5 28.5T720-460Zm-80 260v-160H320v160h320Zm80 80H240v-160H80v-240q0-51 35-85.5t85-34.5h560q51 0 85.5 34.5T880-520v240H720v160Zm80-240v-160q0-17-11.5-28.5T760-560H200q-17 0-28.5 11.5T160-520v160h80v-80h480v80h80Z',
        sell: 'M856-390 570-104q-12 12-27 18t-30 6q-15 0-30-6t-27-18L103-457q-11-11-17-25.5T80-513v-287q0-33 23.5-56.5T160-880h287q16 0 31 6.5t26 17.5l352 353q12 12 17.5 27t5.5 30q0 15-5.5 29.5T856-390ZM513-160l286-286-353-354H160v286l353 354ZM260-640q25 0 42.5-17.5T320-700q0-25-17.5-42.5T260-760q-25 0-42.5 17.5T200-700q0 25 17.5 42.5T260-640Zm220 160Z',
        picture_as_pdf: 'M360-460h40v-80h40q17 0 28.5-11.5T480-580v-40q0-17-11.5-28.5T440-660h-80v200Zm40-120v-40h40v40h-40Zm120 120h80q17 0 28.5-11.5T640-500v-120q0-17-11.5-28.5T600-660h-80v200Zm40-40v-120h40v120h-40Zm120 40h40v-80h40v-40h-40v-40h40v-40h-80v200ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z',
        download: 'M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z',
        swap_horiz: 'M280-160 80-360l200-200 56 57-103 103h287v80H233l103 103-56 57Zm400-240-56-57 103-103H440v-80h287L624-743l56-57 200 200-200 200Z',
        event: 'M580-240q-42 0-71-29t-29-71q0-42 29-71t71-29q42 0 71 29t29 71q0 42-29 71t-71 29ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z',
        check_circle: 'm424-296 282-282-56-56-226 226-114-114-56 56 170 170Zm56 216q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z',
        document_scanner: 'M80-720v-200h200v80H160v120H80Zm720 0v-120H680v-80h200v200h-80ZM80-40v-200h80v120h120v80H80Zm600 0v-80h120v-120h80v200H680ZM280-240h400v-480H280v480Zm0 80q-33 0-56.5-23.5T200-240v-480q0-33 23.5-56.5T280-800h400q33 0 56.5 23.5T760-720v480q0 33-23.5 56.5T680-160H280Zm80-400h240v-80H360v80Zm0 120h240v-80H360v80Zm0 120h240v-80H360v80Zm-80 80v-480 480Z',
        lock: 'M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z'
    };

    function svgIcon(name) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('viewBox', '0 -960 960 960');
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', ICONS[name] || '');
        svg.appendChild(path);
        return svg;
    }

    // Tabs -> optional section captions -> fields. A field is either:
    //   - a toggle bound to a boolean settings key
    //   - a value (number/text) bound to a settings key, optionally dimmed/disabled
    //     while the toggle named in `dependsOn` is off.
    const TABS = [
        {
            id: 'general',
            label: 'General',
            icon: 'settings',
            fields: [
                { key: 'enableRightClickFix', type: 'toggle', icon: 'mouse', label: 'Re-enable right-click', desc: 'Undoes sites that block the context menu.' },
                { key: 'enableDaysCalculator', type: 'toggle', icon: 'calendar_month', label: 'Flight day-gap calculator', desc: 'Flags multi-day layovers/stopovers on flight tables.' },
                { key: 'longLayoverThresholdDays', type: 'number', label: 'Long layover threshold (days)', dependsOn: 'enableDaysCalculator', min: 1, max: 30 }
            ]
        },
        {
            id: 'search',
            label: 'Search',
            icon: 'search',
            fields: [
                { section: 'Book Tickets page' },
                { key: 'enableFlightFilters', type: 'toggle', icon: 'tune', label: 'City / Airline / Sector / Day filters', desc: 'Adds filter buttons above the results table.' },
                { key: 'enableFindSeats', type: 'toggle', icon: 'event_seat', label: 'Find seats on all flights', desc: 'Probes each flight in the background for availability.' },
                { key: 'findSeatsMaxAdultsToProbe', type: 'number', label: 'Max adults to probe', dependsOn: 'enableFindSeats', min: 2, max: 50 },
                { key: 'enableMaxAdultsFinder', type: 'toggle', icon: 'groups', label: 'Max adults finder', desc: 'On a single flight page, finds max bookable seats.' },
                { key: 'enableWhatsappCopyButtons', type: 'toggle', icon: 'chat', label: 'WhatsApp-formatted copy buttons', desc: 'Copy buttons that build WhatsApp-ready flight text.' },
                { key: 'enableSeatsCopyButton', type: 'toggle', icon: 'content_copy', label: 'Copy button on seats page' }
            ]
        },
        {
            id: 'bookings',
            label: 'Bookings',
            icon: 'receipt_long',
            fields: [
                { section: 'View / print / confirmed pages' },
                { key: 'enableConfirmedBookingCopyButton', type: 'toggle', icon: 'content_copy', label: 'Copy flight info button' },
                { key: 'enableCancelledOverlayFix', type: 'toggle', icon: 'block', label: 'Remove cancelled-booking blur overlay' },
                { key: 'enableMrzOnCancelledBookings', type: 'toggle', icon: 'badge', label: 'Generate MRZ on cancelled bookings' },
                { key: 'mrzNationalityCode', type: 'text', label: 'MRZ nationality code', dependsOn: 'enableMrzOnCancelledBookings', maxlength: 3, placeholder: 'PAK' },
                { key: 'enableEditBookingLink', type: 'toggle', icon: 'link', label: 'Edit-booking link on view-booking page' },
                { key: 'enablePrintBookingButton', type: 'toggle', icon: 'print', label: 'Duplicate "Print Booking" button' },
                { key: 'enableBookingPrintTitle', type: 'toggle', icon: 'sell', label: 'Auto page title on booking-print page' },
                { key: 'enablePdfDownload', type: 'toggle', icon: 'picture_as_pdf', label: 'Download booking as PDF', desc: 'Renders the booking-print page to PDF via Chrome\'s own print engine.' },
                { section: 'CSV export' },
                { key: 'enableDownloadCsvButton', type: 'toggle', icon: 'download', label: 'Download CSV button', desc: 'Exports booking info for the eTravel CRM import.' },
                { key: 'csvDiscountDefault', type: 'number', label: 'Default discount', dependsOn: 'enableDownloadCsvButton', min: 0 },
                { key: 'csvCharges', type: 'number', label: 'Charges', dependsOn: 'enableDownloadCsvButton', min: 0 },
                { key: 'csvExchangeRate', type: 'number', label: 'Exchange rate', dependsOn: 'enableDownloadCsvButton', min: 0 },
                { key: 'csvServiceProviderId', type: 'text', label: 'Service Provider ID', dependsOn: 'enableDownloadCsvButton', maxlength: 10 }
            ]
        },
        {
            id: 'edit',
            label: 'Edit',
            icon: 'edit_note',
            fields: [
                { key: 'enableEditBookingButtons', type: 'toggle', icon: 'swap_horiz', label: 'Back / Print / View buttons' },
                { key: 'enableDobDoeFormatting', type: 'toggle', icon: 'event', label: 'Auto-format DOB & passport expiry' },
                { key: 'enableAutoCheckReviewCheckbox', type: 'toggle', icon: 'check_circle', label: 'Auto-check the review checkbox' },
                { section: 'Bulk MRZ' },
                { key: 'enableMrzBulkFill', type: 'toggle', icon: 'badge', label: 'Bulk MRZ paste & autofill', desc: 'Bulk textbox, extraction, and passenger-form autofill.' },
                { key: 'defaultPassportNumber', type: 'text', label: 'Dummy passport number', dependsOn: 'enableMrzBulkFill', maxlength: 15 },
                { key: 'adultAgeOffset', type: 'number', label: 'Default adult age', dependsOn: 'enableMrzBulkFill', min: 0, max: 120 },
                { key: 'childAgeOffset', type: 'number', label: 'Default child age', dependsOn: 'enableMrzBulkFill', min: 0, max: 120 },
                { key: 'infantAgeOffset', type: 'number', label: 'Default infant age', dependsOn: 'enableMrzBulkFill', min: 0, max: 120 },
                { section: 'Passport photo OCR' },
                { key: 'enableOcrBrowse', type: 'toggle', icon: 'document_scanner', label: 'Scan passport photos', desc: 'Replaces the MRZ box in each row with a Browse button that OCRs a passport photo via OCR.space.' },
                { key: 'ocrApiKey', type: 'password', label: 'OCR.space API key', dependsOn: 'enableOcrBrowse', extraWide: true, placeholder: 'Free key at ocr.space/ocrapi' },
                { key: 'ocrEngine', type: 'number', label: 'OCR engine (1-3)', dependsOn: 'enableOcrBrowse', min: 1, max: 3 },
                { key: 'enableVizFallback', type: 'toggle', icon: 'badge', label: 'Fill from printed fields if no MRZ', dependsOn: 'enableOcrBrowse', desc: 'If no MRZ is found, reads whatever of surname/given name/passport no./DOB/expiry/nationality is printed on the page and fills those fields directly - whatever it finds, leaving the rest for you to complete. Marked with an amber warning icon (not a green tick) for manual double-checking.' }
            ]
        },
        {
            id: 'login',
            label: 'Login',
            icon: 'lock',
            fields: [
                { key: 'enableAutoLogin', type: 'toggle', icon: 'lock', label: 'Auto-login to Skypass', desc: 'Fills and submits the Skypass login form automatically using the credentials saved below.' },
                { key: 'loginEmail', type: 'text', label: 'Skypass email', dependsOn: 'enableAutoLogin', extraWide: true, placeholder: 'you@example.com' },
                { key: 'loginPassword', type: 'password', label: 'Skypass password', dependsOn: 'enableAutoLogin', extraWide: true }
            ]
        }
    ];

    const tabsEl = document.getElementById('tabs');
    const panelsEl = document.getElementById('panels');
    const toastEl = document.getElementById('toast');
    const inputsByKey = {};
    const dependents = {}; // toggle key -> [rows that depend on it]

    function makeSwitch(field) {
        const label = document.createElement('label');
        label.className = 'switch';
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.dataset.key = field.key;
        const track = document.createElement('span');
        track.className = 'track';
        const thumb = document.createElement('span');
        thumb.className = 'thumb';
        label.appendChild(input);
        label.appendChild(track);
        label.appendChild(thumb);
        return { wrap: label, input };
    }

    function makeValueInput(field) {
        const input = document.createElement('input');
        input.dataset.key = field.key;
        if (field.type === 'number') {
            input.type = 'number';
            if (field.min !== undefined) input.min = field.min;
            if (field.max !== undefined) input.max = field.max;
        } else {
            input.type = field.type === 'password' ? 'password' : 'text';
            input.className = field.extraWide ? 'wide xwide' : 'wide';
            if (field.maxlength) input.maxLength = field.maxlength;
            if (field.placeholder) input.placeholder = field.placeholder;
        }
        return input;
    }

    function buildField(field) {
        if (field.section) {
            const cap = document.createElement('div');
            cap.className = 'section-label';
            cap.textContent = field.section;
            return cap;
        }

        const row = document.createElement('div');
        row.className = 'field-row' + (field.type !== 'toggle' ? ' value-row' : '');

        if (field.type === 'toggle') {
            const icon = document.createElement('div');
            icon.className = 'field-icon';
            if (field.icon) icon.appendChild(svgIcon(field.icon));
            row.appendChild(icon);
        }

        const text = document.createElement('div');
        text.className = 'field-text';
        const name = document.createElement('span');
        name.className = 'name';
        name.textContent = field.label;
        text.appendChild(name);
        if (field.desc) {
            const desc = document.createElement('span');
            desc.className = 'desc';
            desc.textContent = field.desc;
            text.appendChild(desc);
        }
        row.appendChild(text);

        const control = document.createElement('div');
        control.className = 'field-control';

        let input;
        if (field.type === 'toggle') {
            const sw = makeSwitch(field);
            control.appendChild(sw.wrap);
            input = sw.input;
        } else {
            input = makeValueInput(field);
            control.appendChild(input);
        }
        row.appendChild(control);

        inputsByKey[field.key] = input;

        if (field.dependsOn) {
            (dependents[field.dependsOn] = dependents[field.dependsOn] || []).push({ row, input });
        }

        return row;
    }

    function applyDependency(toggleKey) {
        const rows = dependents[toggleKey];
        if (!rows) return;
        const enabled = inputsByKey[toggleKey].checked;
        rows.forEach(({ row, input }) => {
            row.classList.toggle('is-disabled', !enabled);
            input.disabled = !enabled;
        });
    }

    function buildUI() {
        TABS.forEach((tab, index) => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'tab-btn' + (index === 0 ? ' active' : '');
            btn.dataset.tab = tab.id;

            const indicator = document.createElement('span');
            indicator.className = 'tab-indicator';
            indicator.appendChild(svgIcon(tab.icon));

            const label = document.createElement('span');
            label.className = 'tab-label';
            label.textContent = tab.label;

            btn.appendChild(indicator);
            btn.appendChild(label);
            btn.addEventListener('click', () => selectTab(tab.id));
            tabsEl.appendChild(btn);

            const panel = document.createElement('div');
            panel.className = 'panel' + (index === 0 ? ' active' : '');
            panel.dataset.panel = tab.id;
            tab.fields.forEach(field => panel.appendChild(buildField(field)));
            panelsEl.appendChild(panel);
        });

        Object.keys(dependents).forEach(toggleKey => {
            const toggleInput = inputsByKey[toggleKey];
            if (toggleInput) {
                toggleInput.addEventListener('change', () => applyDependency(toggleKey));
            }
        });
    }

    function selectTab(id) {
        tabsEl.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === id));
        panelsEl.querySelectorAll('.panel').forEach(p => p.classList.toggle('active', p.dataset.panel === id));
        panelsEl.scrollTop = 0;
    }

    function loadValues() {
        window.sptGetSettings(function (settings) {
            Object.keys(inputsByKey).forEach(key => {
                const input = inputsByKey[key];
                const value = settings[key];
                if (input.type === 'checkbox') {
                    input.checked = !!value;
                } else {
                    input.value = value;
                }
            });
            Object.keys(dependents).forEach(applyDependency);
        });
    }

    function collectValues() {
        const values = {};
        Object.keys(inputsByKey).forEach(key => {
            const input = inputsByKey[key];
            if (input.type === 'checkbox') {
                values[key] = input.checked;
            } else if (input.type === 'number') {
                const n = Number(input.value);
                values[key] = Number.isFinite(n) ? n : window.SPT_DEFAULT_SETTINGS[key];
            } else {
                values[key] = input.value.trim() || window.SPT_DEFAULT_SETTINGS[key];
            }
        });
        return values;
    }

    let toastTimer;
    function showToast(msg) {
        clearTimeout(toastTimer);
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
    }

    document.getElementById('save').addEventListener('click', () => {
        chrome.storage.sync.set(collectValues(), () => showToast('✓ Settings saved'));
    });

    document.getElementById('reset').addEventListener('click', () => {
        chrome.storage.sync.set(window.SPT_DEFAULT_SETTINGS, () => {
            loadValues();
            showToast('Reset to defaults');
        });
    });

    buildUI();
    loadValues();
})();
