// MV3 service worker.
// Job 1: relay the OCR.space request from content scripts. Doing the fetch
// here (rather than in the content script) keeps it clear of whatever
// CSP/CORS the Skypass page itself sends, and matches the documented request
// shape at https://ocr.space/ocrapi (apikey sent as a header, image as
// base64Image in a multipart body).
// Job 2: generate a pixel-perfect PDF of the current tab via the Chrome
// DevTools Protocol's Page.printToPDF, for the "Download PDF" button on the
// booking-print page. html2canvas/jsPDF (the earlier approach) can't
// correctly render that page's CSS Grid layout - this uses the browser's own
// print engine instead (the same one a manual Ctrl+P uses), so the output is
// guaranteed to match.
const OCR_ENDPOINT = 'https://api.ocr.space/parse/image';

async function handleOcrRequest(message, sendResponse) {
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
}

function debuggerSendCommand(target, method, params) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(target, method, params, (result) => {
            if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
                return;
            }
            resolve(result);
        });
    });
}

async function handleGeneratePdf(message, sender, sendResponse) {
    const tabId = sender.tab && sender.tab.id;
    if (!tabId) {
        sendResponse({ ok: false, error: 'No tab associated with this request.' });
        return;
    }

    const target = { tabId };
    let attached = false;

    try {
        await new Promise((resolve, reject) => {
            chrome.debugger.attach(target, '1.3', () => {
                if (chrome.runtime.lastError) {
                    reject(new Error(chrome.runtime.lastError.message));
                    return;
                }
                resolve();
            });
        });
        attached = true;

        // printBackground is required or the page's colored section
        // backgrounds (the blue header, the orange bar) are silently
        // dropped, same as unchecking "Background graphics" in a normal
        // print dialog. preferCSSPageSize honors this page's own
        // `@page { size: A4; margin: 0; }` rule instead of Chrome's default.
        //
        // Note: Page.printToPDF does NOT reliably evaluate the page's CSS
        // under 'print' media just because Emulation.setEmulatedMedia is set
        // first - that was tried (to make the @media print rule in
        // skypass-pdf-download.js hide the "Download PDF" button during
        // capture) and the button still showed up baked into the PDF
        // regardless. The button is instead hidden by directly setting
        // display:none on itself right before sending this message - see
        // generatePdf() in skypass-pdf-download.js - which doesn't depend on
        // any print-media behavior at all.
        const result = await debuggerSendCommand(target, 'Page.printToPDF', {
            printBackground: true,
            preferCSSPageSize: true
        });

        chrome.downloads.download({
            url: 'data:application/pdf;base64,' + result.data,
            filename: message.filename || 'booking.pdf',
            saveAs: false
        }, (downloadId) => {
            if (chrome.runtime.lastError || downloadId === undefined) {
                sendResponse({ ok: false, error: (chrome.runtime.lastError && chrome.runtime.lastError.message) || 'Download failed to start.' });
            } else {
                sendResponse({ ok: true });
            }
        });
    } catch (err) {
        sendResponse({ ok: false, error: err && err.message ? err.message : String(err) });
    } finally {
        if (attached) {
            chrome.debugger.detach(target, () => { void chrome.runtime.lastError; });
        }
    }
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (!message) return false;

    if (message.type === 'SPT_OCR_REQUEST') {
        handleOcrRequest(message, sendResponse);
        return true; // keep the message channel open for the async sendResponse above
    }

    if (message.type === 'SPT_GENERATE_PDF') {
        handleGeneratePdf(message, sender, sendResponse);
        return true; // keep the message channel open for the async sendResponse above
    }

    return false;
});
