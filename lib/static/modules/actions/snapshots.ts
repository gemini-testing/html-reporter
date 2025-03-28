import type {Action} from '@/static/modules/actions/types';
import actionNames from '@/static/modules/action-names';

export type SetSnapshotsPlayerHighlightTimeAction = Action<typeof actionNames.SET_SNAPSHOTS_PLAYER_HIGHLIGHT_TIME, {
    startTime: number;
    endTime: number;
    isActive: boolean;
}>;
export const setCurrentPlayerHighlightTime = (payload: SetSnapshotsPlayerHighlightTimeAction['payload']): SetSnapshotsPlayerHighlightTimeAction => ({
    type: actionNames.SET_SNAPSHOTS_PLAYER_HIGHLIGHT_TIME,
    payload
});

export type SnapshotsPlayerGoToTimeAction = Action<typeof actionNames.SNAPSHOTS_PLAYER_GO_TO_TIME, {
    time: number;
}>;
export const goToTimeInSnapshotsPlayer = (payload: SnapshotsPlayerGoToTimeAction['payload']): SnapshotsPlayerGoToTimeAction => ({
    type: actionNames.SNAPSHOTS_PLAYER_GO_TO_TIME,
    payload
});

export type SnapshotsAction =
    | SetSnapshotsPlayerHighlightTimeAction
    | SnapshotsPlayerGoToTimeAction;
