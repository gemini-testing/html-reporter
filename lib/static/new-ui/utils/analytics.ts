import {DataForStaticFile} from '@/server-utils';

declare global {
    interface Window {
        data?: DataForStaticFile
    }
}

export const getAreAnalyticsEnabled = (): boolean => {
    const metrikaConfig = (window.data || {}).config?.yandexMetrika;

    return Boolean(metrikaConfig?.enabled && metrikaConfig?.counterNumber);
};

export const getCounterId = (): number => {
    const metrikaConfig = (window.data || {}).config?.yandexMetrika;

    return metrikaConfig?.counterNumber ?? 0;
};
