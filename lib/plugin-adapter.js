'use strict';

const _ = require('lodash');
const Promise = require('bluebird');
const parseConfig = require('./config');
const StaticReportBuilder = require('./report-builder/static');
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
        this._hermione.htmlReporter = PluginApi.create(this._config);

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

    async _createStaticReportBuilder(prepareData) {
        const staticReportBuilder = StaticReportBuilder.create(this._hermione, this._config);

        await staticReportBuilder.init();

        return Promise
            .all([
                staticReportBuilder.saveStaticFiles(),
                prepareData(this._hermione, staticReportBuilder, this._config)
            ])
            .then(() => staticReportBuilder.finalize())
            .then(async () => {
                const htmlReporter = this._hermione.htmlReporter;

                await htmlReporter.emitAsync(htmlReporter.events.REPORT_SAVED, {reportPath: this._config.path});
            });
    }

    async _run(prepareData) {
        const generateReport = this._createStaticReportBuilder(prepareData);

        this._hermione.on(this._hermione.events.RUNNER_END, () =>
            generateReport.then(() => utils.logPathToHtmlReport(this._config)).catch(utils.logError),
        );
    }
};
