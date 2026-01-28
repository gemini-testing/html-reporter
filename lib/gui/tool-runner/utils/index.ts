export * from './db';
export * from './similar-diff-search';
export * from './update-reference-images';

import {TestRefUpdateData} from '../../../tests-tree-builder/gui';

export const formatId = (hash: string, browserId: string): string => `${hash}/${browserId}`;

export const mkFullTitle = ({suite, state}: Pick<TestRefUpdateData, 'suite' | 'state'>): string => {
    return suite.path.length > 0 ? `${suite.path.join(' ')} ${state.name}` : state.name;
};
