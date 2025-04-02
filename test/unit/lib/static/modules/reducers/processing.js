const reducer = require('lib/static/modules/reducers/processing').default;
const actionNames = require('lib/static/modules/action-names').default;

describe('lib/static/modules/reducers/processing', () => {
    [
        actionNames.RUN_ALL_TESTS,
        actionNames.RUN_FAILED_TESTS,
        actionNames.RETRY_SUITE,
        actionNames.RETRY_TEST,
        actionNames.PROCESS_BEGIN
    ].forEach((type) => {
        describe(`"${type}" action`, () => {
            it('should set processing flag', () => {
                const action = {type};

                const newState = reducer(undefined, action);

                assert.isTrue(newState.processing);
            });
        });
    });

    [actionNames.TESTS_END, actionNames.PROCESS_END].forEach((type) => {
        describe(`"${type}" action`, () => {
            it('should reset processing flag', () => {
                const action = {type};

                const newState = reducer({processing: true}, action);

                assert.isFalse(newState.processing);
            });
        });
    });
});
