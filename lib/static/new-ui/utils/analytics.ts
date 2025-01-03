import {DataForStaticFile} from '@/server-utils';

declare global {
    interface Window {
        data?: DataForStaticFile
    }
}

export const getAreAnalyticsEnabled = (): boolean => {
    const metrikaConfig = (window.data || {}).config?.yandexMetrika;
    const areAnalyticsEnabled = metrikaConfig?.enabled && metrikaConfig?.counterNumber;
    const isYaMetrikaAvailable = window.ym && typeof window.ym === 'function';

    return Boolean(areAnalyticsEnabled && isYaMetrikaAvailable);
};

export const getCounterId = (): number => {
    const metrikaConfig = (window.data || {}).config?.yandexMetrika;

    return metrikaConfig?.counterNumber ?? 0;
};
