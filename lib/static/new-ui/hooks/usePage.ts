import {useLocation} from 'react-router-dom';
import {Page} from '@/static/new-ui/types/store';

function getPageByPathname(pathname: string): Page {
    if (pathname.startsWith('/visual-checks')) {
        return Page.visualChecksPage;
    }

    if (pathname.startsWith('/suites')) {
        return Page.suitesPage;
    }

    return Page.suitesPage;
}

export const usePage = (): Page => {
    const location = useLocation();

    return getPageByPathname(location.pathname);
};
