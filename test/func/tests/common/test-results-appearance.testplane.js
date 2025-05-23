const {
    getTestSectionByNameSelector,
    getImageSectionSelector,
    getTestStateByNameSelector,
    getElementWithTextSelector,
    hideHeader, hideScreenshots,
    getSpoilerByNameSelector
} = require('../utils');

describe(process.env.TOOL || 'Default', () => {
    describe('Test results appearance', () => {
        beforeEach(async ({browser}) => {
            await browser.$('//*[contains(@class, "expand-dropdown")]//button').click();
            await browser.$('//*[contains(@class, "expand-popup")]//span[contains(normalize-space(), "All")]').click();
        });

        describe('Passed test', () => {
            it('should have green retry selector', async ({browser}) => {
                const retrySelectorButton = await browser.$(
                    getTestSectionByNameSelector('successfully passed test') +
                    '//button[@data-qa="retry-switcher"]'
                );

                await hideHeader(browser);
                await hideScreenshots(browser);

                await retrySelectorButton.assertView('retry-selector');
            });
        });

        describe('Test with diff', function() {
            it('should have pink retry selector', async ({browser}) => {
                const retrySelectorButton = await browser.$(
                    getTestSectionByNameSelector('test with image comparison diff') +
                    '//button[@data-qa="retry-switcher"]'
                );

                await hideHeader(browser);
                await hideScreenshots(browser);

                await retrySelectorButton.assertView('retry-selector');
            });

            it('should display 3 images', async ({browser}) => {
                for (const imageStatus of ['Expected', 'Actual', 'Diff']) {
                    const imageElement = await browser.$(
                        getTestSectionByNameSelector('test with image comparison diff') +
                        getImageSectionSelector(imageStatus) +
                        '//img'
                    );

                    // If the image wasn't loaded successfully, it will be displayed as broken image icon and have naturalWidth 0
                    const naturalWidth = await imageElement.getProperty('width');

                    expect(naturalWidth).toBeGreaterThan(0);
                }
            });

            it('should not display error info', async ({browser}) => {
                for (const field of ['message', 'name', 'stack']) {
                    const errorMessage = await browser.$(
                        getTestSectionByNameSelector('test with image comparison diff') +
                        getTestStateByNameSelector('header') +
                        getElementWithTextSelector('span', field) + '/..'
                    );

                    await expect(errorMessage).not.toBeDisplayed();
                }
            });
        });

        describe('Test with no reference image', function() {
            it('should have pink retry selector', async ({browser}) => {
                const retrySelectorButton = await browser.$(
                    getTestSectionByNameSelector('test without screenshot') +
                    '//button[@data-qa="retry-switcher"]'
                );

                await hideHeader(browser);
                await hideScreenshots(browser);
                await browser.execute(() => {
                    window.scrollTo(0, 10000);
                });

                await retrySelectorButton.assertView('retry-selector');
            });

            it('should display error message, name and stack', async ({browser}) => {
                const parentElement = await browser.$(
                    getTestSectionByNameSelector('test without screenshot') +
                    getTestStateByNameSelector('header') + '/..'
                );

                for (const field of ['message', 'name', 'stack']) {
                    const errorMessage = await parentElement.$(getElementWithTextSelector('span', field) + '/..');

                    await expect(errorMessage).toBeDisplayed();
                }
            });

            it('should display actual screenshot', async ({browser}) => {
                const imageElement = await browser.$(
                    getTestSectionByNameSelector('test without screenshot') +
                    '//' + getSpoilerByNameSelector('header') +
                    '//img'
                );

                const naturalWidth = await imageElement.getProperty('width');

                expect(naturalWidth).toBeGreaterThan(0);
            });
        });

        describe('Test with error', function() {
            it('should have red retry selector', async ({browser}) => {
                const retrySelectorButton = await browser.$(
                    getTestSectionByNameSelector('test with long error message') +
                    '//button[@data-qa="retry-switcher"]'
                );

                await hideHeader(browser);
                await hideScreenshots(browser);

                await retrySelectorButton.assertView('retry-selector');
            });

            it('should display error message, name and stack', async ({browser}) => {
                for (const field of ['message', 'name', 'stack']) {
                    const errorMessage = await browser.$(
                        getTestSectionByNameSelector('test with long error message') +
                        getElementWithTextSelector('span', field) + '/..'
                    );

                    await expect(errorMessage).toBeDisplayed();
                }
            });

            if (process.env.TOOL === 'testplane') {
                it('should show message without ansi markup', async ({browser}) => {
                    const expectedErrorText = 'expect(received).toMatchObject(expected)';
                    const testElem = await browser.$(getTestSectionByNameSelector('failed test with ansi markup'));

                    const errorText = await testElem.$('.tab .error__item.details__summary').getText();

                    assert.equal(errorText, `message: ${expectedErrorText}`);
                });
            }
        });

        describe('Test with successful assertView and error', () => {
            // eslint-disable-next-line no-undef
            testplane.only.in('chrome');
            it('should display error message, name and stack', async ({browser}) => {
                const parentElement = await browser.$(
                    getTestSectionByNameSelector('test with successful assertView and error')
                );

                for (const field of ['message', 'name', 'stack']) {
                    const errorMessage = await parentElement.$(getElementWithTextSelector('span', field) + '/..');

                    await expect(errorMessage).toBeDisplayed();
                }
            });
        });
    });
});
