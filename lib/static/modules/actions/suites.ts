import actionNames from '@/static/modules/action-names';
import {Action} from '@/static/modules/actions/types';

interface ChangeTestRetryPayload {
    browserId: string;
    retryIndex: number;
    suitesPage?: {
        treeNodeId: string;
    }
}

export const changeTestRetry = (result: ChangeTestRetryPayload): Action<typeof actionNames.CHANGE_TEST_RETRY, ChangeTestRetryPayload> =>
    ({type: actionNames.CHANGE_TEST_RETRY, payload: result});
