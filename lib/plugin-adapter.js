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

    _createReportBuilder(prepareData, prepareImages) {
        const reportBuilder = ReportBuilderJson.create(this._hermione, this._config);

        return Promise
            .all([
                prepareData(this._hermione, reportBuilder, this._config),
                prepareImages(this._hermione, reportBuilder, this._config)
            ])
            .then(() => reportBuilder.save());
    }

    async _createReportBuilderSqlite(prepareData, prepareImages) {
        const reportBuilderSqlite = await ReportBuilderSqlite.create(this._hermione, this._config);

        return Promise
            .all([
                reportBuilderSqlite.saveStaticFiles(),
                prepareData(this._hermione, reportBuilderSqlite, this._config),
                prepareImages(this._hermione, reportBuilderSqlite, this._config)
            ])
            .then(() => reportBuilderSqlite.finalize());
    }

    async _run(prepareData, prepareImages = _.noop) {
        const generateReport = isSqlite(this._config.saveFormat)
            ? this._createReportBuilderSqlite(prepareData, prepareImages)
            : this._createReportBuilder(prepareData, prepareImages);

        const endRunnerEvent = this._hermione.events.RUNNER_END || this._hermione.events.END_RUNNER;

        this._hermione.on(endRunnerEvent, () =>
            generateReport.then(() => utils.logPathToHtmlReport(this._config)).catch(utils.logError),
        );
    }
};
