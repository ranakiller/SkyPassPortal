// Shared settings module for Skypass Ticketing Portal Enhancements.
// Loaded first by every content_scripts entry AND by popup.html, so it can be
// injected more than once into the same page/world - guard against redeclaration.
(function () {
    if (window.__SPT_SETTINGS_INSTALLED__) return;
    window.__SPT_SETTINGS_INSTALLED__ = true;

    // Defaults double as the schema passed to chrome.storage.sync.get(), which
    // fills in any key missing from storage - so this is the single source of truth.
    window.SPT_DEFAULT_SETTINGS = {
        // ---- Feature toggles ----
        enableRightClickFix: true,
        enableDaysCalculator: true,
        enableFlightFilters: true,
        enableWhatsappCopyButtons: true,
        enableSeatsCopyButton: true,
        enableConfirmedBookingCopyButton: true,
        enableCancelledOverlayFix: true,
        enableMrzOnCancelledBookings: true,
        enableEditBookingLink: true,
        enableDobDoeFormatting: true,
        enableMrzBulkFill: true,
        enableMaxAdultsFinder: true,
        enableAutoCheckReviewCheckbox: true,
        enablePrintBookingButton: true,
        enableDownloadCsvButton: true,
        enableBookingPrintTitle: true,
        enablePdfDownload: true,
        enableEditBookingButtons: true,
        enableFindSeats: true,
        enableOcrBrowse: true,
        enableVizFallback: true,
        enableAutoLogin: false,
        enableUmrahPackagesCopyButton: true,
        enableUmrahPackagesFilters: true,

        // ---- Editable values (previously hardcoded) ----
        longLayoverThresholdDays: 2,
        mrzNationalityCode: "PAK",
        defaultPassportNumber: "PP1234567",
        adultAgeOffset: 18,
        childAgeOffset: 11,
        infantAgeOffset: 1,
        csvDiscountDefault: 2000,
        csvCharges: 1000,
        csvExchangeRate: 75,
        csvServiceProviderId: "SPT",
        findSeatsMaxAdultsToProbe: 6,
        ocrApiKey: '',
        ocrEngine: 3,
        loginEmail: '',
        loginPassword: '',
        umrahCopyPrefixText: '',
        umrahCopySuffixText: '',
        umrahPriceDriftTolerance: 1000
    };

    // Fetches settings (merged with defaults for any missing keys) and invokes callback(settings).
    window.sptGetSettings = function (callback) {
        chrome.storage.sync.get(window.SPT_DEFAULT_SETTINGS, callback);
    };
})();
