import {get} from 'lodash';
import {isTestNameMatchFilters} from './utils';
import {shouldShowBrowser, isBrowserMatchViewMode} from './selectors/helpers';
import viewModes from '../../constants/view-modes';

const imageComparisonErrorMessage = 'image comparison failed';

/**
 * @param {object} tree
 * @param {string} viewMode
 * @param {array} errorPatterns
 * @param {array} filteredBrowsers
 * @param {string} [testNameFilter]
 * @param {boolean} [strictMatchFilter]
 * @return {array}
 */
function groupErrors({tree = {}, viewMode = viewModes.ALL, errorPatterns = [], filteredBrowsers = [], testNameFilter = '', strictMatchFilter = false}) {
    const errorGroups = {};

    for (const result of Object.values(tree.results.byId)) {
        const browser = tree.browsers.byId[result.parentId];
        const images = result.imageIds.map((imageId) => tree.images.byId[imageId]);
        const testName = browser.parentId;

        if (!isBrowserMatchViewMode(browser, result.status, viewMode)) {
            continue;
        }

        if (!isTestNameMatchFilters(testName, testNameFilter, strictMatchFilter)) {
            continue;
        }

        if (!shouldShowBrowser(browser, filteredBrowsers)) {
            continue;
        }

        const errors = extractErrors(result, images);

        for (const errorText of errors) {
            const patternInfo = matchGroup(errorText, errorPatterns);
            const {pattern, name} = patternInfo;

            if (!errorGroups.hasOwnProperty(name)) {
                errorGroups[name] = {
                    pattern,
                    name,
                    browserIds: [],
                    count: 0
                };
            }

            const group = errorGroups[name];

            if (!group.browserIds.includes(browser.id)) {
                group.browserIds.push(browser.id);
                group.count++;
            }
        }
    }

    return Object.values(errorGroups);
}

function extractErrors(result, images) {
    const errors = new Set();

    for (const {error, diffImg} of [...images, result]) {
        if (get(error, 'message')) {
            errors.add(error.message);
        }

        if (diffImg) {
            errors.add(imageComparisonErrorMessage);
        }
    }

    return [...errors];
}

function matchGroup(errorText, errorPatterns) {
    for (const group of errorPatterns) {
        if (errorText.match(group.regexp)) {
            return group;
        }
    }

    return {
        name: errorText,
        pattern: errorText
    };
}

module.exports = {groupErrors};
