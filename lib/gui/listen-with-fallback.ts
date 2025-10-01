import type {Server as HttpServer} from 'http';
import type {Express} from 'express';
import {HEADERS_TIMEOUT, KEEP_ALIVE_TIMEOUT} from './constants';

interface ListenOptions {
    server: Express;
    hostname?: string;
    requestedPort?: number;
}

interface ListenResult {
    actualPort: number;
    hostnameForUrl: string;
}

const MAX_PORT_NUMBER = 65_535;
const DEFAULT_PORT = 3000;

const listenOnPort = (server: Express, portToTry: number, hostname?: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        // eslint-disable-next-line prefer-const
        let httpServer: HttpServer;

        const handleError = (error: NodeJS.ErrnoException): void => {
            httpServer.removeListener('error', handleError);
            reject(error);
        };

        const onListen = (): void => {
            resolve();
        };

        httpServer = hostname
            ? server.listen(portToTry, hostname, onListen)
            : server.listen(portToTry, onListen);
        httpServer.keepAliveTimeout = KEEP_ALIVE_TIMEOUT;
        httpServer.headersTimeout = HEADERS_TIMEOUT;

        httpServer.once('error', handleError);
    });
};

export const listenWithFallback = async ({server, hostname, requestedPort}: ListenOptions): Promise<ListenResult> => {
    const hostnameForUrl = hostname ?? 'localhost';
    const startPort = requestedPort ?? DEFAULT_PORT;

    let currentPort = startPort;
    let isSuccess = false;

    while (currentPort <= MAX_PORT_NUMBER) {
        try {
            await listenOnPort(server, currentPort, hostname);
            isSuccess = true;
            break;
        } catch (error) {
            const err = error as NodeJS.ErrnoException;

            if (err.code !== 'EADDRINUSE') {
                throw err;
            }

            if (currentPort >= MAX_PORT_NUMBER) {
                throw new Error(`Unable to find an available port to start GUI server: ${err.message}`);
            }

            currentPort += 1;
        }
    }

    if (!isSuccess) {
        throw new Error(`Unable to find an available port (tried all variants between ${startPort} and ${MAX_PORT_NUMBER})`);
    }

    return {
        actualPort: currentPort,
        hostnameForUrl
    };
};
