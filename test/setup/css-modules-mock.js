// Mock CSS modules by returning class name, e.g. styles['some-class'] resolves to some-class.
// __esModule: false is needed due to the way SWC resolves modules at runtime. Becomes apparent at SWC playground.
export const cssModulesMock = new Proxy({}, {
    get: (target, prop) => {
        if (prop === '__esModule') {
            return false;
        }

        return typeof prop === 'string' ? prop : '';
    }
});
