'use strict';

import React from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import {uniqueId} from 'lodash';
import SectionBase from './section-base';
import SectionBrowser from './section-browser';
import {allSkipped, allUpdated, hasFails, hasRetries} from '../../modules/utils';
import Title from './title/simple';

export class SectionCommon extends SectionBase {
    static propTypes = {
        suite: PropTypes.shape({
            name: PropTypes.string,
            suitePath: PropTypes.array,
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
        const updated = allUpdated(suite);

        this.setState({
            failed,
            retried,
            skipped,
            collapsed: this._shouldBeCollapsed({failed, retried, updated})
        });
    }

    render() {
        const {suite, expand, showRetries} = this.props;
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
            return <SectionCommon key={key} suite={child} expand={expand} showRetries={showRetries}/>;
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
}

export default connect(
    ({view: {expand, showRetries}}) => ({expand, showRetries})
)(SectionCommon);
