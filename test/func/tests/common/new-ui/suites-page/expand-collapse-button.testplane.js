if (process.env.TOOL === 'testplane') {
    describe(process.env.TOOL || 'Default', () => {
        describe('New UI', () => {
            describe('Suites page', () => {
                describe('Expand/collapse suites tree button', () => {
                    it('should offer to collapse by default', async ({browser}) => {
                        const menuButton = await browser.$('[data-qa="tree-show"]');

                        const classNames = (await menuButton.getAttribute('class')).split(' ');
                        await expect(classNames).toContain('gn-composite-bar-item_current');
                    });

                    it('should offer to expand when collapsed using button', async ({browser}) => {
                        const menuButton = await browser.$('[data-qa="tree-collapse"]');
                        await menuButton.click();

                        const classNames = (await menuButton.getAttribute('class')).split(' ');
                        await expect(classNames).toContain('gn-composite-bar-item_current');
                    });

                    it('should offer to expand when collapsed manually', async ({browser}) => {
                        const gutterHandle = await browser.$('[data-qa="split-view-gutter-handle"]');

                        await browser.action('pointer')
                            .move({origin: gutterHandle})
                            .down()
                            .move({x: 0, y: 0, origin: 'viewport'})
                            .up()
                            .perform();

                        await browser.pause(500);

                        const menuButton = await browser.$('[data-qa="tree-collapse"]');
                        const classNames = (await menuButton.getAttribute('class')).split(' ');
                        await expect(classNames).toContain('gn-composite-bar-item_current');
                    });
                });

                it('section sizes should be preserved after page reload', async ({browser}) => {
                    const gutterHandle = await browser.$('[data-qa="split-view-gutter-handle"]');

                    await browser.action('pointer')
                        .move({origin: gutterHandle})
                        .down()
                        .move({x: 200, y: 0, origin: 'pointer'})
                        .up()
                        .perform();

                    const suitesTreeBefore = await browser.$('[data-qa="suites-tree-card"]');
                    const sizeBefore = await suitesTreeBefore.getSize();

                    await browser.refresh();

                    const suitesTreeAfter = await browser.$('[data-qa="suites-tree-card"]');
                    const sizeAfter = await suitesTreeAfter.getSize();

                    expect(sizeBefore).toEqual(sizeAfter);
                });
            });
        });
    });
}
