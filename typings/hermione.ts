import { IBrowser } from './suite-adapter';
import Mocha from 'mocha';

export interface IOptions {
    enable?: boolean;
    path?: string;
    defaultView?: 'all' | 'failed';
    baseHost?: string;
    scaleImages?: boolean;
    lazyLoadOffset?: number;
}

type Num = number | null;

export interface IHermione {
    domain: null | string;
    _events: any;
    _eventsCount: Num;
    _maxListeners?: number;
    _config: {
        configPath: string;
        desiredCapabilities: Num;
        gridUrl: string;
        baseUrl: string;
        sessionsPerBrowser: number;
        testsPerSession: number;
        retry: number;
        shouldRetry: Num | string;
        httpTimeout: number;
        pageLoadTimeout: Num;
        sessionRequestTimeout: Num;
        sessionQuitTimeout: Num;
        waitTimeout: Num;
        screenshotOnReject: boolean;
        screenshotOnRejectTimeout: Num;
        prepareBrowser: null | any;
        screenshotPath: null | any;
        screenshotsDir: string | null;
        calibrate: boolean;
        compositeImage: boolean;
        screenshotMode: string;
        screenshotDelay: Num;
        tolerance: Num;
        antialiasingTolerance: Num;
        meta: null | any;
        windowSize: Num;
        orientation: null | string;
        resetCursor: boolean;
        browsers: {
            [key: string]: IBrowser;
        };
        prepareEnvironment: null | string;
        system: {
            debug: boolean;
            mochaOpts: Mocha.MochaOptions;
            ctx: any;
            patternsOnReject: any;
            workers: number;
            testsPerWorker: number;
            // hex format
            diffColor: string;
            tempDir: string;
        };
        plugins: {
            ['html-reporter/hermione-entry']: {
                path: string;
            };
            [path: string]: any;
        };
        sets: {
            [key: string]: any;
        };
    };
    events: {
        [key: string]: string;
    };
    on(event: string, func: (anything: any) => any): void;
}

export interface IStats {
    retries: number;
    skipped: number;
    passed: number;
    failed: number;
    total: number;
}
