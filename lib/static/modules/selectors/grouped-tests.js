import {createSelector} from 'reselect';
import {getGroupTestsByKey} from './view';
import {parseGroupTestsByKey} from '../utils';

export const getParsedGroupTestsByKey = createSelector(
    getGroupTestsByKey,
    (groupTestsByKey) => groupTestsByKey ? parseGroupTestsByKey(groupTestsByKey) : []
);
