'use strict';

const path = require('path');
const _ = require('lodash');
const fg = require('fast-glob');
const Promise = require('bluebird');
const fs = require('fs-extra');
const inquirer = require('inquirer');

const {SUCCESS} = require('../../constants/test-statuses');

exports.getTestsFromFs = async (hermione) => {
    const tests = {
        byId: {},
        screenPatterns: [],
        count: 0,
        browserIds: new Set()
    };
    const uniqTests = new Set();

    const testCollection = await hermione.readTests([], {silent: true});

    testCollection.eachTest((test, browserId) => {
        const fullTitle = test.fullTitle();
        const id = `${fullTitle} ${browserId}`;
        const screenPattern = hermione.config.browsers[browserId].getScreenshotPath(test, '*');

        tests.byId[id] = {screenPattern, ...test};
        tests.browserIds.add(browserId);
        uniqTests.add(fullTitle);
    });

    tests.count = uniqTests.size;

    for (const test of Object.values(tests.byId)) {
        test.screenPaths = (await fg(test.screenPattern)) || [];
        tests.screenPatterns.push(test.screenPattern);
    }

    return tests;
};

exports.findScreens = async (screenPatterns) => {
    return _(await Promise.map(screenPatterns, pattern => fg(pattern))).flatten().uniq().value();
};

exports.askQuestion = async (question, {skipQuestions} = {}) => {
    if (skipQuestions) {
        return question.default;
    }

    const res = await inquirer.prompt([question]);

    return res[question.name];
};

exports.identifyOutdatedScreens = (screenPaths, screenPatterns) => {
    const shortenedScreenPaths = screenPaths.map(screenPath => path.relative(process.cwd(), screenPath));
    const shortenedPatterns = screenPatterns.map(pattern => path.dirname(path.relative(process.cwd(), pattern)));
    const outdatedScreens = [];

    for (const screenPath of shortenedScreenPaths) {
        const isFound = shortenedPatterns.some(pattern => screenPath.startsWith(pattern));

        if (!isFound) {
            outdatedScreens.push(screenPath);
        }
    }

    return outdatedScreens;
};

exports.identifyUnusedScreens = (fsTests, {hermione, mergedDbPath} = {}) => {
    const dbTree = hermione.htmlReporter.getTestsTreeFromDatabase(mergedDbPath);
    const screenPathsBySuccessTests = getScreenPathsBySuccessTests(dbTree);
    const unusedScreens = [];

    for (const testId of Object.keys(screenPathsBySuccessTests)) {
        const usedScreenPaths = screenPathsBySuccessTests[testId];
        const successTest = fsTests.byId[testId];

        if (!successTest) {
            continue;
        }

        successTest.screenPaths.forEach(fsScreenPath => {
            const isUsed = usedScreenPaths.some(usedScreenPath => fsScreenPath.endsWith(usedScreenPath));

            if (!isUsed) {
                unusedScreens.push(fsScreenPath);
            }
        });
    }

    return unusedScreens;
};

// in tree.browsers there are info about uniq tests in each browser
function getScreenPathsBySuccessTests(tree) {
    const successTree = {};

    for (const browserId of tree.browsers.allIds) {
        const browser = tree.browsers.byId[browserId];
        const lastResultId = _.last(browser.resultIds);
        const lastResult = tree.results.byId[lastResultId];

        if (lastResult.status !== SUCCESS || _.isEmpty(lastResult.imageIds)) {
            continue;
        }

        const screenPaths = lastResult.imageIds.map(imageId => `${tree.images.byId[imageId].stateName}.png`);

        successTree[browserId] = screenPaths;
    }

    return successTree;
}

exports.removeScreens = async (screenPaths) => {
    for (let screenPath of screenPaths) {
        await fs.remove(screenPath);
    }

    const screenPathDirs = getUniqPathDirs(screenPaths);

    await clearEmptyDirs(screenPathDirs);
};

async function clearEmptyDirs(dirs) {
    const clearedDirs = [];

    for (let dir of dirs) {
        try {
            const files = await fs.readdir(dir);

            if (arePathsHidden(files)) {
                for (let file of files) {
                    await fs.remove(file);
                }
            } else {
                continue;
            }

            await fs.remove(dir);

            clearedDirs.push(dir);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                throw err;
            }
        }
    }

    if (_.isEmpty(clearedDirs)) {
        return;
    }

    await clearEmptyDirs(getUniqPathDirs(clearedDirs));
}

function arePathsHidden(files) {
    return files.every(file => file.startsWith('.'));
}

function getUniqPathDirs(paths) {
    return _.uniq(paths.map((p) => path.dirname(p)));
}
