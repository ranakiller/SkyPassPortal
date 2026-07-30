// Shared DOM-waiting helper for Skypass Ticketing Portal Enhancements.
// Loaded first by every content_scripts entry, alongside settings.js/mrz-utils.js/ocr.js.
(function () {
    'use strict';
    if (window.sptWaitForSelector) return; // guard against double-injection

    var pending = []; // { selector, callback }
    var sharedObserver = null;

    function checkPending() {
        for (var i = pending.length - 1; i >= 0; i--) {
            var el = document.querySelector(pending[i].selector);
            if (el) {
                var entry = pending.splice(i, 1)[0];
                entry.callback(el);
            }
        }
        if (pending.length === 0 && sharedObserver) {
            sharedObserver.disconnect();
            sharedObserver = null;
        }
    }

    // Waits for `selector` to exist anywhere in the page, then calls
    // callback(element) exactly once. Checks immediately first (so content
    // that's already rendered fires with zero delay), and only falls back to
    // watching the DOM if it isn't there yet.
    //
    // Every pending wait across every feature module shares ONE MutationObserver
    // instead of each feature running its own - so adding more waiters doesn't
    // multiply the number of observers reacting to every DOM mutation on the
    // page. The observer is created lazily on first use and disconnects itself
    // once nothing is left pending.
    window.sptWaitForSelector = function (selector, callback) {
        var existing = document.querySelector(selector);
        if (existing) {
            callback(existing);
            return;
        }
        pending.push({ selector: selector, callback: callback });
        if (!sharedObserver) {
            sharedObserver = new MutationObserver(checkPending);
            sharedObserver.observe(document.body, { childList: true, subtree: true });
        }
    };
})();
