import {createSelector} from 'reselect';
import {isEmpty, keys, flatten, forEach} from 'lodash';
import {getFilteredBrowsers} from './view';

const getStats = (state) => state.stats;

export const getStatsFilteredByBrowsers = createSelector(
    getStats, getFilteredBrowsers,
    (stats, filteredBrowsers) => {
        if (isEmpty(filteredBrowsers) || isEmpty(stats.perBrowser)) {
            return stats.all;
        }

        const resStats = {};
        const rows = filteredBrowsers.map((browserToFilterBy) => {
            const {id, versions} = browserToFilterBy;

            return isEmpty(versions)
                ? keys(stats.perBrowser[id]).map((ver) => stats.perBrowser[id][ver])
                : versions.map((ver) => stats.perBrowser[id][ver]);
        });

        flatten(rows).forEach((stats) => {
            forEach(stats, (value, stat) => {
                resStats[stat] = resStats[stat] === undefined
                    ? value
                    : resStats[stat] + value;
            });
        });

        return resStats;
    }
);
