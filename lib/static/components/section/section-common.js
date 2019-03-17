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
import {USER} from '../../../constants/controllers';

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
        sectionStatusResolver: PropTypes.func,
        toggleSection: PropTypes.func
    }

    constructor(props) {
        super(props);

        if (!props.suite.controlledBy) {
            this._toggleSection();
        }
    }

    componentWillReceiveProps(nextProps) {
        if (
            this.props.isRoot &&
            (nextProps.expand !== this.props.expand ||
            nextProps.viewMode !== this.props.viewMode ||
            nextProps.running === false && this.props.running === true)
        ) {
            this.props.actions.broadcastToNodes({suitePath: this.props.suite.suitePath, controlledBy: null});
        }

        if (!nextProps.suite.controlledBy) {
            this._toggleSection(nextProps);
        }
    }

    _getStates(props = this.props) {
        const {suite, expand} = props;

        return {
            failed: hasFails(suite),
            retried: hasRetries(suite),
            expand
        };
    }

    _toggleSection(props, opts = {}) {
        const {suite: {suitePath}, toggleSection, shouldBeOpened} = this.props;
        const states = props ? this._getStates(props) : this._getStates();

        toggleSection({suitePath, opened: shouldBeOpened(states), ...opts});
    }

    _onToggleSection = () => {
        const {suite: {suitePath, opened}, toggleSection} = this.props;

        toggleSection({suitePath, opened: !opened, controlledBy: USER});
    }

    render() {
        const {suite, filterByName, filteredBrowsers, sectionStatusResolver} = this.props;
        const {
            name,
            browsers = [],
            children = [],
            status
        } = suite;

        if (!suite.opened) {
            return (
                <div className={sectionStatusResolver({status, opened: suite.opened})}>
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
            <div className={sectionStatusResolver({status, opened: suite.opened})}>
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
    ({view: {expand, viewMode}, running}) => ({expand, viewMode, running}),
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionWrapper(SectionCommon));

export default SectionCommonWrapper;
