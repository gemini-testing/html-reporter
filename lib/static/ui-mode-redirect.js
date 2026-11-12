const newUiPathRegex = /\/(?:index\.html|new-ui(?:\.html)?)?$/;
const oldUiPathRegex = /\/old-ui(\.html)?$/;

let uiMode;
try {
    uiMode = JSON.parse(localStorage.getItem('html-reporter:ui-mode'));
} catch { /* */ }

function performRedirect(mode) {
    if (mode === 'old' && newUiPathRegex.test(window.location.pathname)) {
        window.location.pathname = window.location.pathname.replace(newUiPathRegex, match => match.endsWith('.html') ? '/old-ui.html' : '/old-ui');
    } else if (mode === 'new' && oldUiPathRegex.test(window.location.pathname)) {
        window.location.pathname = window.location.pathname.replace(oldUiPathRegex, (_match, ending) => ending ? '/index.html' : '/');
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
