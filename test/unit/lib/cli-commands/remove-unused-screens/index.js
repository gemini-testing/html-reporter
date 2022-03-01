'use strict';

const path = require('path');
const _ = require('lodash');
const fs = require('fs-extra');
const proxyquire = require('proxyquire');
const chalk = require('chalk');
const {DATABASE_URLS_JSON_NAME, LOCAL_DATABASE_NAME} = require('lib/constants/database');
const {stubTool} = require('test/unit/utils');
const {logger} = require('lib/common-utils');

describe('lib/cli-commands/remove-unused-screens', () => {
    const sandbox = sinon.sandbox.create();
    let actionPromise, removeUnusedScreens, getTestsFromFs, findScreens, askQuestion;
    let identifyOutdatedScreens, identifyUnusedScreens, removeScreens, filesizeMock;

    const mkProgram_ = (options = {}) => ({
        command: sinon.stub().returnsThis(),
        description: sinon.stub().returnsThis(),
        option: sinon.stub().returnsThis(),
        on: sinon.stub().returnsThis(),
        options: options,
        action: sinon.stub().callsFake(actionCb => {
            actionPromise = actionCb(options);
        })
    });

    const mkPluginCfg_ = (opts) => _.defaults(opts, {path: 'default-path'});

    const mkHermione_ = (htmlReporter) => {
        const hermione = stubTool();

        hermione.htmlReporter = htmlReporter || {
            downloadDatabases: sandbox.stub().resolves(['/default-path/sqlite.db']),
            mergeDatabases: sandbox.stub().resolves()
        };

        return hermione;
    };

    const mkTestsTreeFromFs_ = (opts = {}) => {
        return {byId: {}, screenPatterns: [], ...opts};
    };

    const removeUnusedScreens_ = async ({
        program = mkProgram_({pattern: ['default/pattern'], skipQuestions: false}),
        pluginConfig = mkPluginCfg_(),
        hermione = mkHermione_()
    } = {}) => {
        removeUnusedScreens(program, pluginConfig, hermione);

        await actionPromise;
    };

    beforeEach(() => {
        sandbox.stub(fs, 'pathExists').resolves(true);
        sandbox.stub(fs, 'move').resolves();
        sandbox.stub(fs, 'stat').resolves({size: 1});
        sandbox.stub(logger, 'log');
        sandbox.stub(logger, 'error');
        sandbox.stub(process, 'exit');

        getTestsFromFs = sandbox.stub().resolves(mkTestsTreeFromFs_());
        findScreens = sandbox.stub().resolves([]);
        askQuestion = sandbox.stub().resolves(true);
        identifyOutdatedScreens = sandbox.stub().returns([]);
        identifyUnusedScreens = sandbox.stub().returns([]);
        removeScreens = sandbox.stub().resolves();

        filesizeMock = sandbox.stub().returns('12345');

        removeUnusedScreens = proxyquire('lib/cli-commands/remove-unused-screens', {
            ora: () => ({start: sandbox.stub(), succeed: sandbox.stub()}),
            filesize: filesizeMock,
            './utils': {getTestsFromFs, findScreens, askQuestion, identifyOutdatedScreens, identifyUnusedScreens, removeScreens}
        });
    });

    afterEach(() => sandbox.restore());

    describe('required option "pattern" is not passed', () => {
        let program;

        beforeEach(() => {
            program = mkProgram_({pattern: []});
        });

        it('should inform user about it', async () => {
            await removeUnusedScreens_({program});

            assert.calledWith(logger.error, sinon.match('option "pattern" is required'));
        });

        it('should exit with code 1', async () => {
            await removeUnusedScreens_({program});

            assert.calledOnceWith(process.exit, 1);
        });
    });

    it('should get tests tree from fs', async () => {
        const hermione = mkHermione_();

        await removeUnusedScreens_({hermione});

        assert.calledOnceWith(getTestsFromFs, hermione);
    });

    it('should inform user about the number of tests read', async () => {
        const testsTreeFromFs = mkTestsTreeFromFs_({
            byId: {a: {}, b: {}, c: {}}
        });
        getTestsFromFs.resolves(testsTreeFromFs);

        await removeUnusedScreens_();

        assert.calledWith(logger.log, `${chalk.green('3')} tests were read`);
    });

    describe('transform user patterns', () => {
        beforeEach(() => {
            sandbox.stub(process, 'cwd').returns('/root');
        });

        it('should resolve pattern by cwd', async () => {
            const program = mkProgram_({pattern: ['ref/pattern-1/*.png']});

            await removeUnusedScreens_({program});

            assert.calledOnceWith(findScreens, ['/root/ref/pattern-1/*.png']);
        });

        it('should add ".png" extension to pattern if it is not passed', async () => {
            const program = mkProgram_({pattern: ['ref/pattern-1']});

            await removeUnusedScreens_({program});

            assert.calledOnceWith(findScreens, ['/root/ref/pattern-1/*.png']);
        });
    });

    it('should find reference images by specified patterns', async () => {
        const pattern = ['/ref/pattern-1/*.png', '/ref/pattern-2/*.png'];
        const program = mkProgram_({pattern});

        await removeUnusedScreens_({program});

        assert.calledOnceWith(findScreens, pattern);
    });

    it('should inform user about the number of reference images found', async () => {
        const program = mkProgram_({pattern: ['ref/pattern-1/*.png']});
        findScreens.resolves(['/ref/pattern-1/img-1.png', '/ref/pattern-1/img-2.png']);

        await removeUnusedScreens_({program});

        assert.calledWith(logger.log, `Found ${chalk.green('2')} reference images`);
    });

    describe('identify outdated images', () => {
        it('should ask user about it', async () => {
            const program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});

            await removeUnusedScreens_({program});

            assert.calledWith(askQuestion,
                sinon.match({message: 'Identify outdated reference images (tests for them are removed)?'}),
                program.options
            );
        });

        it('should not handle outdated images if user say "no"', async () => {
            const program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});
            askQuestion.withArgs(sinon.match({name: 'identifyOutdated'}), program.options).resolves(false);

            await removeUnusedScreens_({program});

            assert.notCalled(identifyOutdatedScreens);
        });

        describe('if user say "yes"', () => {
            let skipQuestions;

            beforeEach(() => {
                skipQuestions = false;
                askQuestion.withArgs(
                    sinon.match({name: 'identifyOutdated'}),
                    sinon.match({skipQuestions})
                ).resolves(true);
            });

            it('should find outdated screens', async () => {
                const screenPatterns = ['/root/broId/testId/*.png'];
                getTestsFromFs.resolves(mkTestsTreeFromFs_({screenPatterns}));

                const program = mkProgram_({pattern: ['broId/**/*.png'], skipQuestions});
                const foundScreenPaths = ['/root/broId/testId/img.png'];
                findScreens.resolves(foundScreenPaths);

                await removeUnusedScreens_({program});

                assert.calledOnceWith(identifyOutdatedScreens, foundScreenPaths, screenPatterns);
            });

            it('should inform user about the number of outdated screens', async () => {
                const screenPatterns = ['/root/broId/testId/*.png'];
                getTestsFromFs.resolves(mkTestsTreeFromFs_({screenPatterns}));

                const program = mkProgram_({pattern: ['broId/**/*.png'], skipQuestions});
                const foundScreenPaths = ['/root/broId/testId/img.png', '/root/broId/outdatedTestId/img.png'];
                findScreens.resolves(foundScreenPaths);

                identifyOutdatedScreens.withArgs(foundScreenPaths, screenPatterns).returns(['/root/broId/outdatedTestId/img.png']);

                await removeUnusedScreens_({program});

                assert.calledWith(logger.log, `Found ${chalk.red('1')} outdated reference images out of ${chalk.bold('2')}`);
            });

            describe('size calculation of outdated images', () => {
                beforeEach(() => {
                    identifyOutdatedScreens.returns(['/root/outdatedTestId/1.png', '/root/outdatedTestId/2.png']);

                    fs.stat.withArgs('/root/outdatedTestId/1.png').resolves({size: 10});
                    fs.stat.withArgs('/root/outdatedTestId/2.png').resolves({size: 20});
                });

                it('should calculate size', async () => {
                    await removeUnusedScreens_();

                    assert.calledOnceWith(filesizeMock, 30);
                });

                it('should inform user about the size of outdated images', async () => {
                    filesizeMock.withArgs(30).returns('30 B');

                    await removeUnusedScreens_();

                    assert.calledWith(logger.log, `Total size of outdated reference images = ${chalk.red('30 B')}`);
                });
            });

            describe('show list of outdated images', () => {
                beforeEach(() => {
                    identifyOutdatedScreens.returns(['/root/outdatedTestId/1.png', '/root/outdatedTestId/2.png']);
                });

                it('should ask user about it', async () => {
                    const program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});

                    await removeUnusedScreens_({program});

                    assert.calledWith(askQuestion,
                        sinon.match({message: 'Show list of outdated reference images? (2 paths)'}),
                        program.options
                    );
                });

                it('should not show list if user say "no"', async () => {
                    const program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});
                    askQuestion.withArgs(sinon.match({name: 'shouldShowList'}), program.options).resolves(false);

                    await removeUnusedScreens_({program});

                    assert.neverCalledWith(logger.log, 'List of outdated reference images');
                });

                it('should show list if user say "yes"', async () => {
                    const program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});
                    askQuestion.withArgs(sinon.match({name: 'shouldShowList'}), program.options).resolves(true);

                    await removeUnusedScreens_({program});

                    assert.calledWith(logger.log, 'List of outdated reference images:'
                        + `\n${chalk.red('/root/outdatedTestId/1.png')}`
                        + `\n${chalk.red('/root/outdatedTestId/2.png')}`
                    );
                });
            });

            describe('remove outdated images', () => {
                it('should ask user about it', async () => {
                    const program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});
                    identifyOutdatedScreens.returns(['/root/outdatedTestId/1.png', '/root/outdatedTestId/2.png']);

                    await removeUnusedScreens_({program});

                    assert.calledWith(askQuestion,
                        sinon.match({message: 'Remove outdated reference images?'}),
                        program.options
                    );
                });

                it('should not remove if user say "no"', async () => {
                    const program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});
                    askQuestion.withArgs(sinon.match({name: 'shouldRemove'}), program.options).resolves(false);
                    identifyOutdatedScreens.returns(['/root/outdatedTestId/1.png', '/root/outdatedTestId/2.png']);

                    await removeUnusedScreens_({program});

                    assert.notCalled(removeScreens);
                });

                it('should remove if user say "yes"', async () => {
                    const outdatedScreens = ['/root/outdatedTestId/1.png', '/root/outdatedTestId/2.png'];
                    identifyOutdatedScreens.returns(outdatedScreens);
                    const program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});
                    askQuestion.withArgs(sinon.match({name: 'shouldRemove'}), program.options).resolves(true);

                    await removeUnusedScreens_({program});

                    assert.calledOnceWith(removeScreens, outdatedScreens);
                });
            });
        });
    });

    describe('identify unused images', () => {
        it('should ask user about it', async () => {
            const program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});

            await removeUnusedScreens_({program});

            assert.calledWith(askQuestion,
                sinon.match({message: sinon.match(/Identify unused reference images?/)}),
                program.options
            );
        });

        it('should not handle unused images if user say "no"', async () => {
            const hermione = mkHermione_();
            const program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});
            askQuestion.withArgs(sinon.match({name: 'identifyUnused'}), program.options).resolves(false);

            await removeUnusedScreens_({hermione, program});

            assert.notCalled(hermione.htmlReporter.downloadDatabases);
        });

        describe('if user say "yes"', () => {
            let hermione, program, pluginConfig;

            beforeEach(() => {
                hermione = mkHermione_();
                program = mkProgram_({pattern: ['some/pattern'], skipQuestions: false});
                pluginConfig = mkPluginCfg_({path: './hermione-report'});

                askQuestion.withArgs(sinon.match({name: 'identifyUnused'}), program.options).resolves(true);
            });

            it('should inform user if report with the result of test run is missing on fs', async () => {
                fs.pathExists.withArgs(pluginConfig.path).resolves(false);

                await removeUnusedScreens_({program, pluginConfig});

                assert.calledWith(logger.error, sinon.match(`Can't find html-report in "${pluginConfig.path}" folder`));
                assert.calledOnceWith(process.exit, 1);
            });

            describe('download databases', () => {
                it('should download from main databaseUrls.json', async () => {
                    const mainDatabaseUrls = path.resolve(pluginConfig.path, DATABASE_URLS_JSON_NAME);

                    await removeUnusedScreens_({hermione, program, pluginConfig});

                    assert.calledOnceWith(hermione.htmlReporter.downloadDatabases, [mainDatabaseUrls], {pluginConfig});
                });

                it(`should inform user if databases were not loaded from "${DATABASE_URLS_JSON_NAME}"`, async () => {
                    const mainDatabaseUrls = path.resolve(pluginConfig.path, DATABASE_URLS_JSON_NAME);
                    hermione.htmlReporter.downloadDatabases.resolves([]);

                    await removeUnusedScreens_({hermione, program, pluginConfig});

                    assert.calledWith(logger.error, sinon.match(`Databases were not loaded from "${mainDatabaseUrls}" file`));
                    assert.calledOnceWith(process.exit, 1);
                });
            });

            describe('merge databases', () => {
                it('should not merge databases if downloaded only main database', async () => {
                    const mainDatabasePath = path.resolve(pluginConfig.path, LOCAL_DATABASE_NAME);
                    hermione.htmlReporter.downloadDatabases.resolves([mainDatabasePath]);

                    await removeUnusedScreens_({hermione, program, pluginConfig});

                    assert.notCalled(hermione.htmlReporter.mergeDatabases);
                });

                it('should merge source databases to main', async () => {
                    const srcDb1 = path.resolve(pluginConfig.path, 'sqlite_1.db');
                    const srcDb2 = path.resolve(pluginConfig.path, 'sqlite_2.db');
                    const mainDatabasePath = path.resolve(pluginConfig.path, LOCAL_DATABASE_NAME);
                    hermione.htmlReporter.downloadDatabases.resolves([mainDatabasePath, srcDb1, srcDb2]);

                    await removeUnusedScreens_({hermione, program, pluginConfig});

                    assert.calledOnceWith(hermione.htmlReporter.mergeDatabases, [srcDb1, srcDb2], pluginConfig.path);
                });

                it('should infrom user about how much databases were merged', async () => {
                    const srcDb1 = path.resolve(pluginConfig.path, 'sqlite_1.db');
                    const srcDb2 = path.resolve(pluginConfig.path, 'sqlite_2.db');
                    const mainDatabasePath = path.resolve(pluginConfig.path, LOCAL_DATABASE_NAME);
                    hermione.htmlReporter.downloadDatabases.resolves([mainDatabasePath, srcDb1, srcDb2]);

                    await removeUnusedScreens_({hermione, program, pluginConfig});

                    assert.calledWith(
                        logger.log,
                        `${chalk.green('2')} databases were merged to ${chalk.green(mainDatabasePath)}`
                    );
                });
            });

            it('should find unused screens', async () => {
                const testsTreeFromFs = mkTestsTreeFromFs_({
                    byId: {a: {}, b: {}, c: {}}
                });
                getTestsFromFs.resolves(testsTreeFromFs);
                const mergedDbPath = path.resolve(pluginConfig.path, LOCAL_DATABASE_NAME);

                await removeUnusedScreens_({hermione, program, pluginConfig});

                assert.calledOnceWith(identifyUnusedScreens, testsTreeFromFs, {hermione, mergedDbPath});
            });

            it('should inform user about the number of unused screens', async () => {
                findScreens.resolves(['/root/usedTestId/img.png', '/root/unusedTestId/img.png']);
                identifyUnusedScreens.returns(['/root/unusedTestId/img.png']);

                await removeUnusedScreens_({hermione, program, pluginConfig});

                assert.calledWith(logger.log, `Found ${chalk.red('1')} unused reference images out of ${chalk.bold('2')}`);
            });

            describe('size calculation of unused images', () => {
                beforeEach(() => {
                    identifyUnusedScreens.returns(['/root/unusedTestId/1.png', '/root/unusedTestId/2.png']);

                    fs.stat.withArgs('/root/unusedTestId/1.png').resolves({size: 10});
                    fs.stat.withArgs('/root/unusedTestId/2.png').resolves({size: 20});
                });

                it('should calculate size', async () => {
                    await removeUnusedScreens_({program});

                    assert.calledOnceWith(filesizeMock, 30);
                });

                it('should inform user about the size of outdated images', async () => {
                    filesizeMock.withArgs(30).returns('30 B');

                    await removeUnusedScreens_({program});

                    assert.calledWith(logger.log, `Total size of unused reference images = ${chalk.red('30 B')}`);
                });
            });

            describe('show list of unused images', () => {
                beforeEach(() => {
                    identifyUnusedScreens.returns(['/root/unusedTestId/1.png', '/root/unusedTestId/2.png']);
                });

                it('should ask user about it', async () => {
                    await removeUnusedScreens_({program});

                    assert.calledWith(askQuestion,
                        sinon.match({message: 'Show list of unused reference images? (2 paths)'}),
                        program.options
                    );
                });

                it('should not show list if user say "no"', async () => {
                    askQuestion.withArgs(sinon.match({name: 'shouldShowList'}), program.options).resolves(false);

                    await removeUnusedScreens_({program});

                    assert.neverCalledWith(logger.log, 'List of unused reference images');
                });

                it('should show list if user say "yes"', async () => {
                    askQuestion.withArgs(sinon.match({name: 'shouldShowList'}), program.options).resolves(true);

                    await removeUnusedScreens_({program});

                    assert.calledWith(logger.log, 'List of unused reference images:'
                        + `\n${chalk.red('/root/unusedTestId/1.png')}`
                        + `\n${chalk.red('/root/unusedTestId/2.png')}`
                    );
                });
            });

            describe('remove unused images', () => {
                it('should ask user about it', async () => {
                    identifyUnusedScreens.returns(['/root/unusedTestId/1.png', '/root/unusedTestId/2.png']);

                    await removeUnusedScreens_({program});

                    assert.calledWith(askQuestion,
                        sinon.match({message: 'Remove unused reference images?'}),
                        program.options
                    );
                });

                it('should not remove if user say "no"', async () => {
                    askQuestion.withArgs(sinon.match({name: 'shouldRemove'}), program.options).resolves(false);
                    identifyUnusedScreens.returns(['/root/unusedTestId/1.png', '/root/unusedTestId/2.png']);

                    await removeUnusedScreens_({program});

                    assert.notCalled(removeScreens);
                });

                it('should remove if user say "yes"', async () => {
                    const unusedScreens = ['/root/unusedTestId/1.png', '/root/unusedTestId/2.png'];
                    identifyUnusedScreens.returns(unusedScreens);
                    askQuestion.withArgs(sinon.match({name: 'shouldRemove'}), program.options).resolves(true);

                    await removeUnusedScreens_({program});

                    assert.calledOnceWith(removeScreens, unusedScreens);
                });
            });
        });
    });
});
