import _ from 'lodash';
import {getSuiteResults} from '../../../selectors/tree';
import {isNodeFailed} from '../../../utils';
import {ensureDiffProperty, getUpdatedProperty} from '../../../utils/state';
import {determineFinalStatus, isErrorStatus, isFailStatus} from '../../../../../common-utils';
import {changeNodeState, getShownCheckedChildCount, shouldNodeBeOpened} from '../helpers';
import {EXPAND_RETRIES} from '../../../../../constants/expand-modes';
import {FAIL} from '../../../../../constants/test-statuses';
import {INDETERMINATE, UNCHECKED} from '../../../../../constants/checked-statuses';

export function initSuitesState(tree, view) {
    changeAllSuitesState(tree, {checkStatus: UNCHECKED});

    if (view.keyToGroupTestsBy) {
        changeAllSuitesState(tree, {shouldBeShown: false});
    } else {
        calcSuitesShowness({tree});
    }

    calcSuitesOpenness({tree, expand: view.expand});
}

export function changeAllSuitesState(tree, state, diff = tree) {
    tree.suites.allIds.forEach((suiteId) => {
        changeSuiteState(tree, suiteId, state, diff);
    });
}

export function changeSuiteState(tree, suiteId, state, diff = tree) {
    ensureDiffProperty(diff, ['suites', 'stateById']);

    changeNodeState(tree.suites.stateById, suiteId, state, diff.suites.stateById);
}

export function updateSuitesStatus(tree, suites) {
    suites.forEach(({id, status}) => {
        if (tree.suites.byId[id].status !== status) {
            tree.suites.byId[id].status = status;
        }
    });
}

export function updateParentsChecked(tree, parentIds, diff = tree) {
    const youngerSuites = [].concat(parentIds)
        .filter(parentId => parentId)
        .map((suiteId) => tree.suites.byId[suiteId]);

    const changeParentSuiteCb = (parentSuite) => {
        const checkStatus = shouldSuiteBeChecked(parentSuite, tree, diff);
        changeSuiteState(tree, parentSuite.id, {checkStatus}, diff);
    };

    youngerSuites.forEach(changeParentSuiteCb);

    calcParentSuitesState(youngerSuites, tree, changeParentSuiteCb);
}

export function getFailedRootSuiteIds(suites) {
    return suites.allRootIds.filter((rootId) => {
        return isNodeFailed(suites.byId[rootId]);
    });
}

export function updateAllSuitesStatus(tree, filteredBrowsers, diff = tree) {
    const childSuitesIds = _(tree.browsers.allIds)
        .map((browserId) => tree.browsers.byId[browserId].parentId)
        .uniq()
        .value();

    return updateParentSuitesStatus(tree, childSuitesIds, filteredBrowsers, diff);
}

export function calcSuitesShowness({tree, suiteIds = [], diff = tree}) {
    const youngestSuites = _.isEmpty(suiteIds)
        ? getYoungestSuites(tree)
        : suiteIds.map((suiteId) => tree.suites.byId[suiteId]);

    youngestSuites.forEach((suite) => {
        const shouldBeShown = suite.browserIds.some((browserId) => {
            return getUpdatedProperty(tree, diff, ['browsers', 'stateById', browserId, 'shouldBeShown']);
        });
        const checkStatus = shouldSuiteBeChecked(suite, tree, diff);

        changeSuiteState(tree, suite.id, {shouldBeShown, checkStatus}, diff);
    });

    const changeParentSuiteCb = (parentSuite) => {
        changeSuiteState(tree, parentSuite.id, {
            shouldBeShown: shouldSuiteBeShown(parentSuite, tree, diff),
            checkStatus: shouldSuiteBeChecked(parentSuite, tree, diff)
        }, diff);
    };

    calcParentSuitesState(youngestSuites, tree, changeParentSuiteCb);
}

export function calcSuitesOpenness({tree, expand, suiteIds = [], diff = tree}) {
    if (expand !== EXPAND_RETRIES) {
        if (_.isEmpty(suiteIds)) {
            suiteIds = tree.suites.allIds;
        }

        suiteIds.forEach((suiteId) => {
            const suite = tree.suites.byId[suiteId];
            const shouldBeOpened = calcSuiteOpenness(suite, expand, tree);

            changeSuiteState(tree, suiteId, {shouldBeOpened}, diff);
        });

        return;
    }

    const youngestSuites = _.isEmpty(suiteIds)
        ? getYoungestSuites(tree)
        : [].concat(suiteIds).map((suiteId) => tree.suites.byId[suiteId]);

    youngestSuites.forEach((suite) => {
        const shouldBeOpened = calcSuiteOpenness(suite, expand, tree);
        changeSuiteState(tree, suite.id, {shouldBeOpened}, diff);
    });

    const changeParentSuiteCb = (parentSuite) => {
        changeSuiteState(tree, parentSuite.id, {shouldBeOpened: shouldSuiteBeOpened(parentSuite, tree, diff)}, diff);
    };

    calcParentSuitesState(youngestSuites, tree, changeParentSuiteCb);
}

export function failSuites(tree, suiteIds, diff = tree) {
    const processingSuiteIds = [].concat(suiteIds);

    diff.suites ||= {};
    diff.suites.byId ||= {};
    diff.suites.byHash ||= {};
    diff.suites.failedRootIds ||= [].concat(tree.suites.failedRootIds);

    while (!_.isEmpty(processingSuiteIds)) {
        const suiteId = processingSuiteIds.pop();
        const suite = tree.suites.byId[suiteId];

        if (isFailStatus(suite.status)) {
            continue;
        }

        _.set(diff, ['suites', 'byId', suiteId, 'status'], FAIL);

        if (!suite.parentId && !diff.suites.failedRootIds.includes(suite.id)) {
            diff.suites.failedRootIds.push(suite.id);
        } else if (suite.parentId) {
            processingSuiteIds.push(suite.parentId);
        }
    }
}

function calcParentSuitesState(youngerSuites, tree, callback) {
    const closestParentSuites = new Set();
    const closestParentSuiteIds = [];

    sortSuitesByNesting([...youngerSuites]).forEach((suite) => {
        if (!suite.parentId) {
            return;
        }

        const parentSuite = tree.suites.byId[suite.parentId];
        const uniqParentSuiteId = parentSuite.suitePath.join('|') + '|';

        if (closestParentSuiteIds.some((parentId) => parentId.startsWith(uniqParentSuiteId))) {
            return;
        }

        closestParentSuites.add(parentSuite);
        closestParentSuiteIds.push(uniqParentSuiteId);
    });

    if (_.isEmpty(closestParentSuites)) {
        return;
    }

    for (const parentSuite of closestParentSuites) {
        callback(parentSuite);
    }

    calcParentSuitesState(closestParentSuites, tree, callback);
}

function sortSuitesByNesting(suites) {
    return suites.sort((a, b) => b.suitePath.length - a.suitePath.length);
}

function getYoungestSuites(tree) {
    return tree.suites.allIds
        .filter((suiteId) => {
            const suite = tree.suites.byId[suiteId];
            return _.isEmpty(suite.suiteIds) && !_.isEmpty(suite.browserIds);
        })
        .map((suiteId) => tree.suites.byId[suiteId]);
}

function calcSuiteOpenness(suite, expand, tree) {
    const errorsCb = () => isNodeFailed(suite);
    const retriesCb = () => {
        const preparedTree = {suites: tree.suites.byId, browsers: tree.browsers.byId, results: tree.results.byId};
        const retries = getSuiteResults(suite, preparedTree, _.initial);

        return retries.some((retry) => isNodeFailed(retry));
    };

    return shouldNodeBeOpened(expand, {errorsCb, retriesCb});
}

function shouldSuiteBeShown(suite, tree, diff) {
    return shouldSuiteBe(suite, tree, 'shouldBeShown', diff);
}

function shouldSuiteBeOpened(suite, tree, diff) {
    return shouldSuiteBe(suite, tree, 'shouldBeOpened', diff);
}

function shouldSuiteBeChecked(suite, tree, diff = tree) {
    const shownChildSuiteCount = (tree.suites.byId[suite.id].suiteIds || []).reduce((count, childSuiteId) => {
        return count + getUpdatedProperty(tree, diff, ['suites', 'stateById', childSuiteId, 'shouldBeShown']);
    }, 0);

    const shownChildBrowserCount = (tree.suites.byId[suite.id].browserIds || []).reduce((count, childBrowserId) => {
        return count + getUpdatedProperty(tree, diff, ['browsers', 'stateById', childBrowserId, 'shouldBeShown']);
    }, 0);

    const childCount = shownChildSuiteCount + shownChildBrowserCount;
    const checkedChildCount = getShownCheckedChildCount(tree, suite.id, diff);

    return Number((checkedChildCount === childCount) || (checkedChildCount && INDETERMINATE));
}

function shouldSuiteBe(suite, tree, field, diff) {
    const someSuiteIs = (suite.suiteIds || []).some(suiteId => {
        return getUpdatedProperty(tree, diff, ['suites', 'stateById', suiteId, field]);
    });

    return someSuiteIs || (suite.browserIds || []).some(browserId => {
        return getUpdatedProperty(tree, diff, ['browsers', 'stateById', browserId, field]);
    });
}

export function updateParentSuitesStatus(tree, suitesIds = [], filteredBrowsers, diff = tree) {
    if (!suitesIds || !suitesIds.length) {
        return;
    }

    diff.suites ||= {};
    diff.suites.failedRootIds ||= [].concat(tree.suites.failedRootIds);

    const suites = suitesIds.map((id) => tree.suites.byId[id]);
    const parentsToUpdate = new Set();

    suites.forEach((s) => {
        const newStatus = getChildSuitesStatus(tree, s, filteredBrowsers, diff);
        if (newStatus === getUpdatedProperty(tree, diff, ['suites', 'byId', s.id, 'status'])) {
            return;
        }

        _.set(diff, ['suites', 'byId', s.id, 'status'], newStatus);

        const parentId = getUpdatedProperty(tree, diff, ['suites', 'byId', s.id, 'parentId']);

        if (parentId) {
            parentsToUpdate.add(parentId);
        } else {
            const isRootStatusFailed = isErrorStatus(newStatus) || isFailStatus(newStatus);
            const isConsideredFailedNow = diff.suites.failedRootIds.includes(s.id);

            if (isRootStatusFailed && !isConsideredFailedNow) {
                diff.suites.failedRootIds.push(s.id);
            } else if (!isRootStatusFailed && isConsideredFailedNow) {
                diff.suites.failedRootIds = diff.suites.failedRootIds.filter(id => id !== s.id);
            }
        }
    });

    updateParentSuitesStatus(tree, Array.from(parentsToUpdate), filteredBrowsers, diff);
}

function getChildSuitesStatus(tree, suite, filteredBrowsers, diff = tree) {
    let childStatuses = [];

    if (suite.suiteIds) {
        childStatuses = suite.suiteIds.map((id) => getUpdatedProperty(tree, diff, ['suites', 'byId', id, 'status']));
    }

    if (suite.browserIds) {
        const suiteBrowsers = suite.browserIds
            .map((id) => tree.browsers.byId[id])
            .filter(({name, version}) => {
                const res = filteredBrowsers.some(({id: filteredName, versions: filteredVersions}) => {
                    return filteredName === name && (filteredVersions.includes(version) || !filteredVersions.length);
                });

                return res;
            });

        const suiteBrowserStatuses = suiteBrowsers.map(({resultIds}) => {
            return getUpdatedProperty(tree, diff, ['results', 'byId', _.last(resultIds), 'status']);
        });
        childStatuses = childStatuses.concat(suiteBrowserStatuses);
    }

    return determineFinalStatus(childStatuses);
}
