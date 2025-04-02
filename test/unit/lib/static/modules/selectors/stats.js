const {getStatsFilteredByBrowsers} = require('lib/static/modules/selectors/stats');

describe('stats selectors', () => {
    describe('getStatsFilteredByBrowsers', () => {
        const stats = {
            all: {
                total: 40,
                passed: 20,
                failed: 10,
                skipped: 10,
                retries: 30
            },
            perBrowser: {
                bro1: {
                    ver1: {failed: 1, passed: 1},
                    ver2: {failed: 1, passed: 1}
                },
                bro2: {
                    ver1: {failed: 1, passed: 1},
                    ver2: {failed: 1, passed: 1}
                },
                bro3: {
                    ver1: {failed: 1, passed: 1},
                    ver2: {failed: 1, passed: 1},
                    ver3: {failed: 1, passed: 1}
                }
            }
        };

        it('should return correct statistics when it is not filtered', () => {
            const view = {filteredBrowsers: []};

            const filteredStats = getStatsFilteredByBrowsers({stats, view});

            assert.deepEqual(filteredStats, {
                total: 40,
                passed: 20,
                failed: 10,
                skipped: 10,
                retries: 30
            });
        });

        it('should return correct statistics for one filtered browser', () => {
            const view = {filteredBrowsers: [{id: 'bro1'}]};

            const filteredStats = getStatsFilteredByBrowsers({stats, view});

            assert.deepEqual(filteredStats, {
                passed: 2,
                failed: 2
            });
        });

        it('should return correct statistics for several filtered browsers', () => {
            const view = {filteredBrowsers: [{id: 'bro1'}, {id: 'bro2'}]};

            const filteredStats = getStatsFilteredByBrowsers({stats, view});

            assert.deepEqual(filteredStats, {
                passed: 4,
                failed: 4
            });
        });

        it('should return correct statistics corresponding to versions', () => {
            const view = {
                filteredBrowsers: [
                    {id: 'bro1', versions: ['ver1', 'ver2']},
                    {id: 'bro2', versions: ['ver1']}
                ]
            };

            const filteredStats = getStatsFilteredByBrowsers({stats, view});

            assert.deepEqual(filteredStats, {
                passed: 3,
                failed: 3
            });
        });
    });
});
