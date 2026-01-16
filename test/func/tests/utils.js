const childProcess = require('child_process');
const {promisify} = require('util');
const treeKill = promisify(require('tree-kill'));

/** Returns a div, which wraps the whole test section with specified name */
const getTestSectionByNameSelector = (testName) => `//div[contains(text(),'${testName}')]/..`;

/** Returns a div, which wraps the whole test section with specified name */
const getTestStateByNameSelector = (stateName) => `//div[contains(text(),'${stateName}')]/..`;

/** Returns a div, which wraps text with specified status and screenshot itself
 * @param status {'Expected' | 'Actual' | 'Diff'} */
const getImageSectionSelector = (status) => `//div[contains(text(), '${status}')]/..`;

/** Returns an element containing specified text */
const getElementWithTextSelector = (tagName, text) => `//${tagName}[contains(normalize-space(),'${text}')]`;

/** Returns <details> element which has summary containing name */
const getSpoilerByNameSelector = (name) => `section[.//div[contains(text(), "${name}")]]`;

const hideHeader = async (browser) => {
    await browser.execute(() => {
        document.querySelector('.sticky-header').style.visibility = 'hidden';
    });
};

const hideScreenshots = async (browser) => {
    await browser.execute(() => {
        document.querySelectorAll('.image-box__container').forEach(el => {
            el.style.display = 'none';
        });
    });
};

const runGui = async (projectDir, {autoRun = false, grep = null} = {}) => {
    return new Promise((resolve, reject) => {
        const args = ['run', 'gui', '--', '--no-open'];

        if (autoRun) {
            args.push('--auto-run');
        }

        if (grep) {
            args.push('--grep', grep);
        }

        const child = childProcess.spawn('npm', args, {cwd: projectDir});

        let processKillTimeoutId = setTimeout(() => {
            treeKill(child.pid).then(() => {
                reject(new Error('Couldn\'t start GUI: timed out'));
            });
        }, 3000);

        child.stdout.on('data', (data) => {
            if (data.toString().includes('GUI is running at')) {
                clearTimeout(processKillTimeoutId);
                resolve(child);
            }
        });

        child.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        child.on('close', (code) => {
            if (code !== 0) {
                reject(new Error(`GUI process exited with code ${code}`));
            }
        });
    });
};

const getFsDiffFromVcs = (directory) => childProcess.execSync('git status . --porcelain=v2', {cwd: directory});

const waitForFsChanges = async (dirPath, condition = (output) => output.length > 0, {timeout = 1000, interval = 50} = {}) => {
    let isTimedOut = false;

    const timeoutId = setTimeout(() => {
        isTimedOut = true;
        throw new Error(`Timed out while waiting for fs changes in ${dirPath} for ${timeout}ms`);
    }, timeout);

    while (!isTimedOut) {
        const output = getFsDiffFromVcs(dirPath);

        if (condition(output)) {
            clearTimeout(timeoutId);
            return;
        }

        await new Promise(resolve => setTimeout(resolve, interval));
    }
};

const interceptClipboard = async (browser) => {
    await browser.execute(() => {
        window.__copiedText = null;
        const originalExecCommand = document.execCommand.bind(document);
        document.execCommand = (command, ...args) => {
            if (command === 'copy') {
                const activeEl = document.activeElement;
                if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA')) {
                    window.__copiedText = activeEl.value;
                }
            }
            return originalExecCommand(command, ...args);
        };
    });
};

const getClipboardValue = async (browser) => {
    return browser.execute(() => window.__copiedText);
};

module.exports = {
    getTestSectionByNameSelector,
    getTestStateByNameSelector,
    getImageSectionSelector,
    getElementWithTextSelector,
    getSpoilerByNameSelector,
    hideHeader,
    hideScreenshots,
    runGui,
    getFsDiffFromVcs,
    waitForFsChanges,
    interceptClipboard,
    getClipboardValue
};
