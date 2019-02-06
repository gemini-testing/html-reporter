'use strict';

import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {uniqueId, cloneDeep} from 'lodash';
import SectionBase from './section-base';
import SectionBrowser from './section-browser';
import {allSkipped, hasFails, hasRetries, shouldSuiteBeShown, filterBrowsers} from '../../modules/utils';
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
        filterByName: PropTypes.string,
        ...SectionBase.propTypes
    }

    render() {
        const {suite, expand, filterByName} = this.props;
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

        let visibleChildren = children;
        if (filterByName) {
            visibleChildren = visibleChildren.filter(child => shouldSuiteBeShown(child, filterByName));
        }
        const childrenTmpl = visibleChildren.map((child) => {
            const key = uniqueId(`${suite.suitePath}-${suite.name}`);
            return <SectionCommon key={key} suite={child} expand={expand} filterByName={filterByName}/>;
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
    ({view: {expand, viewMode, filteredBrowsers}, suites}, ownProps) => {
        const origSuite = suites[ownProps.suiteId];
        let suite;

        if (filteredBrowsers.length > 0) {
            suite = filterBrowsers(cloneDeep(origSuite), filteredBrowsers);
        } else {
            suite = origSuite;
        }

        return {
            expand,
            viewMode,
            suite
        };
    }
)(SectionCommon);
