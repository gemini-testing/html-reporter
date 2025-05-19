import {State} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils';
import * as localStorageWrapper from '../local-storage-wrapper';
import {TIME_TRAVEL_PLAYER_VISIBILITY_KEY} from '@/constants/local-storage';

export default (state: State, action: SomeAction): State => {
    switch (action.type) {
        case actionNames.SET_SNAPSHOTS_PLAYER_HIGHLIGHT_TIME: {
            return applyStateUpdate(state, {
                app: {
                    snapshotsPlayer: {
                        isActive: action.payload.isActive,
                        highlightStartTime: action.payload.startTime,
                        highlightEndTime: action.payload.endTime
                    }
                }
            });
        }

        case actionNames.SNAPSHOTS_PLAYER_GO_TO_TIME: {
            return applyStateUpdate(state, {
                app: {
                    snapshotsPlayer: {
                        goToTime: action.payload.time
                    }
                }
            });
        }

        case actionNames.SNAPSHOTS_PLAYER_TOGGLE_VISIBILITY: {
            localStorageWrapper.setItem(TIME_TRAVEL_PLAYER_VISIBILITY_KEY, action.payload.isVisible);
            return applyStateUpdate(state, {
                ui: {
                    suitesPage: {
                        isSnapshotsPlayerVisible: action.payload.isVisible
                    }
                }
            });
        }
    }

    return state;
};
