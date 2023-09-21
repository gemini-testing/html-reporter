const childProcess = require('child_process');
const fs = require('fs/promises');
const path = require('path');

const {PORTS} = require('../../utils/constants');

const projectName = process.env.PROJECT_UNDER_TEST;
const projectDir = path.resolve(__dirname, '../../fixtures', projectName);
const guiUrl = `http://host.docker.internal:${PORTS[projectName].gui}`;

const reportDir = path.join(projectDir, 'report');
const reportBackupDir = path.join(projectDir, 'report');

// These tests should not be launched in parallel
describe('GUI mode', () => {
    let guiProcess;

    beforeEach(async ({browser}) => {
        await fs.cp(reportDir, reportBackupDir);

        guiProcess = childProcess.spawn('npm run gui', {cwd: projectDir});

        await browser.url(guiUrl);
    });

    afterEach(async () => {
        guiProcess.kill('SIGINT');

        await fs.rmdir(reportDir);
        await fs.rename(reportBackupDir, reportDir);
        // TODO: restore project directory via git
    });

    describe('running tests', () => {
        it('should run a single test');
    });

    describe('accepting diff', () => {
        it('should create a successful retry');
        it('should make the test pass on next run');
    });

    describe('undo accepting diff', () => {
        beforeEach(() => {
            // TODO: accept diff
        });

        it('should leave project files intact');
    });

    describe('accepting new screenshot', () => {
        it('should create a successful retry');
        it('should make the test pass on next run');
    });

    describe('undo accepting new screenshot', () => {
        beforeEach(() => {
            // TODO: accept new screenshot
        });

        it('should leave project files intact');
    });
});
