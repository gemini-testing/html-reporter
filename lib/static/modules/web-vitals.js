import {getCLS, getFID, getFCP, getLCP, getTTFB} from 'web-vitals';

export const measurePerformance = onPerfEntry => {
    if (onPerfEntry && onPerfEntry instanceof Function) {
        getCLS(onPerfEntry);
        getFID(onPerfEntry);
        getFCP(onPerfEntry);
        getLCP(onPerfEntry);
        getTTFB(onPerfEntry);
    }
};

export default {measurePerformance};
