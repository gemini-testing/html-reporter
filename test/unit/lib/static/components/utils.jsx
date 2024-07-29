import {ThemeProvider} from '@gravity-ui/uikit';
import {render} from '@testing-library/react';
import React from 'react';
import _ from 'lodash';
import configureStore from 'redux-mock-store';
import {Provider} from 'react-redux';
import defaultState from 'lib/static/modules/default-state';
import {TestStatus} from 'lib/constants';
import {applyMiddleware, createStore} from 'redux';
import thunk from 'redux-thunk';
import reducer from 'lib/static/modules/reducers';
import localStorage from 'lib/static/modules/middlewares/local-storage';

exports.mkState = ({initialState} = {}) => {
    return _.defaultsDeep(initialState, defaultState);
};

exports.mkStore = ({initialState, state} = {}) => {
    const readyState = state ? state : exports.mkState({initialState});
    const mockStore = configureStore();

    return mockStore(readyState);
};

exports.mkRealStore = ({initialState, middlewares = []}) => {
    return createStore(reducer, exports.mkState({initialState}), applyMiddleware(thunk, localStorage, ...middlewares));
};

exports.generateBrowserId = ({suiteName, browserName}) =>
    `${suiteName} ${browserName}`;

exports.generateResultId = ({suiteName, browserName, attempt}) =>
    `${exports.generateBrowserId({suiteName, browserName})} ${attempt}`;

exports.generateImageId = ({suiteName, browserName, attempt, stateName}) =>
    `${exports.generateResultId({suiteName, browserName, attempt})} ${stateName}`;

exports.mkEmptyTree = () => _.cloneDeep(defaultState.tree);

exports.addSuiteToTree = ({tree, suiteName}) => {
    tree.suites.byId[suiteName] = {id: suiteName};
};

exports.addBrowserToTree = ({tree, suiteName, browserName}) => {
    const fullId = `${suiteName} ${browserName}`;

    tree.browsers.byId[fullId] = {
        id: browserName,
        name: browserName,
        parentId: suiteName,
        resultIds: [],
        imageIds: []
    };
    tree.browsers.stateById[fullId] = {shouldBeShown: true};
};

exports.addResultToTree = ({tree, suiteName, browserName, attempt, metaInfo = {}}) => {
    const browserId = `${suiteName} ${browserName}`;
    const fullId = `${browserId} ${attempt}`;

    tree.results.byId[fullId] = {
        id: fullId,
        parentId: browserId,
        attempt,
        imageIds: [],
        metaInfo
    };
    tree.results.stateById[fullId] = {};

    tree.browsers.byId[browserId].resultIds.push(fullId);
};

exports.addImageToTree = ({tree, suiteName, browserName, attempt, stateName, status = TestStatus.FAIL, expectedImgPath, actualImgPath, diffImgPath}) => {
    const browserId = `${suiteName} ${browserName}`;
    const resultId = `${browserId} ${attempt}`;
    const fullId = `${resultId} ${stateName}`;

    tree.images.byId[fullId] = {
        id: fullId,
        parentId: resultId,
        stateName,
        status
    };

    if (expectedImgPath) {
        tree.images.byId[fullId].expectedImg = {
            path: expectedImgPath,
            size: {height: 1, width: 2}
        };
    }
    if (actualImgPath) {
        tree.images.byId[fullId].actualImg = {
            path: actualImgPath,
            size: {height: 1, width: 2}
        };
    }
    if (diffImgPath) {
        tree.images.byId[fullId].diffImg = {
            path: diffImgPath,
            size: {height: 1, width: 2}
        };
    }

    tree.browsers.byId[browserId].imageIds.push(fullId);
    tree.results.byId[resultId].imageIds.push(fullId);
};

exports.renderWithStore = (component, store) => {
    return render(<ThemeProvider theme='light'><Provider store={store}>{component}</Provider></ThemeProvider>);
};

exports.mkConnectedComponent = (Component, state) => {
    const store = exports.mkStore(state);
    return render(<ThemeProvider theme='light'><Provider store={store}>{Component}</Provider></ThemeProvider>);
};

exports.mkImg_ = (opts = {}) => {
    return _.defaultsDeep(opts, {
        path: 'default/path',
        size: {width: 100500, height: 500100}
    });
};

exports.mkTestResult_ = (result) => {
    return _.defaults(result, {
        suiteUrl: '',
        metaInfo: {},
        imagesInfo: [],
        expectedImg: exports.mkImg_()
    });
};

exports.mkSuite_ = (suite) => {
    return _.defaults(suite, {
        name: 'default-suite',
        suitePath: ['default-suite']
    });
};
