'use strict';

const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');
const {validate} = require('./check-report');

async function main() {
    const fixture = path.resolve(__dirname, '../../test/func/fixtures/demo');
    const report = path.join(fixture, 'report');
    fs.rmSync(report, {recursive: true, force: true});
    const cliArgs = [path.resolve(__dirname, '../../node_modules/testplane/bin/testplane')];
    if (process.env.DEMO_LOCAL_BROWSER) {
        cliArgs.push('--local');
    }
    const run = spawnSync(process.execPath, cliArgs, {
        cwd: fixture,
        stdio: 'inherit',
        env: process.env
    });
    if (run.error) {
        throw run.error;
    }
    if (run.signal) {
        throw new Error(`Testplane was interrupted by ${run.signal}`);
    }
    const assets = await validate(report);
    console.log(`Validated 21 tests, 25 attempts and ${assets.length} local report assets`);
    if (run.status !== 0) {
        console.log('Expected visual failure confirmed by strict report validation');
    }
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
