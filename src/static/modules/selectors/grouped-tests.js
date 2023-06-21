import {createSelector} from 'reselect';
import {getKeyToGroupTestsBy} from './view';
import {parseKeyToGroupTestsBy} from '../utils';

export const getParsedKeyToGroupTestsBy = createSelector(
    getKeyToGroupTestsBy,
    (keyToGroupTestsBy) => keyToGroupTestsBy ? parseKeyToGroupTestsBy(keyToGroupTestsBy) : []
);
