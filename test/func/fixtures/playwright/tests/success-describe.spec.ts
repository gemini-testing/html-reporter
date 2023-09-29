import {test, expect} from '@playwright/test';

test.describe('success describe', () => {
    test('successfully passed test', async ({page, baseURL}) => {
        await page.goto(baseURL as string);
    });

    // test('test with screenshot', async ({page, baseURL}) => {
    //     await page.goto(baseURL as string);
    //
    //     await expect(page.locator('header')).toHaveScreenshot('header.png');
    // });
});
