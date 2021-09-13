import {parseQuery, appendQuery} from 'lib/static/modules/query-params';
import viewModes from 'lib/constants/view-modes';
import {COLLAPSE_ALL} from 'lib/constants/expand-modes';

describe('lib/static/modules/query-params', () => {
    describe('parseQuery', () => {
        it('should return empty query object when no query params exist', () => {
            const query = parseQuery('');

            assert.deepStrictEqual(query, {});
        });

        it('should parse specified query', () => {
            const query = parseQuery([
                'browser=safari',
                'browser=firefox',
                'testNameFilter=test',
                'retryIndex=10',
                'viewMode=all',
                `expand=${COLLAPSE_ALL}`,
                'groupByError=true',
                'abc=111'
            ].join('&'));

            assert.deepStrictEqual(query, {
                browser: ['safari', 'firefox'],
                testNameFilter: 'test',
                retryIndex: 10,
                viewMode: viewModes.ALL,
                expand: COLLAPSE_ALL,
                groupByError: true,
                abc: 111
            });
        });

        it('should properly parse deep values', () => {
            const query = parseQuery([
                'a=10',
                'a=100',
                'a=1000'
            ].join('&'));

            assert.deepStrictEqual(query, {
                a: [10, 100, 1000]
            });
        });

        it('should handle query produced by appendQuery', () => {
            const url = appendQuery('http://localhost/?abc=111', {
                browser: ['safari', 'firefox'],
                testNameFilter: 'test',
                retryIndex: 10,
                viewMode: viewModes.ALL,
                expand: COLLAPSE_ALL,
                groupByError: true
            });

            const {search} = new URL(url);

            const query = parseQuery(search);

            assert.deepStrictEqual(query, {
                browser: ['safari', 'firefox'],
                testNameFilter: 'test',
                retryIndex: 10,
                viewMode: viewModes.ALL,
                expand: COLLAPSE_ALL,
                groupByError: true,
                abc: 111
            });
        });

        it('should parse old-fashioned array format', () => {
            const query = parseQuery('browser=firefox&browser=safari');

            assert.deepStrictEqual(query, {
                browser: ['firefox', 'safari']
            });
        });

        it('should handle leading question mark', () => {
            const query = parseQuery('?a=10');

            assert.deepStrictEqual(query, {a: 10});
        });
    });

    describe('appendQuery', () => {
        it('should return original url when query is empty', () => {
            const url = appendQuery('http://localhost/?abc=111', {});

            assert.strictEqual(url, 'http://localhost/?abc=111');
        });

        it('should return url with the added query params', () => {
            const url = appendQuery('http://localhost/?abc=111', {
                browser: ['safari', 'firefox'],
                testNameFilter: 'test',
                retryIndex: 10,
                viewMode: viewModes.ALL,
                expand: COLLAPSE_ALL,
                groupByError: true
            });

            assert.strictEqual(url, 'http://localhost/?abc=111&' + [
                'browser=safari',
                'browser=firefox',
                'testNameFilter=test',
                'retryIndex=10',
                `viewMode=${viewModes.ALL}`,
                `expand=${COLLAPSE_ALL}`,
                'groupByError=true'
            ].join('&'));
        });
    });
});
