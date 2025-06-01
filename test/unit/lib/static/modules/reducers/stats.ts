import reducer from 'lib/static/modules/reducers/stats';
import actionNames from 'lib/static/modules/action-names';
import type {State} from 'lib/static/new-ui/types/store';
import type {InitStaticReportAction} from 'lib/static/modules/actions/lifecycle';

describe('lib/static/modules/reducers/stats', () => {
    describe(`"${actionNames.INIT_STATIC_REPORT}" action`, () => {
        it('should not fail if stats is empty', () => {
            const action = {type: actionNames.INIT_STATIC_REPORT, payload: {stats: null} as InitStaticReportAction['payload']};

            const newState = reducer({} as State, action);

            assert.deepEqual(newState.stats, {all: {}, perBrowser: undefined} as State['stats']);
        });
    });
});
