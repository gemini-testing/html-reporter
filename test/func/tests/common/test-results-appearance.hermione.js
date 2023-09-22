const {getTestSectionByName, getImageSection, getTestStateByName, getElementWithText} = require('../utils');

const hideHeader = async (browser) => {
    await browser.execute(() => {
        document.querySelector('.sticky-header').style.visibility = 'hidden';
    });
};

describe('Test results appearance', () => {
    beforeEach(async ({browser}) => {
        await browser.$('button*=Expand all').click();
    });

    afterEach(async ({browser}) => {
        await browser.execute(() => {
            window.localStorage.clear();
        });
    });

    describe('Passed test', () => {
        it('should have green retry selector', async ({browser}) => {
            const retrySelectorButton = await browser.$('//div[contains(text(),\'successfully passed test\')]/..//button[@data-test-id="retry-switcher"]');

            await hideHeader(browser);

            await retrySelectorButton.assertView('retry-selector');
        });
    });

    describe('Test with diff', function() {
        it('should have pink retry selector', async ({browser}) => {
            const retrySelectorButton = await browser.$('//div[contains(text(),\'test with diff\')]/..//button[@data-test-id="retry-switcher"]');

            await hideHeader(browser);

            await retrySelectorButton.assertView('retry-selector');
        });

        it('should display 3 images', async ({browser}) => {
            for (const imageStatus of ['Expected', 'Actual', 'Diff']) {
                const imageElement = browser.$([
                    getTestSectionByName('test with diff'),
                    getImageSection(imageStatus),
                    '//img'
                ].join(''));

                // If the image wasn't loaded successfully, it will be displayed as broken image icon and have naturalWidth 0
                const naturalWidth = await imageElement.getProperty('width');

                expect(naturalWidth).toBeGreaterThan(0);
            }
        });

        it('should not display error info', async ({browser}) => {
            for (const field of ['message', 'name', 'stack']) {
                const errorMessage = browser.$([
                    getTestSectionByName('test with diff'),
                    getTestStateByName('header'),
                    getElementWithText('span', field)
                ].join(''));

                await expect(errorMessage).not.toBeDisplayed();
            }
        });
    });

    describe('Test with no ref image', function() {
        it('should have pink retry selector', async ({browser}) => {
            const retrySelectorButton = await browser.$('//div[contains(text(),\'test without screenshot\')]/..//button[@data-test-id="retry-switcher"]');

            await hideHeader(browser);

            await retrySelectorButton.assertView('retry-selector');
        });

        it('should display error message, name and stack', async ({browser}) => {
            for (const field of ['message', 'name', 'stack']) {
                const errorMessage = browser.$([
                    getTestSectionByName('test without screenshot'),
                    getTestStateByName('header'),
                    getElementWithText('span', field)
                ].join(''));

                await expect(errorMessage).toBeDisplayed();
            }
        });

        it('should display actual screenshot', async ({browser}) => {
            const imageElement = browser.$([
                getTestSectionByName('test without screenshot'),
                getTestStateByName('header'),
                '//img'
            ].join(''));

            const naturalWidth = await imageElement.getProperty('width');

            expect(naturalWidth).toBeGreaterThan(0);
        });
    });

    describe('Test with error', function() {
        it('should have red retry selector', async ({browser}) => {
            const retrySelectorButton = await browser.$('//div[contains(text(),\'test with long error message\')]/..//button[@data-test-id="retry-switcher"]');

            await hideHeader(browser);

            await retrySelectorButton.assertView('retry-selector');
        });

        it('should display error message, name and stack', async ({browser}) => {
            for (const field of ['message', 'name', 'stack']) {
                const errorMessage = browser.$([
                    getTestSectionByName('test with long error message'),
                    // getTestStateByName('header'),
                    getElementWithText('span', field)
                ].join(''));

                await expect(errorMessage).toBeDisplayed();
            }
        });
    });
});
