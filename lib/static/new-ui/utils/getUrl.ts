import {Page} from '@/constants';
import {getPathnameByPage} from '@/static/new-ui/utils/page';

export type GetUrlParams = {
    page: Page
    hash?: string | null;
    browser?: string | null;
    attempt?: number | string | null;
    stateName?: string | null;
};

export const getUrl = (params: GetUrlParams): string => (
    `${getPathnameByPage(params.page)}/` + [
        params.hash as string,
        params.browser as string,
        params.attempt?.toString() as string,
        params.stateName as string
    ].filter(Boolean).map(encodeURIComponent).join('/')
);
