// jsdom delegates to the Node globals. Preserve them before jsdom-global
// replaces them with window wrappers, which would otherwise call themselves.
const nodeAtob = global.atob;
const nodeBtoa = global.btoa;

require('jsdom-global')(``, {
    url: 'http://localhost',
    pretendToBeVisual: true
});

global.atob = nodeAtob;
global.btoa = nodeBtoa;

global.window.matchMedia ||= query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
});
