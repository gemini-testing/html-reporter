'use strict';
import {getViewQuery} from 'lib/static/modules/custom-queries';
import viewModes from 'lib/constants/view-modes';
import {COLLAPSE_ALL} from 'lib/constants/expand-modes';

describe('lib/static/modules/query-params', () => {
    describe('getViewQuery', () => {
        it('returns initial query object when no query params exist', () => {
            const query = getViewQuery('');

            assert.deepStrictEqual(query, {
                filteredBrowsers: []
            });
        });

        it('parses specified view-related values', () => {
            const query = getViewQuery([
                'browser=safari%20browser',
                'browser=firefox:23',
                'testNameFilter=test name',
                'retryIndex=10',
                'viewMode=all',
                'expand=none',
                'abc=111'
            ].join('&'));

            assert.deepStrictEqual(query, {
                filteredBrowsers: [
                    {id: 'safari browser', versions: []},
                    {id: 'firefox', versions: ['23']}
                ],
                testNameFilter: 'test name',
                retryIndex: 10,
                viewMode: viewModes.ALL,
                expand: COLLAPSE_ALL
            });
        });
    });
});
