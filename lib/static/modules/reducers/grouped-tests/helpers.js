import {isFunction, isString, isObject, isNull, isUndefined, toString} from 'lodash';
import {getFailedSuiteResults} from '../../selectors/tree';
import {shouldShowBrowser} from '../../utils';
import {ViewMode} from '../../../../constants/view-modes';

export function handleActiveResults({tree = {}, viewMode = ViewMode.ALL, filteredBrowsers = [], resultCb}) {
    if (!isFunction(resultCb)) {
        throw new Error(`"resultCb" argument must be a function, but got ${typeof resultCb}`);
    }

    const results = viewMode === ViewMode.FAILED ? getFailedSuiteResults(tree) : Object.values(tree.results.byId);

    for (const result of results) {
        const browser = tree.browsers.byId[result.parentId];
        const browserState = tree.browsers.stateById[result.parentId];

        if (!browserState.shouldBeShown) {
            continue;
        }

        if (!shouldShowBrowser(browser, filteredBrowsers)) {
            continue;
        }

        resultCb(result);
    }
}

export function addGroupItem({group, result, value, patterns = [], diff = group}) {
    const stringifiedValue = stringify(value);
    const {pattern, name} = matchGroupWithPatterns(stringifiedValue, patterns);

    // eslint-disable-next-line no-prototype-builtins
    if ((!group || !group.hasOwnProperty(name)) && !diff.hasOwnProperty(name)) {
        diff[name] = {
            pattern,
            name,
            browserIds: [result.parentId],
            resultIds: [result.id],
            testCount: 1,
            resultCount: 1
        };

        return;
    }

    const groupItem = diff[name];

    if (!groupItem.browserIds.includes(result.parentId)) {
        groupItem.browserIds.push(result.parentId);
        groupItem.testCount++;
    }

    if (!groupItem.resultIds.includes(result.id)) {
        groupItem.resultIds.push(result.id);
        groupItem.resultCount++;
    }
}

export function sortGroupValues(values) {
    return Object.values(values).sort((g1, g2) => g1.testCount > g2.testCount ? -1 : 1);
}

function matchGroupWithPatterns(value, patterns = []) {
    for (const group of patterns) {
        if (value.match(group.regexp)) {
            return group;
        }
    }

    return {name: value, pattern: value};
}

function stringify(value) {
    if (isString(value)) {
        return value;
    }

    if (isObject(value)) {
        return JSON.stringify(value);
    }

    if (isNull(value)) {
        return 'null';
    }

    if (isUndefined(value)) {
        return 'undefined';
    }

    return toString(value);
}
