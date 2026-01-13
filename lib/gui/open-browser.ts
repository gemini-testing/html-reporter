/**
 * The following is modified based on source found in
 * https://github.com/vitejs/vite and https://github.com/facebook/create-react-app
 *
 * MIT Licensed
 * Copyright (c) 2015-present, Facebook, Inc.
 *
 * Modified for use in html-reporter.
 */

import path from 'node:path';
import {exec} from 'node:child_process';
import type {ExecOptions} from 'node:child_process';
import open from 'open';

const supportedChromiumBrowsers = [
    'Google Chrome Canary',
    'Google Chrome Dev',
    'Google Chrome Beta',
    'Google Chrome',
    'Microsoft Edge',
    'Brave Browser',
    'Vivaldi',
    'Chromium',
    'Yandex'
];

export async function openBrowser(url: string): Promise<boolean> {
    // If we're on macOS, we can try opening a Chromium browser with JXA.
    // This lets us reuse an existing tab when possible instead of creating a new one.
    if (process.platform === 'darwin') {
        try {
            const ps = await execAsync('ps cax');
            const openedBrowser = supportedChromiumBrowsers.find((b) => ps.includes(b));

            if (openedBrowser) {
                // Try our best to reuse existing tab with JXA
                await execAsync(`osascript openChrome.js "${url}" "${openedBrowser}"`, {
                    cwd: path.join(__dirname)
                });
                return true;
            }
        } catch {
            // Ignore errors, fall through to regular open
        }
    }

    // Fallback to open (will always open new tab)
    try {
        await open(url);
        return true;
    } catch {
        return false;
    }
}

function execAsync(command: string, options?: ExecOptions): Promise<string> {
    return new Promise((resolve, reject) => {
        exec(command, options, (error, stdout) => {
            if (error) {
                reject(error);
            } else {
                resolve(stdout.toString());
            }
        });
    });
}
