const originalUrl = new URL(window.location.href);
const staticConfig = window.data?.config;

let uiMode;
try {
    uiMode = JSON.parse(localStorage.getItem('html-reporter:ui-mode'));
} catch { /* */ }

if (!uiMode) {
    try {
        const config = staticConfig || await fetch('/ui-mode').then(response => response.json());
        uiMode = config.uiMode;
    } catch { /* */ }
}

function redirectTo(page) {
    const targetUrl = new URL(page, originalUrl);
    targetUrl.search = originalUrl.search;
    targetUrl.hash = originalUrl.hash;
    window.location.href = targetUrl.href;
}

const isOldUi = /\/old-ui(?:\.html)?$/.test(originalUrl.pathname);

if (uiMode === 'old' && !isOldUi) {
    redirectTo(staticConfig ? 'old-ui.html' : 'old-ui');
} else if (uiMode === 'new' && isOldUi) {
    redirectTo(staticConfig ? 'index.html' : './');
}
