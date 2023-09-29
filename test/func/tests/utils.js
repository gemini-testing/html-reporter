/** Returns a div, which wraps the whole test section with specified name */
const getTestSectionByNameSelector = (testName) => `//div[contains(text(),'${testName}')]/..`;

/** Returns a div, which wraps the whole test section with specified name */
const getTestStateByNameSelector = (stateName) => `//div[contains(text(),'${stateName}')]/..`;

/** Returns a div, which wraps text with specified status and screenshot itself
 * @param status {'Expected' | 'Actual' | 'Diff'} */
const getImageSectionSelector = (status) => `//div[contains(text(), '${status}')]/..`;

/** Returns an element containing specified text */
const getElementWithTextSelector = (tagName, text) => `//${tagName}[contains(text(),'${text}')]`;

/** Returns <details> element which has summary containing name */
const getSpoilerByNameSelector = (name) => `details[.//summary[contains(text(), "${name}")]]`;

const hideHeader = async (browser) => {
    await browser.execute(() => {
        document.querySelector('.sticky-header').style.visibility = 'hidden';
    });
};

module.exports = {
    getTestSectionByNameSelector,
    getTestStateByNameSelector,
    getImageSectionSelector,
    getElementWithTextSelector,
    getSpoilerByNameSelector,
    hideHeader
};
