import actionNames from '@/static/modules/action-names';
import {Action} from '@/static/modules/actions/types';
import {DiffModeId, TwoUpFitMode} from '@/constants';

export type VisualChecksPageSetCurrentNamedImageAction = Action<typeof actionNames.VISUAL_CHECKS_PAGE_SET_CURRENT_NAMED_IMAGE, {
    namedImageId: string;
}>;

export const visualChecksPageSetCurrentNamedImage = (namedImageId: string): VisualChecksPageSetCurrentNamedImageAction => {
    return {type: actionNames.VISUAL_CHECKS_PAGE_SET_CURRENT_NAMED_IMAGE, payload: {namedImageId}};
};

export type Toggle2UpDiffVisibilityAction = Action<typeof actionNames.VISUAL_CHECKS_TOGGLE_2UP_DIFF_VISIBILITY, {
    isVisible: boolean;
}>;

export const toggle2UpDiffVisibility = (isVisible: boolean): Toggle2UpDiffVisibilityAction => {
    return {type: actionNames.VISUAL_CHECKS_TOGGLE_2UP_DIFF_VISIBILITY, payload: {isVisible}};
};

export type Set2UpFitModeAction = Action<typeof actionNames.VISUAL_CHECKS_SET_2UP_FIT_MODE, {
    fitMode: TwoUpFitMode;
}>;

export const set2UpFitMode = (fitMode: TwoUpFitMode): Set2UpFitModeAction => {
    return {type: actionNames.VISUAL_CHECKS_SET_2UP_FIT_MODE, payload: {fitMode}};
};

export type SetVisualChecksDiffModeAction = Action<typeof actionNames.VISUAL_CHECKS_SET_DIFF_MODE, {
    diffModeId: DiffModeId;
}>;

export const setVisualChecksDiffMode = (diffModeId: DiffModeId): SetVisualChecksDiffModeAction => {
    return {type: actionNames.VISUAL_CHECKS_SET_DIFF_MODE, payload: {diffModeId}};
};

export type VisualChecksPageAction =
    | VisualChecksPageSetCurrentNamedImageAction
    | Toggle2UpDiffVisibilityAction
    | Set2UpFitModeAction
    | SetVisualChecksDiffModeAction;
