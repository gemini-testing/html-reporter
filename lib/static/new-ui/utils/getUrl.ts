import {Page} from '@/static/new-ui/types/store';

const getPathnameByPage = (page: Page): string => {
    if (page === Page.visualChecksPage) {
        return 'visual-checks';
    }

    if (page === Page.suitesPage) {
        return 'suites';
    }

    return 'suites';
};

export type GetUrlParams = {
    page: Page
    suiteId?: string | null;
    attempt?: number | string | null;
    stateName?: string | null;
};

export const getUrl = (params: GetUrlParams): string => (
    '/' + [
        getPathnameByPage(params.page),
        params.suiteId as string,
        params.attempt?.toString() as string,
        params.stateName as string
    ].filter(Boolean).map(encodeURIComponent).join('/')
);
