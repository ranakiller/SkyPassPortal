// MV3 service worker. Only job: relay the OCR.space request from content
// scripts. Doing the fetch here (rather than in the content script) keeps it
// clear of whatever CSP/CORS the Skypass page itself sends, and matches the
// documented request shape at https://ocr.space/ocrapi (apikey sent as a
// header, image as base64Image in a multipart body).
const OCR_ENDPOINT = 'https://api.ocr.space/parse/image';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message || message.type !== 'SPT_OCR_REQUEST') return false;

    (async () => {
        try {
            const form = new FormData();
            form.append('base64Image', message.base64Image);
            form.append('language', 'eng');
            form.append('OCREngine', String(message.engine || 3));
            form.append('isOverlayRequired', 'false');
            form.append('scale', 'true');
            form.append('detectOrientation', 'true');

            const res = await fetch(OCR_ENDPOINT, {
                method: 'POST',
                headers: { apikey: message.apiKey },
                body: form
            });

            if (!res.ok) {
                sendResponse({ ok: false, error: `OCR.space returned HTTP ${res.status}.` });
                return;
            }

            const data = await res.json();

            if (data.IsErroredOnProcessing || !data.ParsedResults || !data.ParsedResults.length) {
                const errText = Array.isArray(data.ErrorMessage)
                    ? data.ErrorMessage.join('; ')
                    : (data.ErrorMessage || 'OCR.space could not process that image.');
                sendResponse({ ok: false, error: errText });
                return;
            }

            sendResponse({ ok: true, text: data.ParsedResults[0].ParsedText || '' });
        } catch (err) {
            sendResponse({ ok: false, error: err && err.message ? err.message : String(err) });
        }
    })();

    return true; // keep the message channel open for the async sendResponse above
});
