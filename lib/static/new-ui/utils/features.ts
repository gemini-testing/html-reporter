import {Feature} from '@/constants';
import {useSelector} from 'react-redux';

export const useIsFeatureAvailable = (feature: Feature): boolean => {
    const availableFeatures = useSelector(state => state.app.availableFeatures);

    return Boolean(availableFeatures?.find(f => f.name === feature.name));
};
