import {State} from '@/static/new-ui/types/store';
import {SomeAction} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';
import {applyStateUpdate} from '@/static/modules/utils';

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
    }

    return state;
};
