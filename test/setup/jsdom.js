require('jsdom-global')(``, {
    url: 'http://localhost',
    pretendToBeVisual: true
});

global.window.matchMedia = query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false
});
