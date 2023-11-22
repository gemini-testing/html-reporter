import type {EventEmitter} from 'events';

type MapOfMethods<T extends ReadonlyArray<string>> = {
    [K in T[number]]: (...args: Array<unknown>) => Promise<unknown> | unknown;
};

export type RegisterWorkers<T extends ReadonlyArray<string>> = EventEmitter & MapOfMethods<T>;

export const createWorkers = (
    runner: {registerWorkers: (workerFilePath: string, exportedMethods: string[]) => RegisterWorkers<['saveDiffTo']>}
): RegisterWorkers<['saveDiffTo']> => {
    const workerFilepath = require.resolve('./worker');

    return runner.registerWorkers(workerFilepath, ['saveDiffTo']);
};

export type CreateWorkersRunner = Parameters<typeof createWorkers>[0];
