import actionNames from '@/static/modules/action-names';
import {Action} from '@/static/modules/actions/types';

export type VisualChecksPageSetCurrentNamedImageAction = Action<typeof actionNames.VISUAL_CHECKS_PAGE_SET_CURRENT_NAMED_IMAGE, {
    namedImageId: string;
}>;

export const visualChecksPageSetCurrentNamedImage = (namedImageId: string): VisualChecksPageSetCurrentNamedImageAction => {
    return {type: actionNames.VISUAL_CHECKS_PAGE_SET_CURRENT_NAMED_IMAGE, payload: {namedImageId}};
};

export type VisualChecksPageAction =
    | VisualChecksPageSetCurrentNamedImageAction;
