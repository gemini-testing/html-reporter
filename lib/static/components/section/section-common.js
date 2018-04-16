'use strict';

import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {uniqueId} from 'lodash';
import SectionBase from './section-base';
import SectionBrowser from './section-browser';
import {allSkipped, hasFails, hasRetries} from '../../modules/utils';
import Title from './title/simple';

export class SectionCommon extends SectionBase {
    static propTypes = {
        suiteId: PropTypes.string,
        suite: PropTypes.shape({
            name: PropTypes.string,
            suitePath: PropTypes.array,
            browsers: PropTypes.array,
            children: PropTypes.array
        }),
        ...SectionBase.propTypes
    }

    render() {
        const {suite, expand} = this.props;
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

        const childrenTmpl = children.map((child) => {
            const key = uniqueId(`${suite.suitePath}-${suite.name}`);
            return <SectionCommon key={key} suite={child} expand={expand}/>;
        });
        const browserTmpl = browsers.map((browser) => {
            return <SectionBrowser key={browser.name} browser={browser} suite={suite}/>;
        });

        return (
            <div className={this._resolveSectionStatus(status)}>
                <Title name={name} suite={suite} handler={this._toggleState}/>
                <div className="section__body section__body_guided">
                    {browserTmpl}
                    {childrenTmpl}
                </div>
            </div>
        );
    }

    _getStateFromProps() {
        const {suite, expand} = this.props;

        return {
            failed: hasFails(suite),
            retried: hasRetries(suite),
            skipped: allSkipped(suite),
            expand
        };
    }
}

export default connect(
    ({view: {expand, viewMode}, suites}, ownProps) => {
        return {
            expand,
            viewMode,
            suite: suites[ownProps.suiteId]
        };
    }
)(SectionCommon);
