if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Suites page', () => {
                describe('Common tests', () => {
                    const changeHash = (hash) => {
                        window.location.hash = hash;
                        window.location.reload();
                    };

                    const getHash = async (browser) => {
                        const currentUrl = await browser.getUrl();
                        return currentUrl.split('#')[1];
                    };

                    it('by default open first', async ({browser}) => {
                        await browser.execute(changeHash, '/suites');
                        const titleTestElement = await browser.$('h2');

                        await expect(titleTestElement).toHaveText('failed test with ansi markup');
                        await browser.assertView('body');
                    });

                    it('click to test', async ({browser}) => {
                        const testElement = await browser.$('[data-list-item="failed describe/successfully passed test/chrome"]');
                        await testElement.click();
                        const titleTestElement = await browser.$('h2');

                        await expect(titleTestElement).toHaveText('successfully passed test');
                        await expect(await getHash(browser)).toBe('/suites/failed%20describe%20successfully%20passed%20test%20chrome/1');
                        await browser.assertView('body');
                    });

                    it('open by url', async ({browser}) => {
                        await browser.execute(changeHash, '/suites/failed%20describe%20successfully%20passed%20test%20chrome/1');

                        const titleTestElement = await browser.$('h2');
                        await expect(titleTestElement).toHaveText('successfully passed test');
                        await browser.assertView('body');
                    });

                    it('open screenshot from test and go back', async ({browser}) => {
                        const testElement = await browser.$('[data-list-item="failed describe/test with image comparison diff/chrome"]');
                        await testElement.click();

                        const goToVisualButtonElement = await browser.$('[data-qa="go-visual-button"]');
                        await goToVisualButtonElement.click();

                        await expect(await getHash(browser)).toBe('/visual-checks/failed%20describe%20test%20with%20image%20comparison%20diff%20chrome/1/header');

                        const goToSuitesButtonElement = await browser.$('[data-qa="go-suites-button"]');
                        await goToSuitesButtonElement.click();

                        await expect(await getHash(browser)).toBe('/suites/failed%20describe%20test%20with%20image%20comparison%20diff%20chrome/1/header');

                        const titleTestElement = await browser.$('h2');

                        await expect(titleTestElement).toHaveText('test with image comparison diff');
                        await browser.assertView('body');
                    });
                });
            });
        });
    });
}
