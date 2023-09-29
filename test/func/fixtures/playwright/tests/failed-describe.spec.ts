import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';
import {test, expect} from '@playwright/test';

test.describe('failed describe', () => {
    test('successfully passed test', async ({page, baseURL}) => {
        await page.goto(baseURL as string);
    });

    test('test without screenshot', async ({page, baseURL}) => {
        await page.goto(baseURL as string);

        const screenshotPath = path.resolve(__dirname, 'screens/failed-describe-test-without-screenshot/chromium/header.png');
        if (fs.existsSync(screenshotPath)) {
            await fsPromises.rm(screenshotPath);
        }
        await expect(page.locator('header')).toHaveScreenshot('header.png');
    });

    test('test with image comparison diff', async ({page, baseURL}) => {
        await page.goto(baseURL as string);

        await expect(page.locator('header')).toHaveScreenshot('header.png');
    });

    test('test with long error message', async () => {
        throw new Error(`long_error_message ${'0123456789'.repeat(20)}\n message content`);
    });

    test('test skipped at the end', async ({page, baseURL}) => {
        await page.goto(baseURL as string);

        test.skip(true, 'foo-bar');
    });

    test.skip('test skipped', async ({page, baseURL}) => {
        await page.goto(baseURL as string);
    });
});
