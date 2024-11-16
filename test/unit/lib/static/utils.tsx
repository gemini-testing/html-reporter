import {ThemeProvider} from '@gravity-ui/uikit';
import {render, RenderResult} from '@testing-library/react';
import React, {ReactNode} from 'react';
import _ from 'lodash';
import configureStore, {MockStore} from 'redux-mock-store';
import {Provider} from 'react-redux';
import {applyMiddleware, createStore, Middleware, Store} from 'redux';
import thunk from 'redux-thunk';

import defaultState from '@/static/modules/default-state';
import {TestStatus} from '@/constants';
import reducer from '@/static/modules/reducers';
import localStorage from '@/static/modules/middlewares/local-storage';
import {BrowserEntity, ImageEntityFail, State, SuiteEntity, TreeEntity} from '@/static/new-ui/types/store';
import {UNCHECKED} from '@/constants/checked-statuses';

export const mkState = ({initialState}: { initialState: Partial<State> }): State => {
    return _.defaultsDeep(initialState ?? {}, defaultState);
};

export const mkRealStore = ({initialState, middlewares = []}: {initialState: State, middlewares: Middleware[]}): Store => {
    return createStore(reducer, exports.mkState({initialState}), applyMiddleware(thunk, localStorage, ...middlewares));
};

interface GenerateBrowserIdData {
    suiteName: string;
    browserName: string;
}

export const generateBrowserId = ({suiteName, browserName}: GenerateBrowserIdData): string =>
    `${suiteName} ${browserName}`;

interface GenerateResultIdData {
    suiteName: string;
    browserName: string;
    attempt: 0;
}

export const generateResultId = ({suiteName, browserName, attempt}: GenerateResultIdData): string =>
    `${generateBrowserId({suiteName, browserName})} ${attempt}`;

interface GenerateImageIdData {
    suiteName: string;
    browserName: string;
    attempt: 0;
    stateName: string;
}

export const generateImageId = ({suiteName, browserName, attempt, stateName}: GenerateImageIdData): string =>
    `${generateResultId({suiteName, browserName, attempt})} ${stateName}`;

export const mkEmptyTree = (): TreeEntity => _.cloneDeep(defaultState.tree);

interface AddSuiteToTreeData {
    tree: TreeEntity;
    suiteName: string;
}

export const addSuiteToTree = ({tree, suiteName}: AddSuiteToTreeData): void => {
    tree.suites.byId[suiteName] = {id: suiteName} as SuiteEntity;
};

interface AddBrowserToTreeData {
    tree: TreeEntity;
    suiteName: string;
    browserName: string;
}

export const addBrowserToTree = ({tree, suiteName, browserName}: AddBrowserToTreeData): void => {
    const fullId = `${suiteName} ${browserName}`;

    tree.browsers.byId[fullId] = {
        id: browserName,
        name: browserName,
        parentId: suiteName,
        resultIds: [],
        imageIds: []
    } as BrowserEntity;
    tree.browsers.stateById[fullId] = {
        shouldBeShown: true,
        checkStatus: UNCHECKED,
        retryIndex: 0,
        isHiddenBecauseOfStatus: false
    };
};

interface AddResultToTreeData {
    tree: TreeEntity;
    suiteName: string;
    browserName: string;
    attempt: number;
    metaInfo: Record<string, string>;
}

export const addResultToTree = ({tree, suiteName, browserName, attempt, metaInfo = {}}: AddResultToTreeData): void => {
    const browserId = `${suiteName} ${browserName}`;
    const fullId = `${browserId} ${attempt}`;

    tree.results.byId[fullId] = {
        id: fullId,
        parentId: browserId,
        attempt,
        imageIds: [],
        metaInfo,
        status: TestStatus.IDLE,
        timestamp: 0,
        suitePath: [],
        name: browserName
    };
    tree.results.stateById[fullId] = {
        matchedSelectedGroup: false
    };

    tree.browsers.byId[browserId].resultIds.push(fullId);
};

interface AddImageToTreeData {
    tree: TreeEntity;
    suiteName: string;
    browserName: string;
    attempt: number;
    stateName: string;
    status: TestStatus;
    expectedImgPath: string;
    actualImgPath: string;
    diffImgPath: string;
}

export const addImageToTree = ({tree, suiteName, browserName, attempt, stateName, status = TestStatus.FAIL, expectedImgPath, actualImgPath, diffImgPath}: AddImageToTreeData): void => {
    const browserId = `${suiteName} ${browserName}`;
    const resultId = `${browserId} ${attempt}`;
    const fullId = `${resultId} ${stateName}`;

    tree.images.byId[fullId] = {
        id: fullId,
        parentId: resultId,
        stateName,
        status: status as TestStatus.FAIL
    } as ImageEntityFail;

    if (expectedImgPath) {
        (tree.images.byId[fullId] as ImageEntityFail).expectedImg = {
            path: expectedImgPath,
            size: {height: 1, width: 2}
        };
    }
    if (actualImgPath) {
        (tree.images.byId[fullId] as ImageEntityFail).actualImg = {
            path: actualImgPath,
            size: {height: 1, width: 2}
        };
    }
    if (diffImgPath) {
        (tree.images.byId[fullId] as ImageEntityFail).diffImg = {
            path: diffImgPath,
            size: {height: 1, width: 2}
        };
    }

    (tree.browsers.byId[browserId] as any).imageIds.push(fullId); // TODO: why is this needed?
    tree.results.byId[resultId].imageIds.push(fullId);
};

export const renderWithStore = (component: ReactNode, store: Store): RenderResult => {
    return render(<ThemeProvider theme='light'><Provider store={store}>{component}</Provider></ThemeProvider>);
};

const mkStore = ({initialState, state}: {initialState?: Partial<State>, state?: State} = {}): MockStore => {
    const readyState = state ? state : exports.mkState({initialState});
    const mockStore = configureStore();

    return mockStore(readyState);
};

export const mkConnectedComponent = (component: ReactNode, state: {initialState: Partial<State>, state?: State}): RenderResult => {
    const store = mkStore(state);
    return render(<ThemeProvider theme='light'><Provider store={store}>{component}</Provider></ThemeProvider>);
};
