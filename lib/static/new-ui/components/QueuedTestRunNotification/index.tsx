import {useEffect} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {useToaster} from '@gravity-ui/uikit';
import {cancelQueuedTestRun} from '@/static/modules/actions/run-tests';
import type {State} from '@/static/new-ui/types/store';

export function QueuedTestRunNotification(): null {
    const queuedTestRun = useSelector((state: State) => state.app.queuedTestRun);
    const dispatch = useDispatch();
    const toaster = useToaster();

    useEffect(() => {
        if (!queuedTestRun) {
            return;
        }
        const name = 'queued-test-run';
        toaster.add({
            name,
            title: 'Run queued',
            content: 'Tests will start automatically after initialization.',
            autoHiding: false,
            isClosable: false,
            actions: [{label: 'Cancel', onClick: () => dispatch(cancelQueuedTestRun())}]
        });
        return () => toaster.remove(name);
    }, [queuedTestRun, dispatch, toaster]);

    return null;
}
