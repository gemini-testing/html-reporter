import {Response} from 'express';
import stringify from 'json-stringify-safe';
import {ClientEvents} from './constants';

export class EventSource {
    private _connections: Response[];
    constructor() {
        this._connections = [];
    }

    private _write(connection: Response, event: string, data?: unknown): void {
        connection.write('event: ' + event + '\n');
        connection.write('data: ' + stringify(data) + '\n');
        connection.write('\n\n');
    }

    addConnection(connection: Response): void {
        this._connections.push(connection);

        this._write(connection, ClientEvents.CONNECTED, 1);
    }

    emit(event: string, data?: unknown): void {
        this._connections.forEach((connection) => {
            this._write(connection, event, data);
        });
    }
}
