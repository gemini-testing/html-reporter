import actionNames from '../action-names';
import {applyStateUpdate} from '@/static/modules/utils/state';
import {EditScreensFeature, RunTestsFeature} from '@/constants';

export default (state, action) => {
    switch (action.type) {
        case actionNames.INIT_GUI_REPORT: {
            const isCached = Boolean(action.payload.isCached);
            return applyStateUpdate(state, {
                gui: true,
                processing: Boolean(state.running),
                app: {
                    isGuiInitializing: isCached,
                    availableFeatures: isCached ? [RunTestsFeature] : [RunTestsFeature, EditScreensFeature]
                }
            });
        }

        case actionNames.QUEUE_TEST_RUN: {
            return applyStateUpdate(state, {running: true, processing: true, app: {queuedTestRun: action.payload}});
        }

        case actionNames.CLEAR_QUEUED_TEST_RUN: {
            return applyStateUpdate(state, {running: false, processing: false, stopping: false, app: {queuedTestRun: null}});
        }

        case actionNames.INIT_STATIC_REPORT: {
            return {...state, gui: false};
        }

        default:
            return state;
    }
};
