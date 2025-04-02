const proxyquire = require('proxyquire');
const actionNames = require('lib/static/modules/action-names').default;
const defaultState = require('lib/static/modules/default-state').default;
const {ViewMode} = require('lib/constants/view-modes');
const {DiffModes} = require('lib/constants/diff-modes');
const {EXPAND_ERRORS} = require('lib/constants/expand-modes');

describe('lib/static/modules/middlewares/local-storage', () => {
    const sandbox = sinon.sandbox.create();
    let next, localStorageWrapper;

    const mkStore_ = (state = {}) => {
        return {
            getState: sinon.stub().returns(state)
        };
    };

    const mkMiddleware_ = () => {
        return proxyquire('lib/static/modules/middlewares/local-storage', {
            '../local-storage-wrapper': localStorageWrapper
        }).default;
    };

    beforeEach(() => {
        next = sandbox.stub();

        localStorageWrapper = {
            setItem: sandbox.stub(),
            getItem: sandbox.stub()
        };
    });

    afterEach(() => sandbox.restore());

    it('should call next middleware by default', () => {
        const store = mkStore_();
        const action = {type: 'FOO_BAR'};
        const localStorageMw = mkMiddleware_();

        localStorageMw(store)(next)(action);

        assert.calledOnceWith(next, action);
    });

    [
        actionNames.INIT_GUI_REPORT,
        actionNames.INIT_STATIC_REPORT,
        'VIEW_FOO_ACTION'
    ].forEach((type) => {
        describe(`"${type}" action`, () => {
            it('should store view state in local storage for "VIEW" prefix and init report actions', () => {
                const store = mkStore_({view: defaultState.view});
                const action = {type};
                const localStorageMw = mkMiddleware_();

                localStorageMw(store)(next)(action);

                assert.calledOnceWith(localStorageWrapper.setItem, 'view', {
                    expand: EXPAND_ERRORS,
                    strictMatchFilter: false,
                    viewMode: ViewMode.ALL,
                    diffMode: DiffModes.THREE_UP.id
                });
            });
        });
    });
});
