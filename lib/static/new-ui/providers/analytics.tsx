import React, {createContext, ReactNode, useMemo} from 'react';
import {YandexMetrika} from '@/static/modules/yandex-metrika';
import {getAreAnalyticsEnabled, getCounterId} from '@/static/new-ui/utils/analytics';

export const AnalyticsContext = createContext<YandexMetrika | null>(null);

interface AnalyticsProviderProps {
    children: React.ReactNode;
}

export const AnalyticsProvider = ({children}: AnalyticsProviderProps): ReactNode => {
    const areAnalyticsEnabled = getAreAnalyticsEnabled();
    const counterId = getCounterId();
    const analytics = useMemo(() => new YandexMetrika(areAnalyticsEnabled, counterId), []);

    return <AnalyticsContext.Provider value={analytics}>
        {children}
    </AnalyticsContext.Provider>;
};
