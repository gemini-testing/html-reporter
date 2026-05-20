import {useSelector} from 'react-redux';

export const useIsRunning = (): boolean => useSelector(state => state.running || state.repeatLeft > 0);
