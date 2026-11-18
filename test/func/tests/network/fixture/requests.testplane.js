'use strict';

const assert = require('node:assert/strict');

beforeEach(async ({browser}) => {
    await browser.url('/');
});

it('captures a request', async ({browser}) => {
    await browser.execute(async () => {
        const response = await fetch('/echo', {
            method: 'POST',
            headers: {'X-Fixture-Account': 'fixture secret'},
            body: 'fixture payload'
        });
        document.body.textContent = await response.text();
    });
    assert.equal(await browser.$('body').getText(), 'received fixture payload');
});

describe('retention', () => {
    it('passes', async ({browser}) => {
        await browser.execute(async () => (await fetch('/attempt/pass')).text());
    });

    it('fails', async ({browser, attempt}) => {
        await browser.execute(async marker => (await fetch(marker)).text(), `/attempt/${attempt}`);
        assert.fail('intentional fixture failure');
    });
});
