import path from 'node:path';
import {performance} from 'node:perf_hooks';

import chokidar from 'chokidar';

import {logger} from '../../common-utils';
import {ClientEvents} from '../constants';
import type {TestsWatchPlan} from '../../adapters/tool';
import type {TestsTreeUpdate} from '../tool-runner';

interface RefreshTarget {
    refreshTestsIfChanged(
        changedFiles: string[],
        removedDirectories: string[],
        onChanged: (changed: boolean) => void,
        onUpdated: (update: TestsTreeUpdate) => void,
        performanceId: number
    ): Promise<void>;
    sendClientEvent(event: string, data: unknown): void;
}

interface TestsWatcherOptions {
    app: RefreshTarget;
    plan: TestsWatchPlan;
    reportPath: string;
}

export class TestsWatcher {
    private _app: RefreshTarget;
    private _plan: TestsWatchPlan;
    private _reportPath: string;
    private _testsWatcher?: chokidar.FSWatcher;
    private _directoriesWatcher?: chokidar.FSWatcher;
    private _refreshInProgress = false;
    private _queuedFiles = new Set<string>();
    private _queuedRemovedDirectories = new Set<string>();
    private _debounceFiles = new Set<string>();
    private _debounceRemovedDirectories = new Set<string>();
    private _refreshTimer?: NodeJS.Timeout;
    private _refreshSequence = 0;
    private _firstDebouncedEventAt?: number;

    static create(options: TestsWatcherOptions): TestsWatcher {
        return new TestsWatcher(options);
    }

    constructor({app, plan, reportPath}: TestsWatcherOptions) {
        this._app = app;
        this._plan = plan;
        this._reportPath = reportPath;
    }

    start(): void {
        try {
            this._testsWatcher = chokidar.watch(this._plan.paths, {
                cwd: process.cwd(),
                ignoreInitial: true,
                ignored: [
                    /(^|[/\\])\../,
                    /(^|[/\\])node_modules([/\\]|$)/,
                    path.resolve(process.cwd(), this._reportPath)
                ],
                awaitWriteFinish: {stabilityThreshold: 200, pollInterval: 100}
            });
            this._testsWatcher.on('all', this._queueFileSystemEvent);
            this._testsWatcher.on('error', error => this._handleWatcherError('test files', error));

            // A file glob does not necessarily subscribe Chokidar to directory
            // lifecycle events. Watch the non-glob roots separately so deleting a
            // directory is always observable.
            this._directoriesWatcher = chokidar.watch(this._plan.roots, {
                cwd: process.cwd(),
                ignoreInitial: true,
                ignored: [/(^|[/\\])\../, /(^|[/\\])node_modules([/\\]|$)/]
            });
            this._directoriesWatcher.on('unlinkDir', changedDirectory => {
                this._queueFileSystemEvent('unlinkDir', changedDirectory);
            });
            this._directoriesWatcher.on('error', error => this._handleWatcherError('test directories', error));
        } catch (error) {
            this._handleWatcherError('initialization', error);
        }
    }

    close(): void {
        if (this._refreshTimer) {
            clearTimeout(this._refreshTimer);
        }
        void this._testsWatcher?.close();
        void this._directoriesWatcher?.close();
    }

    private _queueFileSystemEvent = (event: string, changedFile: string): void => {
        logger.log(`[watch-perf][server] chokidar event ${JSON.stringify({event, path: changedFile})}`);
        if (this._debounceFiles.size === 0) {
            this._firstDebouncedEventAt = performance.now();
        }
        this._debounceFiles.add(changedFile);
        if (event === 'unlinkDir') {
            this._debounceRemovedDirectories.add(changedFile);
        }
        if (this._refreshTimer) {
            clearTimeout(this._refreshTimer);
        }
        this._refreshTimer = setTimeout(() => {
            this._refreshTimer = undefined;
            logger.log(`[watch-perf][server] chokidar debounce: ${this._firstDebouncedEventAt === undefined ? 0 : (performance.now() - this._firstDebouncedEventAt).toFixed(1)}ms ${JSON.stringify({events: this._debounceFiles.size})}`);
            this._firstDebouncedEventAt = undefined;
            const changedFiles = [...this._debounceFiles];
            const removedDirectories = [...this._debounceRemovedDirectories];
            this._debounceFiles.clear();
            this._debounceRemovedDirectories.clear();
            void this._refresh(changedFiles, removedDirectories);
        }, 100);
    };

    private async _refresh(changedFiles: string[], removedDirectories: string[]): Promise<void> {
        changedFiles.forEach(file => this._queuedFiles.add(path.resolve(process.cwd(), file)));
        removedDirectories.forEach(directory => this._queuedRemovedDirectories.add(path.resolve(process.cwd(), directory)));

        if (this._refreshInProgress) {
            return;
        }

        this._refreshInProgress = true;
        try {
            while (this._queuedFiles.size) {
                const refreshId = ++this._refreshSequence;
                const serverStartedAt = Date.now();
                const refreshStartedAt = performance.now();
                const files = [...this._queuedFiles];
                const removedDirs = [...this._queuedRemovedDirectories];
                this._queuedFiles.clear();
                this._queuedRemovedDirectories.clear();
                let changed = false;
                let treeUpdate: TestsTreeUpdate | undefined;
                logger.log(`[watch-perf][server][#${refreshId}] refresh started ${JSON.stringify({files: files.length, removedDirectories: removedDirs.length})}`);
                await this._app.refreshTestsIfChanged(files, removedDirs, (hasChanges) => {
                    changed = hasChanges;
                    if (hasChanges) {
                        this._app.sendClientEvent(ClientEvents.TESTS_REFRESH_STARTED, {performanceId: refreshId});
                    }
                }, (update) => {
                    treeUpdate = update;
                }, refreshId);

                if (changed && treeUpdate) {
                    treeUpdate.performance = {
                        id: refreshId,
                        serverStartedAt,
                        serverCompletedAt: Date.now()
                    };
                    const sendStartedAt = performance.now();
                    this._app.sendClientEvent(ClientEvents.TESTS_REFRESHED, treeUpdate);
                    logger.log(`[watch-perf][server][#${refreshId}] serialize/write SSE: ${(performance.now() - sendStartedAt).toFixed(1)}ms`);
                }
                logger.log(`[watch-perf][server][#${refreshId}] refresh loop total: ${(performance.now() - refreshStartedAt).toFixed(1)}ms ${JSON.stringify({changed})}`);
            }
        } catch (error) {
            this._app.sendClientEvent(ClientEvents.TESTS_REFRESH_FAILED, undefined);
            logger.error(`Error while refreshing tests after file change: ${(error as Error).message}`);
        } finally {
            this._refreshInProgress = false;
            if (this._queuedFiles.size) {
                void this._refresh([], []);
            }
        }
    }

    private _handleWatcherError(scope: string, error: unknown): void {
        this._app.sendClientEvent(ClientEvents.TESTS_REFRESH_FAILED, undefined);
        logger.error(`Test tree watcher error (${scope}): ${(error as Error).message}`);
    }
}
