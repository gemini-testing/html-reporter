'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const parseConfig = require('./config');
const ReportBuilderFactory = require('./report-builder-factory');
const utils = require('./server-utils');
const cliCommands = require('./cli-commands');
const PluginApi = require('./plugin-api');

module.exports = class PluginAdapter {
    static create(tool, opts, toolName) {
        return new this(tool, opts, toolName);
    }

    constructor(tool, opts, toolName) {
        this._tool = tool;
        this._toolName = toolName;
        this._config = parseConfig(opts);
    }

    isEnabled() {
        return this._config.enabled;
    }

    addApi() {
        this._tool.htmlReporter = new PluginApi();

        return this;
    }

    addCliCommands() {
        _.values(cliCommands).forEach((command) => {
            this._tool.on(this._tool.events.CLI, (commander) => {
                require(`./cli-commands/${command}`)(commander, this._config, this._tool);
                commander.prependListener(`command:${command}`, () => this._run = _.noop);
            });
        });

        return this;
    }

    init(prepareData, prepareImages) {
        this._tool.on(this._tool.events.INIT, () => this._run(prepareData, prepareImages));

        return this;
    }

    _run(prepareData, prepareImages = _.noop) {
        if (!this._tool.isWorker()) { // TODO: check if this breaks anything
            const reportBuilder = ReportBuilderFactory.create(this._toolName, this._tool, this._config);
            const generateReportPromises = [prepareData(this._tool, reportBuilder, this._config),
                prepareImages(this._tool, reportBuilder, this._config)];

            let reportBuilderSqlite;

            if (this._config.saveFormat === 'sqlite') {
                reportBuilderSqlite = ReportBuilderFactory.create(this._toolName, this._tool, this._config, true);
                generateReportPromises.push(prepareData(this._tool, reportBuilderSqlite, this._config),
                    prepareImages(this._tool, reportBuilderSqlite, this._config));
            }

            const generateReport = Promise
                .all(generateReportPromises)
                .then(() => reportBuilderSqlite ? reportBuilderSqlite.save() : null)
                .then(() => reportBuilder.save())
                .then(utils.logPathToHtmlReport)
                .catch(utils.logError);

            const endRunnerEvent = this._tool.events.RUNNER_END || this._tool.events.END_RUNNER;

            this._tool.on(endRunnerEvent, () => generateReport);

        }
    }
};
