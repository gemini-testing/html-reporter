const fs = require('fs');
const os = require('os');
const path = require('path');
const {pipeline} = require('stream');
const {promisify} = require('util');
const AdmZip = require('adm-zip');
const got = require('got');

const streamPipeline = promisify(pipeline);

const download = async (url) => {
    // Create a temporary directory to store the downloaded file
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'chrome-download-'));

    // Path for the downloaded zip file
    const zipFilePath = path.join(tempDir, 'chrome-linux64.zip');

    await streamPipeline(
        got.stream(url),
        fs.createWriteStream(zipFilePath)
    );

    return zipFilePath;
};

const extract = async (zipFilePath) => {
    const zip = new AdmZip(zipFilePath);

    const outPath = path.dirname(zipFilePath);

    zip.extractAllTo(outPath);

    return path.join(outPath, 'chrome-linux64');
};

(async () => {
    // Available good versions of Chrome for testing: https://googlechromelabs.github.io/chrome-for-testing/known-good-versions.json
    const CHROME_URL = 'https://edgedl.me.gvt1.com/edgedl/chrome/chrome-for-testing/116.0.5845.49/linux64/chrome-linux64.zip';

    const chromeZipPath = await download(CHROME_URL);
    const chromePath = await extract(chromeZipPath);

    console.log(chromePath);
})();
