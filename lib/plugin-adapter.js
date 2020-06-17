'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const parseConfig = require('./config');
const ReportBuilderSqlite = require('./report-builder/report-builder-sqlite');
const utils = require('./server-utils');
const cliCommands = require('./cli-commands');
const PluginApi = require('./plugin-api');

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

    init(prepareData) {
        this._hermione.on(this._hermione.events.INIT, () => this._run(prepareData));

        return this;
    }

    async _createReportBuilderSqlite(prepareData) {
        const reportBuilderSqlite = ReportBuilderSqlite.create(this._hermione, this._config);

        await reportBuilderSqlite.init();

        return Promise
            .all([
                reportBuilderSqlite.saveStaticFiles(),
                prepareData(this._hermione, reportBuilderSqlite, this._config)
            ])
            .then(() => reportBuilderSqlite.finalize());
    }

    async _run(prepareData) {
        const generateReport = this._createReportBuilderSqlite(prepareData);

        this._hermione.on(this._hermione.events.RUNNER_END, () =>
            generateReport.then(() => utils.logPathToHtmlReport(this._config)).catch(utils.logError),
        );
    }
};
