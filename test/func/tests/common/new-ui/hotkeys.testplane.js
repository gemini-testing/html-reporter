if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Hotkeys', () => {
                describe('Navigation hotkeys', () => {
                    it('should navigate to Visual Checks page with "v" key', async ({browser}) => {
                        const suitesPageTitle = await browser.$('[data-qa="sidebar-title"]');
                        await expect(suitesPageTitle).toHaveText('Suites');

                        await browser.keys('v');

                        const visualChecksTitle = await browser.$('[data-qa="sidebar-title"]');
                        await expect(visualChecksTitle).toHaveText('Visual Checks');
                    });

                    it('should navigate to Suites page with "s" key', async ({browser}) => {
                        const menuItem = await browser.$('[data-qa="visual-checks-page-menu-item"]');
                        await menuItem.click();

                        const visualChecksTitle = await browser.$('[data-qa="sidebar-title"]');
                        await expect(visualChecksTitle).toHaveText('Visual Checks');

                        await browser.keys('s');

                        const suitesPageTitle = await browser.$('[data-qa="sidebar-title"]');
                        await expect(suitesPageTitle).toHaveText('Suites');
                    });

                    it('should toggle tree sidebar with "t" key', async ({browser}) => {
                        const suitesTreeCard = await browser.$('[data-qa="suites-tree-card"]');
                        const initialSize = await suitesTreeCard.getSize();

                        await browser.keys('t');

                        await browser.waitUntil(async () => {
                            const size = await suitesTreeCard.getSize();
                            return size.width < 10;
                        });

                        await browser.keys('t');

                        await browser.waitUntil(async () => {
                            const size = await suitesTreeCard.getSize();
                            return size.width === initialSize.width;
                        });
                    });

                    it('should toggle hotkeys panel with "mod+/" key', async ({browser}) => {
                        await browser.keys(['Control', '/']);

                        const panel = await browser.$('[data-qa="aside-panel-title"]');
                        await expect(panel).toHaveText('Keyboard Shortcuts');

                        await browser.keys(['Control', '/']);

                        await expect(panel).not.toBeDisplayed();
                    });

                    it('should toggle info panel with "i" key', async ({browser}) => {
                        await browser.keys('i');

                        const panel = await browser.$('[data-qa="aside-panel-title"]');
                        await expect(panel).toHaveText('Info');

                        await browser.keys('i');

                        await expect(panel).not.toBeDisplayed();
                    });

                    it('should toggle settings panel with "," key', async ({browser}) => {
                        await browser.keys(',');

                        const panel = await browser.$('[data-qa="aside-panel-title"]');
                        await expect(panel).toHaveText('Settings');

                        await browser.keys(',');

                        await expect(panel).not.toBeDisplayed();
                    });
                });

                describe('Tree navigation hotkeys', () => {
                    beforeEach(async ({browser}) => {
                        const firstTest = await browser.$('[data-qa="tree-view-item"]*=chrome');
                        await firstTest.click();

                        await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();
                    });

                    it('should navigate between tests with ArrowUp and ArrowDown', async ({browser}) => {
                        await browser.keys('ArrowDown');

                        const counter = await browser.$('[data-qa="suite-title-counter"]');
                        await expect(counter).toHaveText(/^2\//);

                        await browser.keys('ArrowUp');

                        await expect(counter).toHaveText(/^1\//);
                    });

                    it('should navigate between attempts with ArrowLeft and ArrowRight', async ({browser}) => {
                        let activeAttempt = await browser.$('[data-qa="retry-switcher"][data-qa-active="true"]');
                        await expect(activeAttempt).toHaveText('2');

                        await browser.keys('ArrowLeft');

                        activeAttempt = await browser.$('[data-qa="retry-switcher"][data-qa-active="true"]');
                        await expect(activeAttempt).toHaveText('1');

                        await browser.keys('ArrowRight');

                        activeAttempt = await browser.$('[data-qa="retry-switcher"][data-qa-active="true"]');
                        await expect(activeAttempt).toHaveText('2');
                    });
                });

                describe('Visual Checks navigation hotkeys', () => {
                    beforeEach(async ({browser}) => {
                        const menuItem = await browser.$('[data-qa="visual-checks-page-menu-item"]');
                        await menuItem.click();

                        await browser.$('[data-qa="suite-title-counter"]').waitForDisplayed();
                    });

                    it('should navigate to next image with ArrowDown', async ({browser}) => {
                        const counter = await browser.$('[data-qa="suite-title-counter"]');
                        await expect(counter).toHaveText(/^1\//);

                        await browser.keys('ArrowDown');

                        await expect(counter).toHaveText(/^2\//);
                    });

                    it('should navigate to previous image with ArrowUp', async ({browser}) => {
                        await browser.keys('ArrowDown');

                        const counter = await browser.$('[data-qa="suite-title-counter"]');
                        await expect(counter).toHaveText(/^2\//);

                        await browser.keys('ArrowUp');

                        await expect(counter).toHaveText(/^1\//);
                    });

                    it('should navigate to Suites page with "g" key', async ({browser}) => {
                        const treeViewItems = await browser.$$('[data-qa="tree-view-item"]');
                        if (treeViewItems.length > 1) {
                            await treeViewItems[1].click();
                        }

                        await browser.keys('g');

                        const suitesTitle = await browser.$('[data-qa="sidebar-title"]');
                        await expect(suitesTitle).toHaveText('Suites');
                    });
                });

                describe('Search hotkeys', () => {
                    it('should focus search with "mod+k"', async ({browser}) => {
                        const searchInput = await browser.$('[data-qa="name-filter"] input');

                        const initiallyFocused = await searchInput.isFocused();
                        expect(initiallyFocused).toBe(false);

                        await browser.keys(['Control', 'k']);

                        const nowFocused = await searchInput.isFocused();
                        expect(nowFocused).toBe(true);
                    });

                    it('should clear search with Escape', async ({browser}) => {
                        const searchInput = await browser.$('[data-qa="name-filter"] input');

                        await searchInput.setValue('test');

                        const valueBeforeEscape = await searchInput.getValue();
                        expect(valueBeforeEscape).toBe('test');

                        await browser.keys('Escape');

                        await browser.waitUntil(async () => {
                            return (await searchInput.getValue()) === '';
                        });
                    });

                    it('should blur search with Escape when empty', async ({browser}) => {
                        const searchInput = await browser.$('[data-qa="name-filter"] input');

                        await browser.keys(['Control', 'k']);
                        await expect(await searchInput.isFocused()).toBe(true);

                        await browser.keys('Escape');

                        await browser.waitUntil(async () => {
                            return !(await searchInput.isFocused());
                        });
                    });
                });

                describe('Edge cases', () => {
                    it('should not trigger navigation hotkeys when typing in search', async ({browser}) => {
                        const searchInput = await browser.$('[data-qa="name-filter"] input');
                        await searchInput.click();

                        await searchInput.setValue('v');

                        const suitesTitle = await browser.$('[data-qa="sidebar-title"]');
                        await expect(suitesTitle).toHaveText('Suites');

                        const value = await searchInput.getValue();
                        expect(value).toBe('v');
                    });

                    it('should allow mod+k even when search is focused', async ({browser}) => {
                        const searchInput = await browser.$('[data-qa="name-filter"] input');
                        await searchInput.click();
                        await searchInput.setValue('test');

                        await browser.keys(['Control', 'k']);

                        const isFocused = await searchInput.isFocused();
                        expect(isFocused).toBe(true);
                    });
                });
            });
        });
    });
}
