export enum TestStatus {
    IDLE = 'idle',
    QUEUED = 'queued',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAIL = 'fail',
    ERROR = 'error',
    SKIPPED = 'skipped',
    UPDATED = 'updated',
}

export const IDLE = TestStatus.IDLE;
export const QUEUED = TestStatus.QUEUED;
export const RUNNING = TestStatus.RUNNING;
export const SUCCESS = TestStatus.SUCCESS;
export const FAIL = TestStatus.FAIL;
export const ERROR = TestStatus.ERROR;
export const SKIPPED = TestStatus.SKIPPED;
export const UPDATED = TestStatus.UPDATED;
