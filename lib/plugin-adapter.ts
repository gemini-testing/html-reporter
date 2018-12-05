import _ from 'lodash';
import Promise from 'bluebird';
import { ITestTool, TestAdapterType } from 'typings/test-adapter';
import { IOptions } from 'typings/options';
import { IOptions as IOptionsHermione } from 'typings/hermione';
const parseConfig = require('./config');
const ReportBuilderFactory = require('./report-builder-factory');
const utils = require('./server-utils');
const cliCommands = require('./cli-commands');

Promise.promisifyAll(require('fs-extra'));

type PrepareDataType = (
    hermione: ITestTool,
    reporterBuilder: TestAdapterType
) => Promise<any>;

type PrepareImagesType = (
    hermione: ITestTool,
    pluginConfig: IOptionsHermione,
    reporterBuilder: TestAdapterType
) => Promise<any>;

module.exports = class PluginAdapter {
    protected _config: IOptions;

    static create(tool: ITestTool, opts: IOptions, toolName: string) {
        return new this(tool, opts, toolName);
    }

    constructor(
        protected _tool: ITestTool,
        opts: IOptions,
        protected _toolName: string
    ) {
        this._config = parseConfig(opts);
    }

    isEnabled() {
        return this._config.enabled;
    }

    addCliCommands() {
        _.values(cliCommands).forEach((command: string) => {
            this._tool.on(this._tool.events.CLI, (commander: any) => {
                require(`./cli-commands/${command}`)(commander, this._config, this._tool);
                commander.prependListener(`command:${command}`, () => this._run = _.noop);
            });
        });

        return this;
    }

    init(
        prepareData: PrepareDataType,
        prepareImages: PrepareImagesType
    ) {
        this._tool.on(this._tool.events.INIT, () => this._run(prepareData, prepareImages));

        return this;
    }

    _run(
        prepareData: PrepareDataType,
        prepareImages: PrepareImagesType
    ) {
        const reportBuilder = ReportBuilderFactory.create(this._toolName, this._tool, this._config);
        const generateReport = Promise
            .all([
                prepareData(this._tool, reportBuilder),
                prepareImages(this._tool, this._config, reportBuilder)
            ])
            .then(() => reportBuilder.save())
            .then(utils.logPathToHtmlReport)
            .catch(utils.logError);

        const endRunnerEvent = this._tool.events.RUNNER_END || this._tool.events.END_RUNNER;

        this._tool.on(endRunnerEvent, () => generateReport);
    }
};
