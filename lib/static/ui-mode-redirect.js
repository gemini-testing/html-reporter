let uiMode;
try {
    uiMode = JSON.parse(localStorage.getItem('html-reporter:ui-mode'));
} catch { /* */ }

function performRedirect(mode) {
    if (mode === 'old' && /\/new-ui(?:\.html)?$/.test(window.location.pathname)) {
        window.location.pathname = window.location.pathname.replace(/\/new-ui(\.html)?$/, (match, ending) => ending ? '/index.html' : '/');
    } else if (mode === 'new' && !/\/new-ui(?:\.html)?$/.test(window.location.pathname)) {
        window.location.pathname = window.location.pathname.replace(/\/(index\.html)?$/, (match, ending) => ending ? '/new-ui.html' : '/new-ui');
    }
}

async function getConfigData() {
    const staticRequest = fetch('data.js')
        .then(r => r.text())
        .then(jsCode => {
            const func = new Function(jsCode + '; return typeof data !== "undefined" ? data : null;');
            const dataFromStaticFile = func();
            return dataFromStaticFile?.config?.uiMode;
        });

    const guiRequest = fetch('/ui-mode')
        .then(r => r.json())
        .then(configData => configData.uiMode);

    return Promise.any([staticRequest, guiRequest]);
}

if (!uiMode) {
    try {
        uiMode = await getConfigData();
    } catch { /* */ }
}

if (typeof uiMode === 'string') {
    performRedirect(uiMode);
}
