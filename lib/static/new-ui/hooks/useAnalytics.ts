import {useContext} from 'react';

import {AnalyticsContext} from '@/static/new-ui/providers/analytics';
import {YandexMetrika} from '@/static/modules/yandex-metrika';
import {NEW_ISSUE_LINK} from '@/constants';

export const useAnalytics = (): YandexMetrika | null => {
    const analytics = useContext(AnalyticsContext);

    if (!analytics) {
        console.warn('Failed to get analytics class instance to send usage info. If you are a user, you can safely ignore this. Feel free to report it to use at ' + NEW_ISSUE_LINK);
    }

    return analytics;
};
