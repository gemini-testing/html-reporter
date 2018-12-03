'use strict';

import React from 'react';
import {connect} from 'react-redux';
import {uniqueId} from 'lodash';
import {Base, IBaseProps} from './section-base';
import SectionBrowser from './section-browser';
import {allSkipped, hasFails, hasRetries} from '../../modules/utils';
import Title from './title/simple';

interface IBrowser{
    name: string;
    result: any;
    retries: any[];
}

interface IChild{
    name: string;
    suitePath: any[];
    browsers: IBrowser[];
    children: any[];
    status?: string;
    result?: any;
}

interface ISectionCommonProps extends IBaseProps{
    suiteId?: string;
    suite?: IChild;
}

export class SectionCommon extends Base<ISectionCommonProps>{
    constructor(props: ISectionCommonProps) {
        super(props);
    }

    render()  {
        const {suite, expand} = this.props;

        if (!suite)
            return null;

        const {
            name,
            browsers = [],
            children = [],
            status
        } = suite;

        if (this.state.collapsed) {
            return (
                <div className={this._resolveSectionStatus(status)}>
                    <Title name={name} suite={suite} handler={this._toggleState}/>
                </div>
            );
        }

        const childrenTmpl = children.map((child: IChild) => {
            const key = uniqueId(`${suite.suitePath}-${suite.name}`);
            return <SectionCommon key={key} suite={child} expand={expand}/>;
        });
        const browserTmpl = browsers.map((browser: IBrowser) => {
            return <SectionBrowser key={browser.name} browser={browser} suite={suite}/>;
        });

        return (
            <div className={this._resolveSectionStatus(status)}>
                <Title name={name} suite={suite} handler={this._toggleState}/>
                <div className='section__body section__body_guided'>
                    {browserTmpl}
                    {childrenTmpl}
                </div>
            </div>
        );
    }

    protected _getStateFromProps() {
        const {suite, expand} = this.props;
        let fail = false;

        if (suite){
            const {result} = suite;
            fail = result && hasFails(result);
        }

        return {
            failed: fail,
            retried: hasRetries(suite),
            skipped: allSkipped(suite),
            expand
        };
    }
}

export default connect<{}, {}, ISectionCommonProps>(
    ({view: {expand, viewMode}, suites}: any, ownProps: any) => {
        return {
            expand,
            viewMode,
            suite: suites[ownProps.suiteId]
        };
    }
)(SectionCommon);
