'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const parseConfig = require('./config');
const ReportBuilderJson = require('./report-builder/report-builder-json');
const ReportBuilderSqlite = require('./report-builder/report-builder-sqlite');
const utils = require('./server-utils');
const cliCommands = require('./cli-commands');
const PluginApi = require('./plugin-api');
const {isSqlite} = require('./common-utils');

module.exports = class PluginAdapter {
    static create(hermione, opts) {
        return new this(hermione, opts);
    }

    constructor(hermione, opts) {
        this._hermione = hermione;
        this._config = parseConfig(opts);
    }

    isEnabled() {
        return this._config.enabled;
    }

    addApi() {
        this._hermione.htmlReporter = new PluginApi();

        return this;
    }

    addCliCommands() {
        _.values(cliCommands).forEach((command) => {
            this._hermione.on(this._hermione.events.CLI, (commander) => {
                require(`./cli-commands/${command}`)(commander, this._config, this._hermione);
                commander.prependListener(`command:${command}`, () => this._run = _.noop);
            });
        });

        return this;
    }

    init(prepareData, prepareImages) {
        this._hermione.on(this._hermione.events.INIT, () => this._run(prepareData, prepareImages));

        return this;
    }

    async _run(prepareData, prepareImages = _.noop) {
        const reportBuilder = ReportBuilderJson.create(this._hermione, this._config);
        const generateReportPromises = [prepareData(this._hermione, reportBuilder, this._config),
            prepareImages(this._hermione, reportBuilder, this._config)];

        let reportBuilderSqlite;

        if (isSqlite(this._config.saveFormat)) {
            reportBuilderSqlite = await ReportBuilderSqlite.create(this._hermione, this._config, true);
            await reportBuilderSqlite.saveStaticFiles();
            generateReportPromises.push(
                prepareData(this._hermione, reportBuilderSqlite, this._config),
                prepareImages(this._hermione, reportBuilderSqlite, this._config)
            );
        }

        const generateReport = Promise
            .all(generateReportPromises)
            .then(() => reportBuilderSqlite ? reportBuilderSqlite.finalize() : null)
            .then(() => reportBuilder.save())
            .then(utils.logPathToHtmlReport)
            .catch(utils.logError);

        const endRunnerEvent = this._hermione.events.RUNNER_END || this._hermione.events.END_RUNNER;

        this._hermione.on(endRunnerEvent, () => generateReport);
    }
};
