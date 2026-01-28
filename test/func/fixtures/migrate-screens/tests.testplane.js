describe('visual checks', function() {
    it('successful assertView', async ({browser}) => {
        await browser.url('https://example.com');

        await browser.assertView('message', 'div');
    });

    it('failed assertView due to design changes and should not be migrated', async ({browser}) => {
        await browser.url('https://ya.ru');

        await browser.assertView('message', '.search3__input-wrapper');
    });

    it('failed assertView 1 due to fractional pixel difference in testplane v9 and should be migrated', async ({browser}) => {
        await browser.url('https://ya.ru');

        await browser.assertView('message', '.search3__input-wrapper');
    });

    it('failed assertView 2 due to fractional pixel difference in testplane v9 and should be migrated', async ({browser}) => {
        await browser.url('https://ya.ru');

        await browser.assertView('message', '.search3__input-wrapper');
    });
});
