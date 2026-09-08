import {useSelector} from '@/static/new-ui/modules/react-redux';

export const useIsRunning = (): boolean => useSelector(state => state.running || state.repeatLeft > 0);
