import {handleActiveResults, addGroupItem, sortGroupValues} from '../helpers';

export function groupMeta({group, groupKey, ...restArgs}) {
    const metaKeys = new Set();
    if (groupKey) {
        group.byKey[groupKey] = {};
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

            addGroupItem({group: group.byKey[groupKey], result, value});
        }
    };

    handleActiveResults({...restArgs, resultCb});

    group.allKeys = [...metaKeys].sort();
    if (groupKey) {
        group.byKey[groupKey] = sortGroupValues(group.byKey[groupKey]);
    }
}
