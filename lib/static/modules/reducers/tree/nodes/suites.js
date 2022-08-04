import _ from 'lodash';
import {getSuiteResults} from '../../../selectors/tree';
import {isNodeFailed} from '../../../utils';
import {determineStatus} from '../../../../../common-utils';
import {changeNodeState, shouldNodeBeOpened} from '../helpers';
import {EXPAND_RETRIES} from '../../../../../constants/expand-modes';

export function initSuitesState(tree, view) {
    if (view.keyToGroupTestsBy) {
        changeAllSuitesState(tree, {shouldBeShown: false});
    } else {
        calcSuitesShowness(tree);
    }

    calcSuitesOpenness(tree, view.expand);
}

export function changeAllSuitesState(tree, state) {
    tree.suites.allIds.forEach((suiteId) => {
        changeSuiteState(tree, suiteId, state);
    });
}

export function changeSuiteState(tree, suiteId, state) {
    changeNodeState(tree.suites.stateById, suiteId, state);
}

export function updateSuitesStatus(tree, suites) {
    suites.forEach(({id, status}) => {
        if (tree.suites.byId[id].status !== status) {
            tree.suites.byId[id].status = status;
        }
    });
}

export function getFailedRootSuiteIds(suites) {
    return suites.allRootIds.filter((rootId) => {
        return isNodeFailed(suites.byId[rootId]);
    });
}

export function updateAllSuitesStatus(tree, filteredBrowsers) {
    const childSuitesIds = _(tree.browsers.allIds)
        .map((browserId) => tree.browsers.byId[browserId].parentId)
        .uniq()
        .value();

    return updateParentSuitesStatus(tree, childSuitesIds, filteredBrowsers);
}

export function calcSuitesShowness(tree, suiteIds) {
    const youngestSuites = _.isEmpty(suiteIds)
        ? getYoungestSuites(tree)
        : [].concat(suiteIds).map((suiteId) => tree.suites.byId[suiteId]);

    youngestSuites.forEach((suite) => {
        const shouldBeShown = suite.browserIds
            .some((browserId) => tree.browsers.stateById[browserId].shouldBeShown);

        changeSuiteState(tree, suite.id, {shouldBeShown});
    });

    const changeParentSuiteCb = (parentSuite) => {
        changeSuiteState(tree, parentSuite.id, {shouldBeShown: shouldSuiteBeShown(parentSuite, tree)});
    };

    calcParentSuitesState(youngestSuites, tree, changeParentSuiteCb);
}

export function calcSuitesOpenness(tree, expand, suiteIds) {
    if (expand !== EXPAND_RETRIES) {
        if (_.isEmpty(suiteIds)) {
            suiteIds = tree.suites.allIds;
        }

        [].concat(suiteIds).forEach((suiteId) => {
            const suite = tree.suites.byId[suiteId];
            const shouldBeOpened = calcSuiteOpenness(suite, expand, tree);

            changeSuiteState(tree, suiteId, {shouldBeOpened});
        });

        return;
    }

    const youngestSuites = _.isEmpty(suiteIds)
        ? getYoungestSuites(tree)
        : [].concat(suiteIds).map((suiteId) => tree.suites.byId[suiteId]);

    youngestSuites.forEach((suite) => {
        const shouldBeOpened = calcSuiteOpenness(suite, expand, tree);
        changeSuiteState(tree, suite.id, {shouldBeOpened});
    });

    const changeParentSuiteCb = (parentSuite) => {
        changeSuiteState(tree, parentSuite.id, {shouldBeOpened: shouldSuiteBeOpened(parentSuite, tree)});
    };

    calcParentSuitesState(youngestSuites, tree, changeParentSuiteCb);
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

function shouldSuiteBeShown(suite, tree) {
    return shouldSuiteBe(suite, tree, 'shouldBeShown');
}

function shouldSuiteBeOpened(suite, tree) {
    return shouldSuiteBe(suite, tree, 'shouldBeOpened');
}

function shouldSuiteBe(suite, tree, field) {
    return (suite.suiteIds || []).some((suiteId) => tree.suites.stateById[suiteId][field])
        || (suite.browserIds || []).some((browserId) => tree.browsers.stateById[browserId][field]);
}

function updateParentSuitesStatus(tree, suitesIds = [], filteredBrowsers) {
    if (!suitesIds || !suitesIds.length) {
        return;
    }

    const suites = [].concat(suitesIds).map((id) => tree.suites.byId[id]);
    const parentsToUpdate = new Set();

    suites.forEach((s) => {
        const newStatus = getChildSuitesStatus(tree, s, filteredBrowsers);
        if (newStatus === s.status) {
            return;
        }

        s.status = newStatus;
        if (s.parentId) {
            parentsToUpdate.add(s.parentId);
        }
    });

    updateParentSuitesStatus(tree, Array.from(parentsToUpdate), filteredBrowsers);
}

function getChildSuitesStatus(tree, suite, filteredBrowsers) {
    let childStatuses = [];

    if (suite.suiteIds) {
        childStatuses = suite.suiteIds.map((id) => tree.suites.byId[id].status);
    }

    if (suite.browserIds) {
        const suiteBrowsers = suite.browserIds
            .map((id) => tree.browsers.byId[id])
            .filter(({name, version}) => {
                var res = filteredBrowsers.some(({id: filteredName, versions: filteredVersions}) => {
                    return filteredName === name && (filteredVersions.includes(version) || !filteredVersions.length);
                });

                return res;
            });

        const suiteBrowserStatuses = suiteBrowsers.map(({resultIds}) => tree.results.byId[_.last(resultIds)].status);
        childStatuses = childStatuses.concat(suiteBrowserStatuses);
    }

    return determineStatus(childStatuses);
}
