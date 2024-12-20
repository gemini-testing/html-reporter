import {
    State,
    BrowserEntity,
    ImageEntity,
    ResultEntity,
    SuiteEntity,
    SuiteState,
    BrowserState, GroupEntity, TreeViewMode
} from '@/static/new-ui/types/store';
import {EditScreensFeature, RunTestsFeature} from '@/constants';

export const getToolName = (state: State): string => state.apiValues.toolName;
export const getAllRootSuiteIds = (state: State): string[] => state.tree.suites.allRootIds;
export const getAllRootGroupIds = (state: State): string[] => state.tree.groups.allRootIds;
export const getGroups = (state: State): Record<string, GroupEntity> => state.tree.groups.byId;
export const getSuites = (state: State): Record<string, SuiteEntity> => state.tree.suites.byId;
export const getSuitesState = (state: State): Record<string, SuiteState> => state.tree.suites.stateById;
export const getBrowsers = (state: State): Record<string, BrowserEntity> => state.tree.browsers.byId;
export const getBrowsersState = (state: State): Record<string, BrowserState> => state.tree.browsers.stateById;
export const getAllBrowserIds = (state: State): string[] => state.tree.browsers.allIds;
export const getResults = (state: State): Record<string, ResultEntity> => state.tree.results.byId;
export const getImages = (state: State): Record<string, ImageEntity> => state.tree.images.byId;

export const getIsInitialized = (state: State): boolean => state.app.isInitialized;
export const getIsStaticImageAccepterEnabled = (state: State): boolean => state.staticImageAccepter.enabled;
export const getIsGui = (state: State): boolean => state.gui;
export const getTreeViewMode = (state: State): TreeViewMode => state.ui.suitesPage.treeViewMode;
export const getSortTestsData = (state: State): State['app']['sortTestsData'] => state.app.sortTestsData;

export const getAreCheckboxesNeeded = (state: State): boolean => state.app.availableFeatures.includes(RunTestsFeature) || state.app.availableFeatures.includes(EditScreensFeature);
