import {Feature} from '@/constants';
import {useSelector} from 'react-redux';

export const isFeatureAvailable = (feature: Feature): boolean => {
    return Boolean(useSelector(state => state.app.availableFeatures)
        .find(f => f.name === feature.name));
};
