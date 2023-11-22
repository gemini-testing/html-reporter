import _ from 'lodash';
import type Hermione from 'hermione';
import {CommanderStatic} from '@gemini-testing/commander';

import {parseConfig} from './config';
import {StaticReportBuilder} from './report-builder/static';
import * as utils from './server-utils';
import {cliCommands} from './cli-commands';
import {HtmlReporter} from './plugin-api';
import {HtmlReporterApi, ReporterConfig, ReporterOptions} from './types';
import {ToolName} from './constants';

type PrepareFn = (hermione: Hermione & HtmlReporterApi, reportBuilder: StaticReportBuilder, config: ReporterConfig) => Promise<void>;

export class PluginAdapter {
    protected _hermione: Hermione & Partial<HtmlReporterApi>;
    protected _config: ReporterConfig;

    static create<T extends PluginAdapter>(
        this: new (hermione: Hermione, opts: Partial<ReporterOptions>) => T,
        hermione: Hermione,
        opts: Partial<ReporterOptions>
    ): T {
        return new this(hermione, opts);
    }

    constructor(hermione: Hermione, opts: Partial<ReporterOptions>) {
        this._hermione = hermione;
        this._config = parseConfig(opts);
    }

    isEnabled(): boolean {
        return this._config.enabled;
    }

    addApi(): this {
        this._hermione.htmlReporter = HtmlReporter.create(this._config, {toolName: ToolName.Hermione});
        return this;
    }

    addCliCommands(): this {
        _.values(cliCommands).forEach((command: string) => {
            this._hermione.on(this._hermione.events.CLI, (commander: CommanderStatic) => {
                // eslint-disable-next-line @typescript-eslint/no-var-requires
                require(`./cli-commands/${command}`)(commander, this._config, this._hermione);
                commander.prependListener(`command:${command}`, () => this._run = _.noop as typeof this._run);
            });
        });

        return this;
    }

    init(prepareData: PrepareFn): this {
        this._hermione.on(this._hermione.events.INIT, () => this._run(prepareData));
        return this;
    }

    protected async _createStaticReportBuilder(prepareData: PrepareFn): Promise<void> {
        if (!this._hermione.htmlReporter) {
            throw new Error('Html-reporter API has to be added to hermione before usage');
        }

        const staticReportBuilder = StaticReportBuilder.create(this._hermione.htmlReporter, this._config);

        await staticReportBuilder.init();

        return Promise
            .all([
                staticReportBuilder.saveStaticFiles(),
                prepareData(this._hermione as Hermione & HtmlReporterApi, staticReportBuilder, this._config)
            ])
            .then(() => staticReportBuilder.finalize())
            .then(async () => {
                const htmlReporter = this._hermione.htmlReporter as HtmlReporter;

                await htmlReporter.emitAsync(htmlReporter.events.REPORT_SAVED, {reportPath: this._config.path});
            });
    }

    protected async _run(prepareData: PrepareFn): Promise<void> {
        const generateReport = this._createStaticReportBuilder(prepareData);

        this._hermione.on(this._hermione.events.RUNNER_END, () =>
            generateReport.then(() => utils.logPathToHtmlReport(this._config)).catch(utils.logError)
        );
    }
}
