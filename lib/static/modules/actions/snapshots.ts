import type {Action} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';

export type SetSnapshotsPlayerHighlightTimeAction = Action<typeof actionNames.SET_SNAPSHOTS_PLAYER_HIGHLIGHT_TIME, {
    startTime: number;
}>;
export const setCurrentPlayerTime = (payload: SetSnapshotsPlayerHighlightTimeAction['payload']): SetSnapshotsPlayerHighlightTimeAction => ({
    type: actionNames.SET_SNAPSHOTS_PLAYER_HIGHLIGHT_TIME,
    payload
});

export type SnapshotsAction =
    | SetSnapshotsPlayerHighlightTimeAction;
