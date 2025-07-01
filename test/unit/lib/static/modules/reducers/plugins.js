const actionNames = require('lib/static/modules/action-names').default;

const proxyquire = require('proxyquire');

describe('lib/static/modules/reducers/plugins', () => {
    const sandbox = sinon.sandbox.create();
    let reducer;
    let forEachStub;

    beforeEach(() => {
        forEachStub = sandbox.stub();
        reducer = proxyquire('lib/static/modules/reducers/plugins', {
            '../plugins': {forEachPlugin: forEachStub}
        }).default;

        forEachStub.callsFake((callback) => callback({reducers: [
            function(state = {}, action) {
                if (action.type === 'ARBITRARY_ACTION_FROM_UNIT_TEST') {
                    return {...state, arbitraryActions: [...state.arbitraryActions || [], action.type]};
                }

                if (action.type === actionNames.INIT_GUI_REPORT || action.type === actionNames.INIT_STATIC_REPORT) {
                    return {...state, initActions: [...state.initActions || [], action.type]};
                }

                return state;
            }
        ]}, 'some-plugin'));
    });

    afterEach(() => sandbox.restore());

    describe('arbitrary action before INIT-actions', () => {
        it('should return state unchanged', () => {
            const action = {type: 'ARBITRARY_ACTION_FROM_UNIT_TEST'};
            const prevState = {};
            const newState = reducer(prevState, action);

            assert.strictEqual(newState, prevState);
        });
    });

    [actionNames.INIT_GUI_REPORT, actionNames.INIT_STATIC_REPORT].forEach((type) => {
        describe(`arbitrary action after ${type} action`, () => {
            it('should return modified state according to the plugin reducers', () => {
                const initAction = {type};
                const action = {type: 'ARBITRARY_ACTION_FROM_UNIT_TEST'};
                const prevState = {};
                const newState = reducer(reducer(prevState, initAction), action);

                assert.deepStrictEqual(newState, {
                    initActions: [type],
                    arbitraryActions: ['ARBITRARY_ACTION_FROM_UNIT_TEST']
                });
            });
        });
    });
});
