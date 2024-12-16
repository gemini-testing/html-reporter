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
import {
    BrowserEntity, GroupEntity, ImageEntity,
    ImageEntityFail, ImageEntitySuccess, ResultEntity,
    State,
    SuiteEntity,
    SuiteEntityLeaf,
    TreeEntity
} from '@/static/new-ui/types/store';
import {UNCHECKED} from '@/constants/checked-statuses';
import {EntityType, TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';

export const mkState = ({initialState}: { initialState: Partial<State> }): State => {
    return _.defaultsDeep(initialState ?? {}, defaultState);
};

export const mkRealStore = ({initialState, middlewares = []}: {initialState: State, middlewares: Middleware[]}): Store => {
    return createStore(reducer, exports.mkState({initialState}), applyMiddleware(thunk, localStorage, ...middlewares));
};

export const mkGroupEntity = (name: string, overrides?: Partial<GroupEntity>): GroupEntity => (_.merge({
    id: name,
    type: EntityType.Group,
    key: 'group-by-key',
    label: 'Group Label',
    browserIds: [],
    resultIds: []
} satisfies GroupEntity, overrides));

export const mkSuiteEntityLeaf = (name: string, overrides?: Partial<SuiteEntityLeaf>): SuiteEntityLeaf => (_.mergeWith({
    id: name,
    name,
    parentId: null,
    status: TestStatus.SUCCESS,
    suitePath: ['Root Suite', `Suite ${name}`],
    browserIds: []
}, overrides, (_dest, src) => Array.isArray(src) ? src : undefined));

export const mkBrowserEntity = (name: string, overrides?: Partial<BrowserEntity>): BrowserEntity => (_.merge({
    id: name,
    name,
    parentId: '',
    resultIds: [],
    imageIds: []
} satisfies BrowserEntity, overrides));

export const mkResultEntity = (name: string, overrides?: Partial<ResultEntity>): ResultEntity => (_.merge({
    id: name,
    parentId: '',
    attempt: 0,
    imageIds: [],
    status: TestStatus.SUCCESS,
    timestamp: 1,
    metaInfo: {},
    suiteUrl: 'suite-url',
    history: [],
    // error?: TestError;
    suitePath: [],
    /** @note Browser Name/ID, e.g. `chrome-desktop` */
    name: '',
    // skipReason?: string;
    duration: 123
} satisfies ResultEntity, overrides));

export const mkImageEntitySuccess = (name: string, overrides?: Partial<ImageEntitySuccess>): ImageEntitySuccess => (_.merge({
    id: name,
    parentId: '',
    status: TestStatus.SUCCESS,
    stateName: name,
    expectedImg: {path: `${name}-expected`, size: {width: 0, height: 0}},
    refImg: {path: `${name}-ref`, size: {width: 0, height: 0}}
} satisfies ImageEntitySuccess, overrides));

export const mkImageEntityFail = (name: string, overrides?: Partial<ImageEntityFail>): ImageEntityFail => (_.merge({
    id: name,
    parentId: '',
    status: TestStatus.FAIL,
    stateName: name,
    diffClusters: [],
    expectedImg: {path: `${name}-expected`, size: {width: 0, height: 0}},
    refImg: {path: `${name}-ref`, size: {width: 0, height: 0}},
    diffImg: {path: `${name}-diff`, size: {width: 0, height: 0}},
    actualImg: {path: `${name}-actual`, size: {width: 0, height: 0}}
} satisfies ImageEntityFail, overrides));

export const mkTreeNodeData = (name: string, overrides?: Partial<TreeViewItemData>): TreeViewItemData => _.merge({
    id: name,
    entityType: EntityType.Browser,
    entityId: '',
    title: [name],
    status: TestStatus.SUCCESS,
    tags: []
} satisfies TreeViewItemData, overrides);

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

interface AddGroupToTreeData {
    tree: TreeEntity;
    group: GroupEntity;
}

export const addGroupToTree = ({tree, group}: AddGroupToTreeData): void => {
    tree.groups.byId[group.id] = group;
};

interface AddSuiteToTreeData {
    tree: TreeEntity;
    suite: SuiteEntity;
}

export const addSuiteToTree = ({tree, suite}: AddSuiteToTreeData): void => {
    tree.suites.byId[suite.id] = suite;
};

interface AddBrowserToTreeData {
    tree: TreeEntity;
    browser: BrowserEntity;
}

export const addBrowserToTree = ({tree, browser}: AddBrowserToTreeData): void => {
    tree.browsers.byId[browser.id] = browser;
    tree.browsers.stateById[browser.id] = {
        shouldBeShown: true,
        checkStatus: UNCHECKED,
        retryIndex: 0,
        isHiddenBecauseOfStatus: false
    };
};

interface AddResultToTreeData {
    tree: TreeEntity;
    result: ResultEntity;
    // parentId: string;
    // suiteName: string;
    // browserName: string;
    // attempt: number;
    // metaInfo: Record<string, string>;
}

export const addResultToTree = ({tree, result}: AddResultToTreeData): void => {
    // const browserId = `${suiteName} ${browserName}`;
    // const fullId = `${browserId} ${attempt}`;

    tree.results.byId[result.id] = result;
    tree.results.stateById[result.id] = {
        matchedSelectedGroup: false
    };

    tree.browsers.byId[result.parentId].resultIds.push(result.id);
};

interface AddImageToTreeData {
    tree: TreeEntity;
    image: ImageEntity;
}

export const addImageToTree = ({tree, image}: AddImageToTreeData): void => {
    // const browserId = `${suiteName} ${browserName}`;
    // const resultId = `${browserId} ${attempt}`;
    // const fullId = `${resultId} ${stateName}`;

    tree.images.byId[image.id] = image;

    // if (expectedImgPath) {
    //     (tree.images.byId[fullId] as ImageEntityFail).expectedImg = {
    //         path: expectedImgPath,
    //         size: {height: 1, width: 2}
    //     };
    // }
    // if (actualImgPath) {
    //     (tree.images.byId[fullId] as ImageEntityFail).actualImg = {
    //         path: actualImgPath,
    //         size: {height: 1, width: 2}
    //     };
    // }
    // if (diffImgPath) {
    //     (tree.images.byId[fullId] as ImageEntityFail).diffImg = {
    //         path: diffImgPath,
    //         size: {height: 1, width: 2}
    //     };
    // }

    tree.results.byId[image.parentId].imageIds.push(image.id);

    const result = tree.results.byId[image.parentId];
    (tree.browsers.byId[result.parentId] as any).imageIds.push(image.id); // TODO: why is this needed?
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
