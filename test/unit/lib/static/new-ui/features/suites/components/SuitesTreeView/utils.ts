import {expect} from 'chai';
import 'chai-deep-equal-ignore-undefined';

import {
    buildTreeBottomUp,
    EntitiesContext,
    formatEntityToTreeNodeData,
    getTitlePath,
    sortTreeNodes
} from '@/static/new-ui/features/suites/components/SuitesPage/utils';

import {
    BrowserEntity,
    ResultEntity,
    SortDirection,
    SuiteEntity,
    TreeEntity,
    TreeViewMode
} from '@/static/new-ui/types/store';
import {
    addBrowserToTree, addGroupToTree,
    addImageToTree,
    addResultToTree,
    addSuiteToTree,
    mkBrowserEntity,
    mkEmptyTree,
    mkGroupEntity,
    mkImageEntityFail,
    mkImageEntitySuccess,
    mkResultEntity,
    mkSuiteEntityLeaf,
    mkTreeNodeData
} from '../../../../../utils';
import {EntityType, TreeNode} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {
    SORT_BY_DURATION,
    SORT_BY_FAILED_RETRIES,
    SORT_BY_NAME, SORT_BY_START_TIME,
    SORT_BY_TESTS_COUNT
} from '@/static/constants/sort-tests';
import {TestStatus} from '@/constants';

describe('getTitlePath', () => {
    const suite1 = mkSuiteEntityLeaf('suite-1');
    const suite2 = mkSuiteEntityLeaf('suite-2');
    const mockSuites: Record<string, SuiteEntity> = {
        [suite1.id]: suite1,
        [suite2.id]: suite2
    };

    it('should return empty array when entity is undefined', () => {
        const result = getTitlePath(mockSuites, undefined);

        expect(result).to.deep.equal([]);
    });

    it('should return suitePath for a SuiteEntity', () => {
        const suite = suite1;

        const result = getTitlePath(mockSuites, suite);

        expect(result).to.deep.equal(suite.suitePath);
    });

    it('should construct path for a BrowserEntity', () => {
        const suite = suite1;
        const browser = mkBrowserEntity('suite-1', {parentId: suite.id});

        const result = getTitlePath(mockSuites, browser);

        expect(result).to.deep.equal([...suite.suitePath, browser.name]);
    });

    it('should handle browser with non-existent parent suite', () => {
        const browser: BrowserEntity = mkBrowserEntity('suite-1', {parentId: 'unknown-parent'});

        const result = getTitlePath(mockSuites, browser);

        expect(result).to.deep.equal([browser.name]);
    });
});

describe('formatEntityToTreeNodeData', () => {
    const baseContext: EntitiesContext = {
        browsers: {},
        browsersState: {},
        results: {},
        images: {},
        suites: {},
        groups: {},
        treeViewMode: TreeViewMode.Tree,
        currentSortDirection: SortDirection.Asc,
        currentSortExpression: SORT_BY_NAME
    };

    describe('when formatting Suite entity', () => {
        const suite = mkSuiteEntityLeaf('test');

        it('should format suite entity correctly', () => {
            const result = formatEntityToTreeNodeData(
                baseContext,
                suite,
                'tree-node-id'
            );

            expect(result).to.deep.equal({
                id: 'tree-node-id',
                entityType: EntityType.Suite,
                entityId: suite.id,
                title: [suite.name],
                status: suite.status,
                tags: [],
                parentData: undefined
            });
        });
    });

    describe('when formatting Group entity', () => {
        const group = mkGroupEntity('group-1', {
            key: 'url',
            label: 'example.com'
        });

        it('should format group entity correctly', () => {
            const result = formatEntityToTreeNodeData(
                baseContext,
                group,
                group.id
            );

            expect(result).to.deep.equal({
                id: group.id,
                entityType: EntityType.Group,
                entityId: group.id,
                prefix: 'url:',
                title: ['example.com'],
                status: null,
                tags: []
            });
        });
    });

    describe('when formatting Browser entity', () => {
        let tree: TreeEntity;
        let suite: SuiteEntity;
        let browser: BrowserEntity;
        let result: ResultEntity;
        let context: EntitiesContext;

        beforeEach(() => {
            tree = mkEmptyTree();

            suite = mkSuiteEntityLeaf('suite-1');
            addSuiteToTree({tree, suite});

            browser = mkBrowserEntity('browser-1', {parentId: suite.id});
            addBrowserToTree({tree, browser});

            result = mkResultEntity('result-1', {parentId: browser.id});
            addResultToTree({tree, result});

            context = {
                ...baseContext,
                suites: tree.suites.byId,
                browsers: tree.browsers.byId,
                results: tree.results.byId,
                images: tree.images.byId
            };
        });

        it('should format browser entity in tree mode', () => {
            const treeNodeData = formatEntityToTreeNodeData(
                context,
                browser,
                browser.id
            );

            expect(treeNodeData).to.deepEqualIgnoreUndefined({
                id: browser.id,
                entityType: EntityType.Browser,
                entityId: browser.id,
                title: [browser.name],
                status: TestStatus.SUCCESS,
                images: [],
                tags: []
            });
        });

        it('should format browser entity in flat mode', () => {
            const flatContext = {
                ...context,
                treeViewMode: TreeViewMode.List
            };

            const treeNodeData = formatEntityToTreeNodeData(
                flatContext,
                browser,
                browser.id
            );

            expect(treeNodeData.title).to.deep.equal([...suite.suitePath, browser.name]);
        });

        describe('when handling images', () => {
            it('should add failed images from last retry', () => {
                const imageOfFirstRetry = mkImageEntitySuccess('image-1', {parentId: result.id});
                addImageToTree({tree, image: imageOfFirstRetry});

                const lastResult = mkResultEntity('last-result', {parentId: browser.id, attempt: 1});
                addResultToTree({tree, result: lastResult});

                const successImage = mkImageEntitySuccess('image-1', {parentId: lastResult.id});
                addImageToTree({tree, image: successImage});
                const failedImage = mkImageEntityFail('image-2', {parentId: lastResult.id});
                addImageToTree({tree, image: failedImage});

                const treeNodeData = formatEntityToTreeNodeData(
                    context,
                    browser,
                    browser.id
                );

                expect(treeNodeData.images).to.deep.equal([failedImage]);
            });
        });

        describe('when handling errors', () => {
            it('should handle error information correctly', () => {
                const lastResult = mkResultEntity('last-result', {
                    parentId: browser.id,
                    attempt: 1,
                    status: TestStatus.ERROR,
                    error: {
                        name: 'TestError',
                        message: 'Test failed',
                        stack: 'Error: Test failed\n    at test.js:1:1\n    at main.js:5:5\n    at index.js:10:10'
                    }
                });
                addResultToTree({tree, result: lastResult});

                const result = formatEntityToTreeNodeData(
                    context,
                    browser,
                    browser.id
                );

                expect(result.errorTitle).to.equal('TestError');
                expect(result.errorStack).to.equal(
                    'Error: Test failed\n    at test.js:1:1\n    at main.js:5:5'
                );
            });
        });

        describe('when handling skip reason', () => {
            it('should include skip reason', () => {
                const lastResult = mkResultEntity('last-result', {
                    parentId: browser.id,
                    attempt: 1,
                    status: TestStatus.SKIPPED,
                    skipReason: 'Some skip reason'
                });
                addResultToTree({tree, result: lastResult});

                const result = formatEntityToTreeNodeData(
                    context,
                    browser,
                    browser.id
                );

                expect(result.skipReason).to.equal('Some skip reason');
            });
        });
    });
});

describe('buildTreeBottomUp', () => {
    const baseContext: EntitiesContext = {
        browsers: {},
        browsersState: {},
        results: {},
        images: {},
        suites: {},
        groups: {},
        treeViewMode: TreeViewMode.Tree,
        currentSortDirection: SortDirection.Asc,
        currentSortExpression: SORT_BY_NAME
    };

    let entitiesTree: TreeEntity;
    let suite: SuiteEntity;
    let browser: BrowserEntity;
    let result: ResultEntity;
    let context: EntitiesContext;

    beforeEach(() => {
        entitiesTree = mkEmptyTree();

        suite = mkSuiteEntityLeaf('suite-1', {suitePath: ['Suite 1']});
        addSuiteToTree({tree: entitiesTree, suite});

        browser = mkBrowserEntity('browser-1', {parentId: suite.id});
        addBrowserToTree({tree: entitiesTree, browser});

        result = mkResultEntity('result-1', {parentId: browser.id});
        addResultToTree({tree: entitiesTree, result});

        context = {
            ...baseContext,
            suites: entitiesTree.suites.byId,
            browsers: entitiesTree.browsers.byId,
            results: entitiesTree.results.byId,
            images: entitiesTree.images.byId,
            browsersState: entitiesTree.browsers.stateById
        };
    });

    describe('in Tree mode', () => {
        it('should create empty tree when no entities provided', () => {
            const tree = buildTreeBottomUp(baseContext, []);

            expect(tree).to.deepEqualIgnoreUndefined({
                isRoot: true
            });
        });

        it('should build simple tree with a single suite', () => {
            const tree = buildTreeBottomUp(context, [suite]);

            const expectedTree = {
                isRoot: true,
                children: [
                    {
                        data: {
                            entityType: EntityType.Suite,
                            entityId: suite.id
                        }
                    }
                ]
            };
            expect(tree).to.containSubset(expectedTree);
        });

        it('should build tree with nested suites', () => {
            const parentSuite = mkSuiteEntityLeaf('parent', {suitePath: ['parent']});
            addSuiteToTree({tree: entitiesTree, suite: parentSuite});

            const childSuite = mkSuiteEntityLeaf('child', {
                parentId: parentSuite.id,
                suitePath: ['parent', 'child']
            });
            addSuiteToTree({tree: entitiesTree, suite: childSuite});

            const tree = buildTreeBottomUp(context, [childSuite]);

            const expectedTree = {
                isRoot: true,
                children: [{
                    data: {
                        entityType: EntityType.Suite,
                        entityId: parentSuite.id
                    },
                    children: [{
                        data: {
                            entityType: EntityType.Suite,
                            entityId: childSuite.id
                        }
                    }]
                }]
            };
            expect(tree).to.containSubset(expectedTree);
        });

        it('should build tree with browser nodes', () => {
            const tree = buildTreeBottomUp(context, [browser]);

            const expectedTree = {
                isRoot: true,
                children: [{
                    data: {
                        entityType: EntityType.Suite,
                        entityId: suite.id
                    },
                    children: [{
                        data: {
                            entityType: EntityType.Browser,
                            entityId: browser.id
                        }
                    }]
                }]
            };
            expect(tree).to.containSubset(expectedTree);
        });

        it('should skip hidden browsers', () => {
            const hiddenBrowser = mkBrowserEntity('hidden-browser', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: hiddenBrowser});

            entitiesTree.browsers.stateById[hiddenBrowser.id].shouldBeShown = false;

            const tree = buildTreeBottomUp(context, [browser, hiddenBrowser]);

            const expectedTree = {
                isRoot: true,
                children: [{
                    data: {
                        entityType: EntityType.Suite,
                        entityId: suite.id,
                        title: [suite.name]
                    },
                    children: [{
                        data: {
                            entityType: EntityType.Browser,
                            entityId: hiddenBrowser.id,
                            title: [hiddenBrowser.name]
                        }
                    }]
                }]
            };
            expect(tree).to.not.containSubset(expectedTree);
        });

        it('should handle multiple entities at same level', () => {
            const newSuite = mkSuiteEntityLeaf('new-suite');
            addSuiteToTree({tree: entitiesTree, suite: newSuite});

            const browser1 = mkBrowserEntity('chrome', {parentId: newSuite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser1});
            const result1 = mkResultEntity('new-result-1', {parentId: browser1.id});
            addResultToTree({tree: entitiesTree, result: result1});

            const browser2 = mkBrowserEntity('firefox', {parentId: newSuite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser2});
            const result2 = mkResultEntity('new-result-1', {parentId: browser2.id});
            addResultToTree({tree: entitiesTree, result: result2});

            const tree = buildTreeBottomUp(context, [browser, browser1, browser2]);

            const expectedTree = {
                isRoot: true,
                children: [{
                    data: {
                        entityType: EntityType.Suite,
                        entityId: suite.id
                    },
                    children: [{
                        data: {
                            entityType: EntityType.Browser,
                            entityId: browser.id
                        }
                    }]
                }, {
                    data: {
                        entityType: EntityType.Suite,
                        entityId: newSuite.id
                    },
                    children: [{
                        data: {
                            entityType: EntityType.Browser,
                            entityId: browser1.id
                        }
                    }, {
                        data: {
                            entityType: EntityType.Browser,
                            entityId: browser2.id
                        }
                    }]
                }]
            };
            expect(tree).to.containSubset(expectedTree);
        });

        it('should use provided root data', () => {
            const rootData: TreeNode['data'] = {
                id: 'some-group',
                entityType: EntityType.Group,
                entityId: 'some-group',
                title: ['Group'],
                status: TestStatus.SUCCESS,
                tags: []
            };

            const tree = buildTreeBottomUp(context, [browser], rootData);

            const expectedTree = {
                data: {
                    entityType: EntityType.Group,
                    entityId: rootData.entityId
                },
                children: [{
                    data: {
                        entityType: EntityType.Suite,
                        entityId: suite.id
                    },
                    children: [{
                        data: {
                            entityType: EntityType.Browser,
                            entityId: browser.id
                        }
                    }]
                }]
            };
            expect(tree).to.containSubset(expectedTree);
        });
    });

    describe('in List mode', () => {
        it('should create flat structure', () => {
            context.treeViewMode = TreeViewMode.List;

            const newBrowser = mkBrowserEntity('new-browser', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: newBrowser});
            const newResult = mkResultEntity('new-result', {parentId: newBrowser.id});
            addResultToTree({tree: entitiesTree, result: newResult});

            const tree = buildTreeBottomUp(context, [browser, newBrowser]);

            const expectedTree = {
                isRoot: true,
                children: [{
                    data: {
                        entityType: EntityType.Browser,
                        entityId: browser.id
                    }
                }, {
                    data: {
                        entityType: EntityType.Browser,
                        entityId: newBrowser.id
                    }
                }]
            };
            expect(tree).to.containSubset(expectedTree);
        });
    });

    describe('caching behavior', () => {
        it('should reuse existing nodes for same entity', () => {
            const tree = buildTreeBottomUp(context, [browser, browser, suite]);

            expect(tree.children).to.have.length(1);
            expect(tree.children?.[0].children).to.have.length(1);
        });
    });
});

describe('sortTreeNodes', () => {
    const baseContext: EntitiesContext = {
        browsers: {},
        browsersState: {},
        results: {},
        images: {},
        suites: {},
        groups: {},
        treeViewMode: TreeViewMode.Tree,
        currentSortDirection: SortDirection.Asc,
        currentSortExpression: SORT_BY_NAME
    };

    let entitiesTree: TreeEntity;
    let suite: SuiteEntity;
    let context: EntitiesContext;

    beforeEach(() => {
        entitiesTree = mkEmptyTree();

        suite = mkSuiteEntityLeaf('suite-1', {suitePath: ['Suite 1']});
        addSuiteToTree({tree: entitiesTree, suite});

        context = {
            ...baseContext,
            groups: entitiesTree.groups.byId,
            suites: entitiesTree.suites.byId,
            browsers: entitiesTree.browsers.byId,
            results: entitiesTree.results.byId,
            images: entitiesTree.images.byId,
            browsersState: entitiesTree.browsers.stateById
        };
    });

    describe('Sorting by name', () => {
        it('should sort nodes alphabetically in ascending order', () => {
            const nodes: TreeNode[] = [
                {data: mkTreeNodeData('B')},
                {data: mkTreeNodeData('A')},
                {data: mkTreeNodeData('C')}
            ];

            context.currentSortExpression = SORT_BY_NAME;

            const sorted = sortTreeNodes(context, nodes);

            expect(sorted.map(n => n.data.title[0])).to.deep.equal(['A', 'B', 'C']);
        });

        it('should sort nodes alphabetically in descending order', () => {
            const nodes: TreeNode[] = [
                {data: mkTreeNodeData('B')},
                {data: mkTreeNodeData('A')},
                {data: mkTreeNodeData('C')}
            ];

            context.currentSortExpression = SORT_BY_NAME;
            context.currentSortDirection = SortDirection.Desc;

            const sorted = sortTreeNodes(context, nodes);

            expect(sorted.map(n => n.data.title[0])).to.deep.equal(['C', 'B', 'A']);
        });
    });

    describe('Sorting by failed runs', () => {
        it('should sort nodes by failed runs count', () => {
            const browser1 = mkBrowserEntity('browser1', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser1});
            const result1 = mkResultEntity('result1', {parentId: browser1.id});
            addResultToTree({tree: entitiesTree, result: result1});

            const browser2 = mkBrowserEntity('browser2', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser2});
            const result2 = mkResultEntity('result2', {parentId: browser2.id, status: TestStatus.FAIL});
            addResultToTree({tree: entitiesTree, result: result2});
            const result3 = mkResultEntity('result3', {parentId: browser2.id, status: TestStatus.ERROR});
            addResultToTree({tree: entitiesTree, result: result3});

            const browser3 = mkBrowserEntity('browser3', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser3});
            const result4 = mkResultEntity('result4', {parentId: browser3.id, status: TestStatus.ERROR});
            addResultToTree({tree: entitiesTree, result: result4});

            const nodes: TreeNode[] = [
                {data: mkTreeNodeData('Browser 1', {entityId: browser1.id})},
                {data: mkTreeNodeData('Browser 2', {entityId: browser2.id})},
                {data: mkTreeNodeData('Browser 3', {entityId: browser3.id})}
            ];

            context.currentSortExpression = SORT_BY_FAILED_RETRIES;
            context.currentSortDirection = SortDirection.Desc;

            const sorted = sortTreeNodes(context, nodes);

            expect(sorted.map(n => n.data.entityId)).to.deep.equal(['browser2', 'browser3', 'browser1']);
        });
    });

    describe('Sorting by duration', () => {
        it('should sort nodes by total duration', () => {
            const browser1 = mkBrowserEntity('browser1', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser1});
            const result1 = mkResultEntity('result1', {parentId: browser1.id, duration: 100});
            addResultToTree({tree: entitiesTree, result: result1});

            const browser2 = mkBrowserEntity('browser2', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser2});
            const result2 = mkResultEntity('result2', {parentId: browser2.id, duration: 100});
            addResultToTree({tree: entitiesTree, result: result2});
            const result3 = mkResultEntity('result3', {parentId: browser2.id, duration: 100});
            addResultToTree({tree: entitiesTree, result: result3});

            const browser3 = mkBrowserEntity('browser3', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser3});
            const result4 = mkResultEntity('result4', {parentId: browser3.id, duration: 150});
            addResultToTree({tree: entitiesTree, result: result4});

            const nodes: TreeNode[] = [
                {data: mkTreeNodeData('Browser 1', {entityId: browser1.id})},
                {data: mkTreeNodeData('Browser 2', {entityId: browser2.id})},
                {data: mkTreeNodeData('Browser 3', {entityId: browser3.id})}
            ];

            context.currentSortExpression = SORT_BY_DURATION;
            context.currentSortDirection = SortDirection.Desc;

            const sorted = sortTreeNodes(context, nodes);

            expect(sorted.map(n => n.data.entityId)).to.deep.equal(['browser2', 'browser3', 'browser1']);
        });
    });

    describe('Sorting nested structures', () => {
        it('should sort groups with nested browsers', () => {
            // Creating Group 1, that has 1 test and 1 run.
            const browser1 = mkBrowserEntity('browser1', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser1});
            const result1 = mkResultEntity('result1', {parentId: browser1.id, duration: 100});
            addResultToTree({tree: entitiesTree, result: result1});
            const group1 = mkGroupEntity('group1', {resultIds: [result1.id], browserIds: [browser1.id]});
            addGroupToTree({tree: entitiesTree, group: group1});

            // Creating Group 2, that has 2 tests and 2 runs.
            const browser2 = mkBrowserEntity('browser2', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser2});
            const result2 = mkResultEntity('result2', {parentId: browser2.id, duration: 100});
            addResultToTree({tree: entitiesTree, result: result2});
            const browser3 = mkBrowserEntity('browser3', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser3});
            const result4 = mkResultEntity('result4', {parentId: browser3.id, duration: 150});
            addResultToTree({tree: entitiesTree, result: result4});
            const group2 = mkGroupEntity('group2', {resultIds: [result2.id], browserIds: [browser2.id, browser3.id]});
            addGroupToTree({tree: entitiesTree, group: group2});

            // Creating Group 3, that has 1 test and 2 runs.
            const browser4 = mkBrowserEntity('browser4', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser4});
            const result5 = mkResultEntity('result5', {parentId: browser4.id, duration: 100});
            addResultToTree({tree: entitiesTree, result: result5});
            const result6 = mkResultEntity('result6', {parentId: browser4.id, duration: 100});
            addResultToTree({tree: entitiesTree, result: result6});
            const group3 = mkGroupEntity('group3', {resultIds: [result5.id, result6.id], browserIds: [browser4.id]});
            addGroupToTree({tree: entitiesTree, group: group3});

            const nodes: TreeNode[] = [
                {
                    data: mkTreeNodeData('Group 1', {entityType: EntityType.Group, entityId: group1.id}),
                    children: [{
                        data: mkTreeNodeData('Suite 1', {entityType: EntityType.Suite, entityId: suite.id}),
                        children: [{
                            data: mkTreeNodeData('Browser 1', {entityType: EntityType.Browser, entityId: browser1.id})
                        }]
                    }]
                },
                {
                    data: mkTreeNodeData('Group 2', {entityType: EntityType.Group, entityId: group2.id}),
                    children: [{
                        data: mkTreeNodeData('Suite 1', {entityType: EntityType.Suite, entityId: suite.id}),
                        children: [{
                            data: mkTreeNodeData('Browser 2', {entityType: EntityType.Browser, entityId: browser2.id})
                        }, {
                            data: mkTreeNodeData('Browser 3', {entityType: EntityType.Browser, entityId: browser3.id})
                        }]
                    }]
                },
                {
                    data: mkTreeNodeData('Group 3', {entityType: EntityType.Group, entityId: group3.id}),
                    children: [{
                        data: mkTreeNodeData('Suite 1', {entityType: EntityType.Suite, entityId: suite.id}),
                        children: [{
                            data: mkTreeNodeData('Browser 4', {entityType: EntityType.Browser, entityId: browser4.id})
                        }]
                    }]
                }
            ];

            context.currentSortExpression = SORT_BY_TESTS_COUNT;
            context.currentSortDirection = SortDirection.Desc;

            const sorted = sortTreeNodes(context, nodes);

            expect(sorted.map(n => n.data.entityId)).to.deep.equal(['group2', 'group3', 'group1']);
        });

        it('should sort suites with nested browsers', () => {
            const browser1 = mkBrowserEntity('browser1', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser1});
            const result1 = mkResultEntity('result1', {parentId: browser1.id, timestamp: 100});
            addResultToTree({tree: entitiesTree, result: result1});

            const browser2 = mkBrowserEntity('browser2', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser2});
            const result2 = mkResultEntity('result2', {parentId: browser2.id, timestamp: 10});
            addResultToTree({tree: entitiesTree, result: result2});
            const result3 = mkResultEntity('result3', {parentId: browser2.id, timestamp: 150});
            addResultToTree({tree: entitiesTree, result: result3});

            const browser3 = mkBrowserEntity('browser3', {parentId: suite.id});
            addBrowserToTree({tree: entitiesTree, browser: browser3});
            const result4 = mkResultEntity('result4', {parentId: browser3.id, timestamp: 150});
            addResultToTree({tree: entitiesTree, result: result4});

            const nodes: TreeNode[] = [
                {data: mkTreeNodeData('Browser 1', {entityId: browser1.id})},
                {data: mkTreeNodeData('Browser 2', {entityId: browser2.id})},
                {data: mkTreeNodeData('Browser 3', {entityId: browser3.id})}
            ];

            context.currentSortExpression = SORT_BY_START_TIME;
            context.currentSortDirection = SortDirection.Desc;

            const sorted = sortTreeNodes(context, nodes);

            expect(sorted.map(n => n.data.entityId)).to.deep.equal(['browser3', 'browser1', 'browser2']);
        });
    });
});
