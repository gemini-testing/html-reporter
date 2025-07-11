import {useLocation} from 'react-router-dom';
import {Page} from '@/static/new-ui/types/store';

function getPageByPathname(pathname: string): Page {
    switch (pathname) {
        case '/visual-checks':
            return Page.visualChecksPage;
        case '/suites':
            return Page.suitesPage;
        default:
            return Page.suitesPage;
    }
}

export const usePage = (): Page => {
    const location = useLocation();

    return getPageByPathname(location.pathname);
};
