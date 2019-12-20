'use strict';
import {parseQuery, getUrlWithQuery} from 'lib/static/modules/query-params';

describe('lib/static/modules/query-params', () => {
    describe('parseQuery', () => {
        it('returns empty query object when no query params exist', () => {
            const query = parseQuery('http://localhost/');

            assert.deepStrictEqual(query, {});
        });

        it('parses specified view-related values', () => {
            const query = parseQuery('http://localhost/?' + [
                'browser=safari',
                'browser=firefox',
                'testNameFilter=test',
                'retryIndex=10',
                'viewMode=all',
                'expand=none',
                'groupByError=true',
                'abc=111'
            ].join('&'), {
                filteredBrowsers: {type: 'array', param: 'browser'},
                testNameFilter: {type: 'string'},
                retryIndex: {type: 'number'},
                viewMode: {type: 'string'},
                expand: {type: 'string'},
                groupByError: {type: 'boolean'}
            });

            assert.deepStrictEqual(query, {
                filteredBrowsers: ['safari', 'firefox'],
                testNameFilter: 'test',
                retryIndex: 10,
                viewMode: 'all',
                expand: 'none',
                groupByError: true
            });
        });
    });

    describe('getUrlWithQuery', () => {
        it('returns original url when query is empty', () => {
            const url = getUrlWithQuery('http://localhost/?abc=111', {});

            assert.strictEqual(url, 'http://localhost/?abc=111');
        });

        it('returns url with the added query params', () => {
            const url = getUrlWithQuery('http://localhost/?abc=111', {
                browser: ['safari', 'firefox'],
                testNameFilter: 'test',
                retryIndex: 10,
                viewMode: 'all',
                expand: 'none',
                groupByError: true
            });

            assert.strictEqual(url, 'http://localhost/?abc=111&' + [
                'browser=safari',
                'browser=firefox',
                'testNameFilter=test',
                'retryIndex=10',
                'viewMode=all',
                'expand=none',
                'groupByError=true'
            ].join('&'));
        });
    });
});
