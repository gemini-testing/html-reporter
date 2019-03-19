'use strict';

import React, {Component} from 'react';
import {bindActionCreators} from 'redux';
import {connect} from 'react-redux';
import * as actions from '../../modules/actions';
import PropTypes from 'prop-types';
import {uniqueId} from 'lodash';
import SectionWrapper from './section-wrapper';
import SectionBrowser from './section-browser';
import {hasFails, hasRetries, shouldSuiteBeShown, shouldBrowserBeShown} from '../../modules/utils';
import Title from './title/simple';

class SectionCommon extends Component {
    static propTypes = {
        suite: PropTypes.shape({
            name: PropTypes.string,
            suitePath: PropTypes.array,
            browsers: PropTypes.array,
            children: PropTypes.array
        }),
        testNameFilter: PropTypes.string,
        filteredBrowsers: PropTypes.array,
        errorGroupTests: PropTypes.object,
        shouldBeOpened: PropTypes.func,
        sectionStatusResolver: PropTypes.func,
        eventToUpdate: PropTypes.string
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
        const {eventToUpdate} = this.props;

        if (eventToUpdate) {
            window.dispatchEvent(new Event(eventToUpdate));
        }
    }

    render() {
        const {suite, testNameFilter, filteredBrowsers, sectionStatusResolver, errorGroupTests} = this.props;
        const {opened} = this.state;
        const {
            name,
            browsers = [],
            children = [],
            status,
            suitePath
        } = suite;
        const fullTestName = suitePath.join(' ');

        if (!opened) {
            return (
                <div className={sectionStatusResolver({status, opened})}>
                    <Title name={name} suite={suite} handler={this._onToggleSection} />
                </div>
            );
        }

        const visibleChildren = children.filter(child => shouldSuiteBeShown({suite: child, testNameFilter, filteredBrowsers, errorGroupTests}));

        const childrenTmpl = visibleChildren.map((child) => {
            const key = uniqueId(`${suite.suitePath}-${child.name}`);

            return <SectionCommonWrapper key={key} suite={child} testNameFilter={testNameFilter} filteredBrowsers={filteredBrowsers} errorGroupTests={errorGroupTests} />;
        });

        const browserTmpl = browsers
            .filter(browser => shouldBrowserBeShown({browser, fullTestName, filteredBrowsers, errorGroupTests}))
            .map(browser => {
                return (
                    <SectionBrowser
                        key={browser.name}
                        browser={browser}
                        suite={suite}
                    />
                );
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
