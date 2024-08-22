export enum TestStatus {
    IDLE = 'idle',
    QUEUED = 'queued',
    RUNNING = 'running',
    SUCCESS = 'success',
    FAIL = 'fail',
    ERROR = 'error',
    SKIPPED = 'skipped',
    UPDATED = 'updated',
    /**
     * @note used by staticImageAccepter only
     */
    STAGED = 'staged',
    /**
     * @note used by staticImageAccepter only
     */
    COMMITED = 'commited',
    /**
     * @note used in new UI only for rendering icons
     */
    RETRY = 'retry'
}

export const IDLE = TestStatus.IDLE;
export const QUEUED = TestStatus.QUEUED;
export const RUNNING = TestStatus.RUNNING;
export const SUCCESS = TestStatus.SUCCESS;
export const FAIL = TestStatus.FAIL;
export const ERROR = TestStatus.ERROR;
export const SKIPPED = TestStatus.SKIPPED;
export const UPDATED = TestStatus.UPDATED;
/**
 * @note used by staticImageAccepter only
 */
export const STAGED = TestStatus.STAGED;
/**
 * @note used by staticImageAccepter only
 */
export const COMMITED = TestStatus.COMMITED;
