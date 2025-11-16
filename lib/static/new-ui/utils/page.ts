import {Page, PathNames} from '@/constants';

export function getPageByPathname(pathname: string): Page {
    if (pathname.startsWith(PathNames.visualChecks)) {
        return Page.visualChecksPage;
    }

    return Page.suitesPage;
}

export const getPathnameByPage = (page: Page): string => {
    if (page === Page.visualChecksPage) {
        return PathNames.visualChecks;
    }

    return PathNames.suites;
};
