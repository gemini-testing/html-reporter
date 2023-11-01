import {Response} from 'express';
import stringify from 'json-stringify-safe';

export class EventSource {
    private _connections: Response[];
    constructor() {
        this._connections = [];
    }

    addConnection(connection: Response): void {
        this._connections.push(connection);
    }

    emit(event: string, data?: unknown): void {
        this._connections.forEach(function(connection) {
            connection.write('event: ' + event + '\n');
            connection.write('data: ' + stringify(data) + '\n');
            connection.write('\n\n');
        });
    }
}
