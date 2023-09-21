/** Returns a div, which wraps the whole test section with specified name */
const getTestSectionByName = (testName) => `//div[contains(text(),'${testName}')]/..`;

/** Returns a div, which wraps the whole test section with specified name */
const getTestStateByName = (stateName) => `//div[contains(text(),'${stateName}')]/..`;

/** Returns a div, which wraps text with specified status and screenshot itself
 * @param status {'Expected' | 'Actual' | 'Diff'} */
const getImageSection = (status) => `//div[contains(text(), '${status}')]/..`;

/** Returns an element containing specified text */
const getElementWithText = (tagName, text) => `//${tagName}[contains(text(),'${text}')]/..`;

module.exports = {
    getTestSectionByName,
    getTestStateByName,
    getImageSection,
    getElementWithText
};
