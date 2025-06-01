import actionNames from '../action-names';
import {State} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import {applyStateUpdate} from '../utils';

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.INIT_STATIC_REPORT: {
            const {stats} = action.payload;
            const {perBrowser, ...restStats} = stats || {};

            return applyStateUpdate(state, {
                stats: {
                    all: restStats,
                    perBrowser
                }
            });
        }

        default:
            return state;
    }
};
