import {handleActiveResults, addGroupItem, sortGroupValues} from '../helpers';
import {ensureDiffProperty} from '../../../utils/state';

export function groupMeta({group, groupKey, diff = group, ...restArgs}) {
    const metaKeys = new Set();
    if (groupKey) {
        ensureDiffProperty(diff, ['byKey', groupKey]);
    }

    const resultCb = (result) => {
        if (!result.metaInfo) {
            return;
        }

        for (let [key, value] of Object.entries(result.metaInfo)) {
            metaKeys.add(key);

            if (!groupKey || groupKey !== key) {
                continue;
            }

            addGroupItem({
                group: group.byKey[groupKey],
                result,
                value,
                diff: diff.byKey[groupKey]
            });
        }
    };

    handleActiveResults({...restArgs, resultCb});

    diff.allKeys = [...metaKeys].sort();
    if (groupKey) {
        diff.byKey[groupKey] = sortGroupValues(diff.byKey[groupKey]);
    }
}
