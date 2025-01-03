import {getCLS, getFID, getFCP, getLCP, getTTFB, ReportHandler} from 'web-vitals';

export const measurePerformance = (onReport: ReportHandler): void => {
    getCLS(onReport);
    getFID(onReport);
    getFCP(onReport);
    getLCP(onReport);
    getTTFB(onReport);
};
