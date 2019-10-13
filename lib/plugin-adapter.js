'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const parseConfig = require('./config');
const ReportBuilderFactory = require('./report-builder-factory');
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

    init(prepareData, prepareImages) {
        this._hermione.on(this._hermione.events.INIT, () => this._run(prepareData, prepareImages));

        return this;
    }

    async _run(prepareData, prepareImages = _.noop) {
        if (this._hermione.isWorker()) {
            return;
        }
        const reportBuilder = ReportBuilderFactory.create(this._hermione, this._config);
        const generateReportPromises = [prepareData(this._hermione, reportBuilder, this._config),
            prepareImages(this._hermione, reportBuilder, this._config)];

        let reportBuilderSqlite;

        if (this._config.saveFormat === 'sqlite') {
            reportBuilderSqlite = await ReportBuilderFactory.create(this._hermione, this._config, true);
            generateReportPromises.push(
                prepareData(this._hermione, reportBuilderSqlite, this._config),
                prepareImages(this._hermione, reportBuilderSqlite, this._config)
            );
        }

        const generateReport = Promise
            .all(generateReportPromises)
            .then(() => reportBuilderSqlite ? reportBuilderSqlite.save() : null)
            .then(() => reportBuilder.save())
            .then(utils.logPathToHtmlReport)
            .catch(utils.logError);

        const endRunnerEvent = this._hermione.events.RUNNER_END || this._hermione.events.END_RUNNER;

        this._hermione.on(endRunnerEvent, () => generateReport);
    }
};
