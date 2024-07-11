import _ from 'lodash';
import type {ChildProcess} from 'node:child_process';

export default {
    emit: (event: string, data: Record<string, unknown> = {}): void => {
        process.send && process.send({event, ...data});
    },
    on: <T extends Record<string, unknown>>(event: string, handler: (msg: T & {event: string}) => void, proc: ChildProcess | NodeJS.Process = process): void => {
        proc.on('message', (msg: T & {event: string}) => {
            if (event !== _.get(msg, 'event')) {
                return;
            }

            handler(msg);
        });
    }
};
