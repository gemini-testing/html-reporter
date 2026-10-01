require('jsdom-global')(``, {
    url: 'http://localhost',
    pretendToBeVisual: true
});

global.FocusEvent = global.window.FocusEvent;

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
