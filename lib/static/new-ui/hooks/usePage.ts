import {useLocation} from 'react-router-dom';
import {Pages} from '@/static/new-ui/types/store';

function getPageByPathname(pathname: string): Pages {
    switch (pathname) {
        case '/visual-checks':
            return Pages.visualChecksPage;
        case '/suites':
            return Pages.suitesPage;
        default:
            return Pages.suitesPage;
    }
}

export const usePage = (): Pages => {
    const location = useLocation();

    return getPageByPathname(location.pathname);
};
