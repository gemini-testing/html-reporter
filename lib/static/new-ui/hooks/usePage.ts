import {useLocation} from 'react-router-dom';
import {Page} from '@/constants';
import {getPageByPathname} from '@/static/new-ui/utils/page';

export const usePage = (): Page => {
    const location = useLocation();

    return getPageByPathname(location.pathname);
};
