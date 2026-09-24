'use strict';

const childProcess = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

const BUCKET = 'testplane-ui-demo';
const PUBLIC_ROOT = `https://storage.yandexcloud.net/${BUCKET}`;
const ENDPOINT = 'https://s3.yandexcloud.net';

function revisionPrefix(sha, runId, attempt) {
    if (!/^[a-f0-9]{40}$/.test(sha) || !/^\d+$/.test(runId) || !/^\d+$/.test(attempt)) {
        throw new Error('expected full lowercase GITHUB_SHA and numeric run ID/attempt');
    }
    return `live/revisions/${sha}-${runId}-${attempt}`;
}

function redirectHtml(prefix) {
    const target = `${PUBLIC_ROOT}/${prefix}/new-ui.html`;
    return '<!doctype html><meta charset="utf-8"><title>Live demo</title>' +
        `<script>location.replace(${JSON.stringify(target)} + location.search + location.hash)</script>` +
        `<a href="${target}">Open live demo</a>\n`;
}

function aws(...args) {
    childProcess.execFileSync('aws', ['--endpoint-url', ENDPOINT, ...args], {stdio: 'inherit'});
}

function currentMasterSha() {
    return childProcess.execFileSync('git', ['ls-remote', 'origin', 'refs/heads/master'], {encoding: 'utf8'}).split(/\s+/)[0];
}

function upload(report, prefix) {
    aws('s3', 'cp', `${report.replace(/\/$/, '')}/`, `s3://${BUCKET}/${prefix}/`, '--recursive',
        '--acl', 'public-read', '--cache-control', 'public,max-age=31536000,immutable');
}

function activate(prefix, sha) {
    if (currentMasterSha() !== sha) {
        throw new Error('master advanced during publication; latest remains unchanged');
    }
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'html-reporter-demo-'));
    try {
        const page = path.join(directory, 'new-ui.html');
        fs.writeFileSync(page, redirectHtml(prefix));
        aws('s3api', 'put-object', '--bucket', BUCKET, '--key', 'live/latest/new-ui.html',
            '--body', page, '--content-type', 'text/html; charset=utf-8',
            '--cache-control', 'no-store', '--acl', 'public-read');
    } finally {
        fs.rmSync(directory, {recursive: true, force: true});
    }
}

function main(args = process.argv.slice(2)) {
    const [reportFlag, report] = args;
    if (reportFlag !== '--report' || !report || args.length !== 2) {
        throw new Error('Usage: node publish.js --report REPORT');
    }
    const sha = process.env.GITHUB_SHA;
    const prefix = revisionPrefix(sha, process.env.GITHUB_RUN_ID, process.env.GITHUB_RUN_ATTEMPT);
    upload(report, prefix);
    activate(prefix, sha);
}

try {
    main();
} catch (error) {
    console.error(error);
    process.exitCode = 1;
}
