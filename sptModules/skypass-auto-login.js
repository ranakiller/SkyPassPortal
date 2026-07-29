// Feature module: fills and submits the Skypass login form using credentials
// saved in the popup's Login tab.
//
// Replaces the original userscript's auto-login block, which had the email
// and password hardcoded as plaintext literals in the script file itself.
// Here the credentials live in chrome.storage (same mechanism already used
// for the OCR API key), entered once via the popup instead of shipped in
// source - and the feature defaults off until both a credential and the
// toggle are set.
(function () {
    'use strict';

    window.sptGetSettings(function (settings) {
        if (settings.enableAutoLogin && settings.loginEmail && settings.loginPassword) (function () {
            'use strict';

            window.addEventListener('load', function () {
                const emailField = document.querySelector('input[name="email"]');
                const passwordField = document.querySelector('input[name="password"]');

                if (emailField && passwordField) {
                    emailField.value = settings.loginEmail;
                    passwordField.value = settings.loginPassword;

                    const loginButton = document.querySelector('#main_author_form button[type="submit"]');
                    if (loginButton) {
                        loginButton.click();
                    }
                }
            });
        })();
    });
})();
