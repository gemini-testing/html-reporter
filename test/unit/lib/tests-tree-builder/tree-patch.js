'use strict';

const {createTreePatch, snapshotTree} = require('lib/tests-tree-builder/tree-patch');

describe('tree patch', () => {
    it('should include only added, removed and changed nodes', () => {
        const tree = {
            suites: {
                byId: {
                    unchanged: {id: 'unchanged', hash: 'h1', name: 'unchanged', parentId: null, root: true, suitePath: ['unchanged']},
                    removed: {id: 'removed', hash: 'h2', name: 'removed', parentId: null, root: true, suitePath: ['removed']}
                },
                byHash: {},
                allIds: ['unchanged', 'removed'],
                allRootIds: ['unchanged', 'removed']
            },
            browsers: {byId: {}, allIds: []},
            results: {byId: {}, allIds: []},
            images: {byId: {}, allIds: []}
        };
        const snapshot = snapshotTree(tree);

        delete tree.suites.byId.removed;
        tree.suites.byId.added = {id: 'added', hash: 'h3', name: 'added', parentId: null, root: true, suitePath: ['added']};
        tree.suites.allIds = ['unchanged', 'added'];
        tree.suites.allRootIds = ['added', 'unchanged'];

        const patch = createTreePatch(snapshot, tree);

        assert.deepEqual(patch.suites.addedIds, ['added']);
        assert.deepEqual(patch.suites.removedIds, ['removed']);
        assert.deepEqual(patch.affectedRootIds, ['added', 'removed']);
        assert.deepEqual(patch.affectedSuiteIds, ['added', 'removed']);
        assert.deepEqual(Object.keys(patch.suites.byId), ['added']);
        assert.deepEqual(patch.suites.allRootIds, ['added', 'unchanged']);
        assert.deepEqual(patch.browsers.byId, {});
    });

    it('should not inspect or include nodes outside the passed scope', () => {
        const tree = {
            suites: {
                byId: {
                    affected: {id: 'affected', hash: 'h1', name: 'affected', parentId: null, root: true, suitePath: ['affected']},
                    untouched: {id: 'untouched', hash: 'h2', name: 'untouched', parentId: null, root: true, suitePath: ['untouched']}
                },
                byHash: {}, allIds: ['affected', 'untouched'], allRootIds: ['affected', 'untouched']
            },
            browsers: {byId: {}, allIds: []},
            results: {byId: {}, allIds: []},
            images: {byId: {}, allIds: []}
        };
        const scope = {suites: new Set(['affected']), browsers: new Set(), results: new Set(), images: new Set()};
        const snapshot = snapshotTree(tree, scope);

        tree.suites.byId.affected.name = 'changed';
        tree.suites.byId.untouched.name = 'also changed';
        const patch = createTreePatch(snapshot, tree, scope);

        assert.deepEqual(Object.keys(patch.suites.byId), ['affected']);
    });
});
