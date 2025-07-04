import {useLocation} from 'react-router-dom';
import {Pages} from '@/static/new-ui/types/store';

function getPageByPathname(pathname: string): Pages {
    if (pathname.startsWith('/visual-checks')) {
        return Pages.visualChecksPage;
    }

    if (pathname.startsWith('/suites')) {
        return Pages.suitesPage;
    }

    return Pages.suitesPage;
}

export const usePage = (): Pages => {
    const location = useLocation();

    return getPageByPathname(location.pathname);
};
