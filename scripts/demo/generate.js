'use strict';

const {spawnSync} = require('child_process');
const fs = require('fs');
const path = require('path');

function runTestplane(fixture, label) {
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
    if (run.status !== 0) {
        console.log(`${label} generated with expected fixture failures`);
    }
}

function main() {
    const fixtures = path.resolve(__dirname, '../../test/func/fixtures');
    const sourceFixture = path.join(fixtures, 'testplane');
    const demoFixture = path.join(fixtures, 'demo');

    fs.rmSync(path.join(sourceFixture, 'report'), {recursive: true, force: true});
    fs.rmSync(path.join(demoFixture, 'report'), {recursive: true, force: true});

    runTestplane(sourceFixture, 'Source fixture');
    runTestplane(demoFixture, 'Demo report');
}

try {
    main();
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}
