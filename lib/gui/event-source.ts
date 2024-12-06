import {Response} from 'express';
import stringify from 'json-stringify-safe';
import {ClientEvents} from './constants';

export class EventSource {
    private _connections: Response[];
    constructor() {
        this._connections = [];
    }

    addConnection(connection: Response): void {
        this._connections.push(connection);

        connection.write('event: ' + ClientEvents.CONNECTED + '\n');
        connection.write('data: 1\n');
        connection.write('\n\n');
    }

    emit(event: string, data?: unknown): void {
        this._connections.forEach(function(connection) {
            connection.write('event: ' + event + '\n');
            connection.write('data: ' + stringify(data) + '\n');
            connection.write('\n\n');
        });
    }
}
