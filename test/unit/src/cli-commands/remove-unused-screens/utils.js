'use strict';

const _ = require('lodash');
const fs = require('fs-extra');
const proxyquire = require('proxyquire');
const inquirer = require('inquirer');

const {SUCCESS, ERROR} = require('lib/constants/test-statuses');
const {stubTool, stubConfig, mkState} = require('test/unit/utils');

describe('lib/cli-commands/remove-unused-screens/utils', () => {
    const sandbox = sinon.sandbox.create();
    let utils, fgMock;

    const mkTestCollection_ = (testsTree = {}) => {
        return {
            eachTest: (cb) => {
                Object.keys(testsTree).forEach((browserId) => cb(testsTree[browserId], browserId));
            }
        };
    };

    const stubTest_ = (opts) => {
        return mkState(_.defaults(opts, {id: () => 'default-id'}));
    };

    const mkTestsTreeFromDb_ = ({
        browsersById = {},
        resultsById = {},
        imagesById = {}
    } = {}) => {
        return {
            browsers: {byId: browsersById, allIds: Object.keys(browsersById)},
            results: {byId: resultsById},
            images: {byId: imagesById}
        };
    };

    const mkHermione_ = (testCollection = mkTestCollection_(), config = stubConfig(), htmlReporter) => {
        const hermione = stubTool(config);
        hermione.readTests.resolves(testCollection);
        hermione.htmlReporter = htmlReporter || {
            getTestsTreeFromDatabase: sandbox.stub().returns(mkTestsTreeFromDb_())
        };

        return hermione;
    };

    beforeEach(() => {
        sandbox.stub(fs, 'readdir').resolves([]);
        sandbox.stub(fs, 'remove').resolves();

        fgMock = sandbox.stub().resolves([]);

        utils = proxyquire('lib/cli-commands/remove-unused-screens/utils', {
            'fast-glob': fgMock
        });
    });

    afterEach(() => sandbox.restore());

    describe('"getTestsFromFs" method', () => {
        let getScreenshotPath;

        beforeEach(() => {
            getScreenshotPath = sandbox.stub().returns('/default/path/*.png');
        });

        it('should read all hermione tests silently', async () => {
            const hermione = mkHermione_();

            await utils.getTestsFromFs(hermione);

            assert.calledOnceWith(hermione.readTests, [], {silent: true});
        });

        it('should add test tests tree with its screen info', async () => {
            const test = stubTest_({fullTitle: () => 'first'});
            const testCollection = mkTestCollection_({bro: test});
            getScreenshotPath.withArgs(test, '*').returns('/ref/path/*.png');
            const config = stubConfig({browsers: {bro: {getScreenshotPath}}});

            fgMock.withArgs('/ref/path/*.png').resolves(['/ref/path/1.png', '/ref/path/2.png']);

            const hermione = mkHermione_(testCollection, config);

            const tests = await utils.getTestsFromFs(hermione);

            assert.lengthOf(Object.keys(tests.byId), 1);
            assert.deepEqual(
                tests.byId['first bro'],
                {
                    ...test,
                    screenPaths: ['/ref/path/1.png', '/ref/path/2.png'],
                    screenPattern: '/ref/path/*.png'
                }
            );
        });

        it('should collect all screen patterns in tests tree', async () => {
            const test1 = stubTest_({fullTitle: () => 'first'});
            const test2 = stubTest_({fullTitle: () => 'second'});
            const testCollection = mkTestCollection_({bro1: test1, bro2: test2});
            getScreenshotPath
                .withArgs(test1, '*').returns('/ref/path-1/*.png')
                .withArgs(test2, '*').returns('/ref/path-2/*.png');

            const config = stubConfig({browsers: {bro1: {getScreenshotPath}, bro2: {getScreenshotPath}}});
            const hermione = mkHermione_(testCollection, config);

            const tests = await utils.getTestsFromFs(hermione);

            assert.deepEqual(tests.screenPatterns, ['/ref/path-1/*.png', '/ref/path-2/*.png']);
        });

        it('should return the number of unique tests', async () => {
            const test1 = stubTest_({fullTitle: () => 'first'});
            const test2 = stubTest_({fullTitle: () => 'second'});
            const testCollection = mkTestCollection_({bro1: test1, bro2: test1, bro3: test2, bro4: test2});

            const config = stubConfig({browsers: {
                bro1: {getScreenshotPath}, bro2: {getScreenshotPath},
                bro3: {getScreenshotPath}, bro4: {getScreenshotPath}
            }});
            const hermione = mkHermione_(testCollection, config);

            const tests = await utils.getTestsFromFs(hermione);

            assert.equal(tests.count, 2);
        });

        it('should return the list of unique browsers', async () => {
            const test = stubTest_({fullTitle: () => 'first'});
            const testCollection = mkTestCollection_({bro1: test, bro2: test, bro3: test});

            const config = stubConfig({browsers: {
                bro1: {getScreenshotPath}, bro2: {getScreenshotPath}, bro3: {getScreenshotPath}
            }});
            const hermione = mkHermione_(testCollection, config);

            const tests = await utils.getTestsFromFs(hermione);

            assert.deepEqual(tests.browserIds, new Set(['bro1', 'bro2', 'bro3']));
        });
    });

    describe('"findScreens" method', () => {
        it('should find screens on fs by passed patterns', async () => {
            const screenPatterns = ['/path-1/*.png', '/path-2/*.png'];
            fgMock
                .withArgs('/path-1/*.png').resolves(['/path-1/a.png', '/path-1/b.png'])
                .withArgs('/path-2/*.png').resolves(['/path-2/c.png']);

            const foundScreens = await utils.findScreens(screenPatterns);

            assert.deepEqual(foundScreens, ['/path-1/a.png', '/path-1/b.png', '/path-2/c.png']);
        });

        it('should return uniq screens', async () => {
            const screenPatterns = ['/path-1/*.png', '/**/*.png'];
            fgMock
                .withArgs('/path-1/*.png').resolves(['/path-1/a.png'])
                .withArgs('/**/*.png').resolves(['/path-1/a.png']);

            const foundScreens = await utils.findScreens(screenPatterns);

            assert.deepEqual(foundScreens, ['/path-1/a.png']);
        });
    });

    describe('"askQuestion" method', () => {
        beforeEach(() => {
            sandbox.stub(inquirer, 'prompt').resolves({});
        });

        describe('cli option of skip questions is true', () => {
            it('should not ask user any questions', async () => {
                await utils.askQuestion({default: false}, {skipQuestions: true});

                assert.notCalled(inquirer.prompt);
            });

            it('should return default answer', async () => {
                const result = await utils.askQuestion({default: false}, {skipQuestions: true});

                assert.isFalse(result);
            });
        });

        describe('cli option of skip questions is false', () => {
            it('should ask user passed question', async () => {
                const question = {name: 'someQuestion'};

                await utils.askQuestion(question);

                assert.calledOnceWith(inquirer.prompt, [question]);
            });

            it('should return user answer on passed question', async () => {
                const question = {name: 'someQuestion'};
                inquirer.prompt.withArgs([question]).resolves({someQuestion: true});

                const result = await utils.askQuestion(question);

                assert.isTrue(result);
            });
        });
    });

    describe('"identifyOutdatedScreens" method', () => {
        it('should return screen paths not matched on passed patterns', () => {
            sandbox.stub(process, 'cwd').returns('/root');
            const screenPaths = ['/root/test1/a.png', '/root/test2/b.png'];
            const screenPatterns = ['/root/test1/*.png'];

            const outdatedScreens = utils.identifyOutdatedScreens(screenPaths, screenPatterns);

            assert.deepEqual(outdatedScreens, ['test2/b.png']);
        });
    });

    describe('"identifyUnusedScreens" method', () => {
        const mkTestsTreeFromFs_ = (opts = {}) => {
            return {byId: {}, screenPatterns: [], ...opts};
        };

        const mkBrowser = (opts) => {
            const browser = _.defaults(opts, {
                id: 'default-bro-id',
                resultIds: []
            });

            return {[browser.id]: browser};
        };

        const mkResult = (opts) => {
            const result = _.defaults(opts, {
                id: 'default-result-id',
                status: SUCCESS,
                imageIds: []
            });

            return {[result.id]: result};
        };

        const mkImage = (opts) => {
            const image = _.defaults(opts, {
                id: 'default-image-id',
                stateName: 'default-state-name'
            });

            return {[image.id]: image};
        };

        it('should return unused screens for successful tests', () => {
            const browsersById = mkBrowser({id: 'test1 bro1', resultIds: ['res-1', 'res-2']});
            const resultsById = {
                ...mkResult({id: 'res-1', status: ERROR, imageIds: []}),
                ...mkResult({id: 'res-2', status: SUCCESS, imageIds: ['img-1']})
            };
            const imagesById = mkImage({id: 'img-1', stateName: 'a'});
            const dbTree = mkTestsTreeFromDb_({browsersById, resultsById, imagesById});

            const hermione = mkHermione_();
            hermione.htmlReporter.getTestsTreeFromDatabase.withArgs('/report/sqlite.db').returns(dbTree);

            const fsTestsTree = mkTestsTreeFromFs_({
                byId: {
                    'test1 bro1': {screenPaths: ['/test1/a.png', '/test1/b.png']}
                }
            });

            const unusedScreens = utils.identifyUnusedScreens(
                fsTestsTree,
                {hermione, mergedDbPath: '/report/sqlite.db'}
            );

            assert.deepEqual(unusedScreens, ['/test1/b.png']);
        });

        it('should not return unused screens for not successful tests', () => {
            const browsersById = mkBrowser({id: 'test1 bro1', resultIds: ['res-1']});
            const resultsById = mkResult({id: 'res-1', status: ERROR, imageIds: ['img-1']});
            const imagesById = mkImage({id: 'img-1', stateName: 'a'});
            const dbTree = mkTestsTreeFromDb_({browsersById, resultsById, imagesById});

            const hermione = mkHermione_();
            hermione.htmlReporter.getTestsTreeFromDatabase.withArgs('/report/sqlite.db').returns(dbTree);

            const fsTestsTree = mkTestsTreeFromFs_({
                byId: {
                    'test1 bro1': {screenPaths: ['/test1/a.png', '/test1/b.png']}
                }
            });

            const unusedScreens = utils.identifyUnusedScreens(
                fsTestsTree,
                {hermione, mergedDbPath: '/report/sqlite.db'}
            );

            assert.isEmpty(unusedScreens);
        });
    });

    describe('"removeScreens" method', () => {
        it('should remove passed screens', async () => {
            fs.readdir.withArgs('/path-1').resolves(['some-file']);
            fs.readdir.withArgs('/path-2').resolves(['some-file']);

            await utils.removeScreens(['/path-1/a.png', '/path-2/b.png']);

            assert.calledTwice(fs.remove);
            assert.calledWith(fs.remove, '/path-1/a.png');
            assert.calledWith(fs.remove, '/path-2/b.png');
        });

        it('should not remove not empty directories after remove screenshot', async () => {
            fs.readdir.withArgs('/path').resolves(['some-file']);

            await utils.removeScreens(['/path/a.png']);

            assert.neverCalledWith(fs.remove, '/path');
        });

        it('should remove empty directories after remove screenshot', async () => {
            fs.readdir.withArgs('/path/test').resolves([]);
            fs.readdir.withArgs('/path').resolves(['some-file']);

            await utils.removeScreens(['/path/test/a.png']);

            assert.calledWith(fs.remove, '/path/test');
        });

        it('should remote directories which contains only hidden files after remove screenshot', async () => {
            fs.readdir.withArgs('/path/test').resolves(['.hidden-file']);
            fs.readdir.withArgs('/path').resolves(['some-file']);

            await utils.removeScreens(['/path/test/a.png']);

            assert.calledWith(fs.remove, '/path/test');
        });
    });
});
