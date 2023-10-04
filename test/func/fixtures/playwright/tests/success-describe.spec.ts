import {test} from '@playwright/test';

test.describe('success describe', () => {
    test('successfully passed test', async ({page, baseURL}) => {
        await page.goto(baseURL as string);
    });
});
