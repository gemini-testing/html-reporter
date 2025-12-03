import React, {useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useNavigate} from 'react-router-dom';
import {useToaster} from '@gravity-ui/uikit';
import {TriangleExclamation} from '@gravity-ui/icons';

import {getIsInitialized, getBrowsersList} from '@/static/new-ui/store/selectors';
import {Page} from '@/constants';
import {State} from '@/static/new-ui/types/store';
import {getUrl} from '@/static/new-ui/utils/getUrl';
import {changeTestRetry, changeViewMode, selectBrowsers, setCurrentTreeNode, setStrictMatchFilter, updateNameFilter} from '@/static/modules/actions';
import {getSuitesTreeViewData} from '@/static/new-ui/features/suites/components/SuitesPage/selectors';
import {findTreeNodeByBrowserId, getGroupId} from '@/static/new-ui/features/suites/utils';

interface LegacyUrlParams {
    testNameFilter?: string;
    browser?: string;
    strictMatchFilter?: boolean;
    retryIndex?: number;
}

const LEGACY_URL_PARAMS_TO_REMOVE = ['testNameFilter', 'strictMatchFilter', 'retryIndex', 'expand', 'viewModes'];

const parseLegacyUrlParams = (search: string): LegacyUrlParams => {
    const params = new URLSearchParams(search);
    const result: LegacyUrlParams = {};

    if (params.has('testNameFilter')) {
        result.testNameFilter = params.get('testNameFilter') ?? undefined;
    }

    if (params.has('browser')) {
        result.browser = params.get('browser') ?? undefined;
    }

    if (params.has('strictMatchFilter')) {
        result.strictMatchFilter = params.get('strictMatchFilter') === 'true';
    }

    if (params.has('retryIndex')) {
        const retryIndex = parseInt(params.get('retryIndex') ?? '', 10);
        if (!isNaN(retryIndex)) {
            result.retryIndex = retryIndex;
        }
    }

    return result;
};

const hasLegacyUrlParams = (search: string): boolean => {
    const params = new URLSearchParams(search);
    return LEGACY_URL_PARAMS_TO_REMOVE.some(param => params.has(param));
};

const cleanLegacyUrlParams = (search: string): string => {
    const params = new URLSearchParams(search);
    LEGACY_URL_PARAMS_TO_REMOVE.forEach(param => params.delete(param));
    params.delete('browser');
    return params.toString();
};

/**
 * Hook that handles migration from old UI URL format to new UI URL format.
 *
 * Old format: ?testNameFilter=...&browser=...&strictMatchFilter=true&retryIndex=0&expand=all
 * New format: /#/suites/:hash/:browser/:attempt/:stateName
 *
 * When old format is detected, this hook:
 * 1. Finds the matching test based on testNameFilter and browser
 * 2. Selects that test in the tree
 * 3. Navigates to the new URL format
 * 4. Removes old query parameters from the URL
 */
export const useLegacyUrlMigration = (): void => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const toaster = useToaster();

    const isInitialized = useSelector(getIsInitialized);
    const treeData = useSelector(getSuitesTreeViewData);
    const browsers = useSelector((state: State) => state.tree.browsers.byId);
    const suites = useSelector((state: State) => state.tree.suites.byId);
    const allBrowsersList = useSelector(getBrowsersList);
    const currentViewMode = useSelector((state: State) => state.app[Page.suitesPage].viewMode);

    const migrationAttemptedRef = useRef(false);

    useEffect(() => {
        if (!isInitialized || migrationAttemptedRef.current) {
            return;
        }

        const search = window.location.search;

        if (!hasLegacyUrlParams(search)) {
            return;
        }

        migrationAttemptedRef.current = true;

        const legacyParams = parseLegacyUrlParams(search);

        let matchedBrowserId: string | null = null;

        if (legacyParams.testNameFilter) {
            // TODO: use more explicit ID generation
            matchedBrowserId = browsers[`${legacyParams.testNameFilter} ${legacyParams.browser}`]?.id ?? null;

            if (!matchedBrowserId) {
                toaster.add({
                    name: 'legacy-url-migration-warning',
                    title: 'Test not found',
                    content: `Could not find a test named "${legacyParams.testNameFilter}". Showing all tests instead.`,
                    isClosable: true,
                    autoHiding: 10000,
                    renderIcon: () => <TriangleExclamation className='toaster__icon--error' width={20} height={20} />,
                    className: 'toaster'
                });

                dispatch(selectBrowsers({page: Page.suitesPage, data: allBrowsersList}));
                dispatch(updateNameFilter({page: Page.suitesPage, data: ''}));
                dispatch(setStrictMatchFilter(false));
                dispatch(changeViewMode({page: Page.suitesPage, data: currentViewMode}));
            }
        }

        if (matchedBrowserId) {
            dispatch(selectBrowsers({page: Page.suitesPage, data: allBrowsersList}));
            const browser = browsers[matchedBrowserId];
            const suite = suites[browser.parentId];

            if (suite && browser) {
                const treeNode = findTreeNodeByBrowserId(treeData.tree, matchedBrowserId);

                if (treeNode) {
                    const groupId = getGroupId(treeNode);

                    dispatch(setCurrentTreeNode({
                        browserId: matchedBrowserId,
                        treeNodeId: treeNode.id,
                        groupId
                    }));

                    const retryIndex = legacyParams.retryIndex ?? browser.resultIds.length - 1;
                    const validRetryIndex = Math.max(0, Math.min(retryIndex, browser.resultIds.length - 1));

                    dispatch(changeTestRetry({
                        browserId: matchedBrowserId,
                        retryIndex: validRetryIndex
                    }));

                    const newUrl = getUrl({
                        page: Page.suitesPage,
                        hash: suite.hash,
                        browser: browser.name,
                        attempt: validRetryIndex
                    });

                    navigate(newUrl, {replace: true});

                    dispatch(updateNameFilter({page: Page.suitesPage, data: ''}));
                    dispatch(setStrictMatchFilter(false));
                    // This one's for ensuring "expanded" states of tree nodes are inited
                    dispatch(changeViewMode({page: Page.suitesPage, data: currentViewMode}));
                }
            }
        }

        const cleanedSearch = cleanLegacyUrlParams(search);
        const newSearchString = cleanedSearch ? `?${cleanedSearch}` : '';

        if (newSearchString !== search) {
            const currentUrl = new URL(window.location.href);
            currentUrl.search = newSearchString;
            window.history.replaceState(null, '', currentUrl.toString());
        }
    }, [isInitialized, browsers, suites, treeData, allBrowsersList, currentViewMode, dispatch, navigate, toaster]);
};
