'use strict';

import React, {Fragment} from 'react';
import {connect} from 'react-redux';
import {Base, IBaseProps} from './section-base';
import SectionBrowserTitle from './title/browser';
import BrowserSkippedTitle from './title/browser-skipped';
import Body from './body';
import {isFailStatus, isErroredStatus, isSkippedStatus} from '../../../common-utils';

interface ISectionBrowserProps extends IBaseProps {
    browser: {
        name: string,
        result: any,
        retries: any[]
    };
    suite?: {};
}

export class SectionBrowser extends Base<ISectionBrowserProps>{

    constructor(props: ISectionBrowserProps) {
        super(props);
    }

    render() {
        const {name, result, retries, result: {status}} = this.props.browser;

        const body = this.state.collapsed
            ? null
            : <Body result={result} suite={this.props.suite} retries={retries}/>;

        const section = this.state.skipped
            ? <BrowserSkippedTitle result={result}/>
            : (
                <Fragment>
                    <SectionBrowserTitle name={name} result={result} handler={this._toggleState}/>
                    {body}
                </Fragment>
            );

        return (
            <div className={this._resolveSectionStatus(status)}>
                {section}
            </div>
        );
    }

    protected _getStateFromProps() {
        const {expand, browser} = this.props;
        const {result: {status}, retries = []} = browser;
        const failed = isErroredStatus(status) || isFailStatus(status);
        const retried = retries.length > 0;
        const skipped = isSkippedStatus(status);

        return {failed, retried, skipped, expand};
    }
}

export default connect<{}, {}, ISectionBrowserProps>(
    ({view: {expand}}: any) => ({expand})
)(SectionBrowser);
