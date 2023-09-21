const {getTestSectionByName, getElementWithText} = require('../utils');

describe('Test details', function() {
    it('should show details', async ({browser}) => {
        await browser.$('div*=test with long error message').waitForDisplayed();

        const erroredTestSection = await browser.$('div*=test with long error message').$('../..');

        await erroredTestSection.$('.details__summary').click();

        const fileMetaInfo = await erroredTestSection.$('div*=failed-describe.hermione.js').$('..');

        await expect(fileMetaInfo).toBeDisplayed();
        await expect(await fileMetaInfo.$('span*=file')).toBeDisplayed();
    });

    it('should prevent details summary overflow', async ({browser}) => {
        const selector = [
            getTestSectionByName('test with long error message'),
            `//summary[.${getElementWithText('span', 'message')}]`
        ].join('');

        await browser.$(selector).waitForDisplayed();
        await browser.assertView('details summary', selector);
    });
});
