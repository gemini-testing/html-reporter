import sinon from 'sinon';
import {assert} from 'chai';

import GeminiSuiteAdapter from 'lib/suite-adapter/gemini-suite-adapter';

describe('gemini suite adapter', () => {
    const sandbox = sinon.sandbox.create();

    afterEach(() => sandbox.restore());

    it('should return suite skip reason', () => {
        const suite = {skipComment: 'some-reason'};

        const geminiSuiteAdapter = new GeminiSuiteAdapter(suite);

        assert.equal(geminiSuiteAdapter.skipComment, 'some-reason');
    });

    it('should resolve absolute suite url', () => {
        const forBrowser = sandbox.stub();
        forBrowser.withArgs('bro1').returns({
            getAbsoluteUrl: sandbox.stub().withArgs('/some/url').returns('http://expected.url/some/url')
        });
        const config = {forBrowser};

        const geminiSuiteAdapter = new GeminiSuiteAdapter({url: '/some/url'}, config);

        assert.equal(geminiSuiteAdapter.getUrl({browserId: 'bro1'}), 'http://expected.url/some/url');
    });

    it('should resolve absolute suite url using passed base host', () => {
        const forBrowser = sandbox.stub();
        forBrowser.withArgs('bro1').returns({
            getAbsoluteUrl: sandbox.stub().withArgs('/some/url').returns('http://expected.url/some/url')
        });
        const config = {forBrowser};

        const geminiSuiteAdapter = new GeminiSuiteAdapter({url: '/some/url'}, config);

        assert.equal(geminiSuiteAdapter.getUrl({browserId: 'bro1', baseHost: 'http://base.url'}), 'http://base.url/some/url');
    });

    it('should return full url', () => {
        const geminiSuiteAdapter = new GeminiSuiteAdapter({fullUrl: 'some/full/url'});

        assert.equal(geminiSuiteAdapter.fullUrl, 'some/full/url');
    });

    ['fullUrl', 'path', 'file', 'fullName'].forEach((field) => {
        it(`should return ${field} from suite`, () => {
            const geminiSuiteAdapter = new GeminiSuiteAdapter({[field]: 'some-value'});

            assert.equal(geminiSuiteAdapter[field], 'some-value');
        });
    });
});
