import axios from 'axios';
import {isEmpty} from 'lodash';

import performanceMarks from '@/constants/performance-marks';
import {
    connectToDatabase, Database, DbDetails, DbLoadResult,
    fetchDataFromDatabases,
    getMainDatabaseUrl,
    getSuitesTableRows,
    mergeDatabases
} from '@/db-utils/client';
import * as plugins from '@/static/modules/plugins';
import actionNames from '@/static/modules/action-names';
import {FinalStats, SkipItem, StaticTestsTreeBuilder} from '@/tests-tree-builder/static';
import {Action, AppThunk} from '@/static/modules/actions/types';
import {DataForStaticFile} from '@/server-utils';
import {GetInitResponse} from '@/gui/server';
import {Tree} from '@/tests-tree-builder/base';
import {BrowserItem} from '@/types';
import {createNotificationError} from '@/static/modules/actions/notifications';
import {LocalStorageKey} from '@/constants/local-storage';
import * as localStorageWrapper from '@/static/modules/local-storage-wrapper';
import {updateTimeTravelSettings} from '../../new-ui/utils/api';
import {TimeTravelFeature} from '@/constants';

export type InitGuiReportAction = Action<typeof actionNames.INIT_GUI_REPORT, GetInitResponse & {db: Database; isNewUi?: boolean}>;
const initGuiReport = (payload: InitGuiReportAction['payload']): InitGuiReportAction =>
    ({type: actionNames.INIT_GUI_REPORT, payload});

interface InitGuiReportData {
    isNewUi?: boolean;
}

export const thunkInitGuiReport = ({isNewUi}: InitGuiReportData = {}): AppThunk => {
    return async (dispatch) => {
        performance?.mark?.(performanceMarks.JS_EXEC);
        try {
            const appState = await axios.get<GetInitResponse>('/init');

            if (!appState.data) {
                throw new Error('Could not load app data. The report might be broken. Please check your project settings or try deleting results folder and relaunching UI server.');
            }

            if (appState.data.features.some(f => f.name === TimeTravelFeature.name)) {
                const ttUseRecommendedSettings = Boolean(localStorageWrapper.getItem(LocalStorageKey.TimeTravelUseRecommendedSettings, true));
                await updateTimeTravelSettings({useRecommendedSettings: ttUseRecommendedSettings});
            }

            const mainDatabaseUrl = getMainDatabaseUrl();
            const db = await connectToDatabase(mainDatabaseUrl.href);

            performance?.mark?.(performanceMarks.DBS_LOADED);

            await plugins.loadAll(appState.data.config);

            performance?.mark?.(performanceMarks.PLUGINS_LOADED);

            dispatch(initGuiReport({...appState.data, db, isNewUi}));

            if (appState.data.customGuiError) {
                const {customGuiError} = appState.data;

                dispatch(createNotificationError('initGuiReport', {name: 'CustomGuiError', message: customGuiError?.response.data}));
                delete appState.data.customGuiError;
            }
        } catch (e: unknown) {
            dispatch(createNotificationError('initGuiReport', e as Error));
        }
    };
};

export type InitStaticReportAction = Action<typeof actionNames.INIT_STATIC_REPORT,
    Partial<DataForStaticFile> & {
    db: Database;
    fetchDbDetails: DbDetails[],
    tree: Tree;
    stats: FinalStats | null;
    skips: SkipItem[];
    browsers: BrowserItem[];
    isNewUi?: boolean;
}>;
const initStaticReport = (payload: InitStaticReportAction['payload']): InitStaticReportAction =>
    ({type: actionNames.INIT_STATIC_REPORT, payload});

interface InitStaticReportData {
    isNewUi?: boolean;
}

export const thunkInitStaticReport = ({isNewUi}: InitStaticReportData = {}): AppThunk => {
    return async dispatch => {
        performance?.mark?.(performanceMarks.JS_EXEC);
        const dataFromStaticFile = (window as {data?: DataForStaticFile}).data || {} as Partial<DataForStaticFile>;

        let fetchDbDetails: DbDetails[] = [];
        let db = null;

        try {
            const mainDatabaseUrls = new URL('databaseUrls.json', window.location.href);
            const fetchDbResponses = await fetchDataFromDatabases([mainDatabaseUrls.href], (dbUrl: string, progress: number) => {
                dispatch({
                    type: actionNames.UPDATE_LOADING_PROGRESS,
                    payload: {[dbUrl]: progress}
                });
            }) as DbLoadResult[];

            performance?.mark?.(performanceMarks.DBS_LOADED);

            plugins.preloadAll(dataFromStaticFile.config);

            fetchDbDetails = fetchDbResponses.map(({url, status, data}) => ({url, status, success: !!data}));

            const dataForDbs = fetchDbResponses.map(({data}) => data).filter(data => data);

            db = await mergeDatabases(dataForDbs);

            performance?.mark?.(performanceMarks.DBS_MERGED);
        } catch (e: unknown) {
            dispatch(createNotificationError('thunkInitStaticReport', e as Error));
        }

        await plugins.loadAll(dataFromStaticFile.config);

        performance?.mark?.(performanceMarks.PLUGINS_LOADED);
        const testsTreeBuilder = StaticTestsTreeBuilder.create();

        if (!db || isEmpty(fetchDbDetails)) {
            dispatch(initStaticReport({...dataFromStaticFile, db, fetchDbDetails, tree: testsTreeBuilder.build([]).tree, stats: null, skips: [], browsers: [], isNewUi}));

            return;
        }

        const suitesRows = getSuitesTableRows(db);

        performance?.mark?.(performanceMarks.DB_EXTRACTED_ROWS);

        const {tree, stats, skips, browsers} = testsTreeBuilder.build(suitesRows);

        dispatch(initStaticReport({...dataFromStaticFile, db, fetchDbDetails, tree, stats, skips, browsers, isNewUi}));
    };
};

export type FinGuiReportAction = Action<typeof actionNames.FIN_GUI_REPORT>;
export const finGuiReport = (): FinGuiReportAction => ({type: actionNames.FIN_GUI_REPORT});

export type FinStaticReportAction = Action<typeof actionNames.FIN_STATIC_REPORT>;
export const finStaticReport = (): FinStaticReportAction => ({type: actionNames.FIN_STATIC_REPORT});

export type LifecycleAction =
    | InitGuiReportAction
    | InitStaticReportAction
    | FinGuiReportAction
    | FinStaticReportAction;
