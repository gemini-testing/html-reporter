import {useEffect, useRef} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {State} from '@/static/new-ui/types/store';
import {thunkRunAllTests} from '@/static/modules/actions';

export function AutoRun(): null {
    const dispatch = useDispatch();
    const autoRun = useSelector((state: State) => state.autoRun);
    const isInitialized = useSelector((state: State) => state.app.isInitialized);
    const isAlreadyRun = useRef(false);

    useEffect(() => {
        if (autoRun && isInitialized && !isAlreadyRun.current) {
            isAlreadyRun.current = true;
            dispatch(thunkRunAllTests());
        }
    }, [autoRun, isInitialized, dispatch]);

    return null;
}
