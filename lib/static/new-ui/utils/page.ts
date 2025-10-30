import {Page, PathNames} from '@/constants';

export function getPageByPathname(pathname: string): Page {
    if (pathname.startsWith(PathNames.visualChecks)) {
        return Page.visualChecksPage;
    }

    if (pathname.startsWith(PathNames.suites)) {
        return Page.suitesPage;
    }

    return Page.suitesPage;
}

export const getPathnameByPage = (page: Page): string => {
    if (page === Page.visualChecksPage) {
        return PathNames.visualChecks;
    }

    if (page === Page.suitesPage) {
        return PathNames.suites;
    }

    return PathNames.suites;
};
