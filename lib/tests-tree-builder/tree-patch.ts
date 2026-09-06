import type {Tree, TreeBrowser, TreeImage, TreeSuite, TreeTestResult} from './base';

export interface TreeCollectionPatch<T> {
    addedIds: string[];
    removedIds: string[];
    byId: Record<string, T>;
}

export interface TreePatch {
    performance?: {
        id: number;
        serverStartedAt: number;
        serverCompletedAt: number;
    };
    affectedRootIds: string[];
    affectedSuiteIds: string[];
    suites: TreeCollectionPatch<TreeSuite> & {
        allRootIds: string[];
    };
    browsers: TreeCollectionPatch<TreeBrowser>;
    results: TreeCollectionPatch<TreeTestResult>;
    images: TreeCollectionPatch<TreeImage>;
}

interface CollectionSnapshot {
    ids: Set<string>;
    serializedById: Record<string, string>;
}

export interface TreeSnapshot {
    suites: CollectionSnapshot;
    browsers: CollectionSnapshot;
    results: CollectionSnapshot;
    images: CollectionSnapshot;
}

export interface TreePatchScope {
    suites: Set<string>;
    browsers: Set<string>;
    results: Set<string>;
    images: Set<string>;
}

const snapshotCollection = <T>(byId: Record<string, T>, scope?: Set<string>): CollectionSnapshot => {
    const entries = scope
        ? [...scope].flatMap(id => byId[id] ? [[id, byId[id]] as [string, T]] : [])
        : Object.entries(byId);

    return {
        ids: new Set(entries.map(([id]) => id)),
        serializedById: Object.fromEntries(entries.map(([id, node]) => [id, JSON.stringify(node)]))
    };
};

export const snapshotTree = (tree: Tree, scope?: TreePatchScope): TreeSnapshot => ({
    suites: snapshotCollection(tree.suites.byId, scope?.suites),
    browsers: snapshotCollection(tree.browsers.byId, scope?.browsers),
    results: snapshotCollection(tree.results.byId, scope?.results),
    images: snapshotCollection(tree.images.byId, scope?.images)
});

const createCollectionPatch = <T>(snapshot: CollectionSnapshot, byId: Record<string, T>, allIds: string[], scope?: Set<string>): TreeCollectionPatch<T> => {
    const candidateIds = scope ? [...new Set([...snapshot.ids, ...scope])] : allIds;
    const addedIds = candidateIds.filter(id => byId[id] && !snapshot.ids.has(id));
    const removedIds = [...snapshot.ids].filter(id => !byId[id]);
    const changedById = Object.fromEntries(candidateIds.flatMap((id) => {
        const node = byId[id];

        return node && (!snapshot.ids.has(id) || snapshot.serializedById[id] !== JSON.stringify(node))
            ? [[id, node]]
            : [];
    }));

    return {addedIds, removedIds, byId: changedById};
};

export const createTreePatch = (snapshot: TreeSnapshot, tree: Tree, scope?: TreePatchScope): TreePatch => {
    const suites = createCollectionPatch(snapshot.suites, tree.suites.byId, tree.suites.allIds, scope?.suites);
    const changedSuites = Object.values(suites.byId);
    const removedSuites = suites.removedIds.map(id => JSON.parse(snapshot.suites.serializedById[id]) as TreeSuite);
    const affectedSuiteIds = new Set<string>();

    [...changedSuites, ...removedSuites].forEach((suite) => {
        let currentSuite: TreeSuite | undefined = suite;
        while (currentSuite) {
            affectedSuiteIds.add(currentSuite.id);
            const parentId: string | null = currentSuite.parentId;
            const serializedParent: string | undefined = parentId ? snapshot.suites.serializedById[parentId] : undefined;
            currentSuite = parentId
                ? tree.suites.byId[parentId] ?? (serializedParent ? JSON.parse(serializedParent) as TreeSuite : undefined)
                : undefined;
        }
    });

    return {
        affectedRootIds: [...new Set([...changedSuites, ...removedSuites].map(suite => suite.suitePath[0]))],
        affectedSuiteIds: [...affectedSuiteIds],
        suites: {...suites, allRootIds: tree.suites.allRootIds},
        browsers: createCollectionPatch(snapshot.browsers, tree.browsers.byId, tree.browsers.allIds, scope?.browsers),
        results: createCollectionPatch(snapshot.results, tree.results.byId, tree.results.allIds, scope?.results),
        images: createCollectionPatch(snapshot.images, tree.images.byId, tree.images.allIds, scope?.images)
    };
};
