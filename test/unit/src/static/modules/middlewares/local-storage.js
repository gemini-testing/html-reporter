import proxyquire from 'proxyquire';
import actionNames from 'src/static/modules/action-names';
import defaultState from 'src/static/modules/default-state';
import viewModes from 'src/constants/view-modes';
import diffModes from 'src/constants/diff-modes';
import {EXPAND_ERRORS} from 'src/constants/expand-modes';

describe('src/static/modules/middlewares/local-storage', () => {
    const sandbox = sinon.sandbox.create();
    let next, localStorageWrapper;

    const mkStore_ = (state = {}) => {
        return {
            getState: sinon.stub().returns(state)
        };
    };

    const mkMiddleware_ = () => {
        return proxyquire('src/static/modules/middlewares/local-storage', {
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
                    viewMode: viewModes.ALL,
                    diffMode: diffModes.THREE_UP.id
                });
            });
        });
    });
});
