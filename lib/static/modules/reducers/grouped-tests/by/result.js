import {get} from 'lodash';
import {handleActiveResults, addGroupItem, sortGroupValues} from '../helpers';
import {ensureDiffProperty} from '../../../utils/state';
import {ERROR_KEY, RESULT_KEYS} from '../../../../../constants/group-tests';
import {isImageDiffError} from '../../../../../common-utils';

const imageComparisonErrorMessage = 'image comparison failed';

export function groupResult(args) {
    if (args.groupKey === ERROR_KEY) {
        return groupErrors(args);
    }

    throw new Error(`Group key must be one of ${RESULT_KEYS.join(', ')}, but got ${args.groupKey}`);
}

function groupErrors({tree, group, groupKey, errorPatterns = [], diff = group, ...viewArgs}) {
    ensureDiffProperty(diff, ['byKey', groupKey]);

    const resultCb = (result) => {
        const images = result.imageIds.map((imageId) => tree.images.byId[imageId]);
        const errors = extractErrors(result, images);

        for (const errorText of errors) {
            addGroupItem({
                group: group.byKey[groupKey],
                result,
                value: errorText,
                patterns: errorPatterns,
                diff: diff.byKey[groupKey]
            });
        }
    };

    handleActiveResults({tree, ...viewArgs, resultCb});

    diff.byKey[groupKey] = sortGroupValues(diff.byKey[groupKey]);
}

function extractErrors(result, images) {
    const errors = new Set();

    images.forEach(({error, diffImg}) => {
        if (get(error, 'message')) {
            errors.add(error.message);
        }

        if (diffImg) {
            errors.add(imageComparisonErrorMessage);
        }
    });

    const {error} = result;

    if (errors.size > 0 && isImageDiffError(error)) {
        return [...errors];
    }

    if (get(error, 'message')) {
        errors.add(error.message);
    }

    return [...errors];
}
