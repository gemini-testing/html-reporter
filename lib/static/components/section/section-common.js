'use strict';

import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {uniqueId} from 'lodash';
import SectionBase from './section-base';
import {SectionBrowser} from './section-browser';
import {allSkipped, hasFails, hasRetries} from '../../modules/utils';
import Title from './title/simple';

export class SectionCommon extends SectionBase {
    static propTypes = {
        suite: PropTypes.shape({
            name: PropTypes.string.isRequired,
            suitePath: PropTypes.array.isRequired,
            browsers: PropTypes.array,
            children: PropTypes.array
        }),
        ...SectionBase.propTypes
    }

    componentWillMount() {
        const suite = this.props.suite;
        const failed = hasFails(suite);
        const retried = hasRetries(suite);
        const skipped = allSkipped(suite);

        this.setState({
            failed,
            retried,
            skipped,
            collapsed: this._shouldBeCollapsed(failed, retried)
        });
    }

    render() {
        const {suite, view} = this.props;
        const {name, suitePath, browsers = [], children = []} = suite;

        if (this.state.collapsed) {
            return (
                <div className={this._resolveSectionStatus()}>
                    <Title name={name} suitePath={suitePath} handler={this._toggleState}/>
                </div>
            );
        }

        const childrenTmpl = children.map((child) => {
            const key = uniqueId(`${suite.suitePath}-${suite.name}`);
            return <SectionCommon key={key} suite={child} view={view}/>;
        });
        const browserTmpl = browsers.map((browser) => {
            return <SectionBrowser key={browser.name} browser={browser} view={view}/>;
        });

        return (
            <div className={this._resolveSectionStatus()}>
                <Title name={name} suitePath={suitePath} handler={this._toggleState}/>
                <div className="section__body section__body_guided">
                    {browserTmpl}
                    {childrenTmpl}
                </div>
            </div>
        );
    }
}

export default connect(
    (state) => ({view: state.view})
)(SectionCommon);
