'use strict';
import {parseQuery, appendQuery} from 'lib/static/modules/query-params';

describe('lib/static/modules/query-params', () => {
    describe('parseQuery', () => {
        it('returns empty query object when no query params exist', () => {
            const query = parseQuery('');

            assert.deepStrictEqual(query, {});
        });

        it('parses specified query', () => {
            const query = parseQuery([
                'browser=safari',
                'browser=firefox',
                'testNameFilter=test',
                'retryIndex=10',
                'viewMode=all',
                'expand=none',
                'groupByError=true',
                'abc=111'
            ].join('&'));

            assert.deepStrictEqual(query, {
                browser: ['safari', 'firefox'],
                testNameFilter: 'test',
                retryIndex: 10,
                viewMode: 'all',
                expand: 'none',
                groupByError: true,
                abc: 111
            });
        });

        it('properly parses deep values', () => {
            const query = parseQuery([
                'a=10',
                'a=100',
                'a=1000'
            ].join('&'));

            assert.deepStrictEqual(query, {
                a: [10, 100, 1000]
            });
        });

        it('handles query produced by appendQuery', () => {
            const url = appendQuery('http://localhost/?abc=111', {
                browser: ['safari', 'firefox'],
                testNameFilter: 'test',
                retryIndex: 10,
                viewMode: 'all',
                expand: 'none',
                groupByError: true
            });

            const {search} = new URL(url);

            const query = parseQuery(search);

            assert.deepStrictEqual(query, {
                browser: ['safari', 'firefox'],
                testNameFilter: 'test',
                retryIndex: 10,
                viewMode: 'all',
                expand: 'none',
                groupByError: true,
                abc: 111
            });
        });

        it('parses old-fashioned array format', () => {
            const query = parseQuery('browser=firefox&browser=safari');

            assert.deepStrictEqual(query, {
                browser: ['firefox', 'safari']
            });
        });

        it('handles initial question mark', () => {
            const query = parseQuery('?a=10');
            assert.deepStrictEqual(query, {a: 10});
        });
    });

    describe('appendQuery', () => {
        it('returns original url when query is empty', () => {
            const url = appendQuery('http://localhost/?abc=111', {});

            assert.strictEqual(url, 'http://localhost/?abc=111');
        });

        it('returns url with the added query params', () => {
            const url = appendQuery('http://localhost/?abc=111', {
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
