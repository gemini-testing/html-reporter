import {difference, isEmpty} from 'lodash';
import axios from 'axios';
import {types as modalTypes} from '@/static/components/modals';
import {AppThunk} from '@/static/modules/actions/types';
import {toggleLoading} from '@/static/modules/actions/loading';
import {closeSections} from '@/static/modules/actions/suites-tree-state';
import {openModal} from '@/static/modules/actions/modals';

export const thunkFindSameDiffs = (selectedImageId: string, openedImageIds: string[], browserName: string): AppThunk => {
    return async (dispatch) => {
        dispatch(toggleLoading({active: true, content: 'Find same diffs...'}));

        const comparedImageIds = openedImageIds.filter((id) => id.includes(browserName) && id !== selectedImageId);
        let equalImagesIds = [];

        try {
            if (!isEmpty(comparedImageIds)) {
                const {data} = await axios.post('/get-find-equal-diffs-data', [selectedImageId].concat(comparedImageIds));

                if (!isEmpty(data)) {
                    equalImagesIds = (await axios.post('/find-equal-diffs', data)).data;
                }
            }

            const closeImagesIds = difference(openedImageIds, ([] as string[]).concat(selectedImageId, equalImagesIds));

            if (!isEmpty(closeImagesIds)) {
                dispatch(closeSections(closeImagesIds));
            }
        } catch (e) {
            console.error('Error while trying to find equal diffs:', e);
        } finally {
            dispatch(toggleLoading({active: false}));
            dispatch(openModal({
                id: modalTypes.FIND_SAME_DIFFS,
                type: modalTypes.FIND_SAME_DIFFS,
                data: {
                    browserId: browserName,
                    equalImages: equalImagesIds.length,
                    comparedImages: comparedImageIds.length
                }
            }));
        }
    };
};
