'use strict';

import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import PropTypes from 'prop-types';
import {uniqueId} from 'lodash';
import SectionWrapper from './section-wrapper';
import SectionBrowser from './section-browser';
import {hasFails, hasRetries, shouldSuiteBeShownByName, shouldSuiteBeShownByBrowser} from '../../modules/utils';
import Title from './title/simple';

class SectionCommon extends Component {
    static propTypes = {
        suite: PropTypes.shape({
            name: PropTypes.string,
            suitePath: PropTypes.array,
            browsers: PropTypes.array,
            children: PropTypes.array
        }),
        filterByName: PropTypes.string,
        filteredBrowsers: PropTypes.array,
        shouldBeOpened: PropTypes.func,
        sectionStatusResolver: PropTypes.func
    }

    state = {
        opened: this.props.shouldBeOpened(this._getStates())
    }

    componentWillReceiveProps(nextProps) {
        const updatedStates = this._getStates(nextProps);
        this.setState({opened: this.props.shouldBeOpened(updatedStates)});
    }

    _getStates(props = this.props) {
        const {suite, expand} = props;

        return {
            failed: hasFails(suite),
            retried: hasRetries(suite),
            expand
        };
    }

    _onToggleSection = () => {
        this.setState({opened: !this.state.opened});
    }

    render() {
        const {suite, filterByName, filteredBrowsers, sectionStatusResolver} = this.props;
        const {opened} = this.state;
        const {
            name,
            browsers = [],
            children = [],
            status
        } = suite;

        if (!opened) {
            return (
                <div className={sectionStatusResolver({status, opened})}>
                    <Title name={name} suite={suite} handler={this._onToggleSection} />
                </div>
            );
        }

        let visibleChildren = children;
        if (filterByName) {
            visibleChildren = visibleChildren.filter(child => shouldSuiteBeShownByName(child, filterByName));
        }
        if (filteredBrowsers.length > 0) {
            visibleChildren = visibleChildren.filter(child => shouldSuiteBeShownByBrowser(child, filteredBrowsers));
        }
        const childrenTmpl = visibleChildren.map((child) => {
            const key = uniqueId(`${suite.suitePath}-${child.name}`);

            return <SectionCommonWrapper key={key} suite={child} filterByName={filterByName} filteredBrowsers={filteredBrowsers} />;
        });
        const browserTmpl = browsers
            .filter(({name}) => {
                return filteredBrowsers.length === 0 || filteredBrowsers.includes(name);
            })
            .map((browser) => {
                return <SectionBrowser key={browser.name} browser={browser} suite={suite} />;
            });

        return (
            <div className={sectionStatusResolver({status, opened})}>
                <Title name={name} suite={suite} handler={this._onToggleSection} />
                <div className="section__body section__body_guided">
                    {browserTmpl}
                    {childrenTmpl}
                </div>
            </div>
        );
    }
}

const SectionCommonWrapper = connect(
    ({view: {expand, viewMode}}) => ({expand, viewMode}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionWrapper(SectionCommon));

export default SectionCommonWrapper;
