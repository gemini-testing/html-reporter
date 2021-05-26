import React, {Component} from 'react';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import PropTypes from 'prop-types';
import LazilyRender from '@gemini-testing/react-lazily-render';
import * as actions from '../../modules/actions';
import SectionWrapper from './section-wrapper';
import SectionBrowser from './section-browser';
import {isFailStatus, isErroredStatus} from '../../../common-utils';
import Title from './title/simple';
import {mkShouldSuiteBeShown, mkHasSuiteFailedRetries} from '../../modules/selectors/tree';

class SectionCommon extends Component {
    static propTypes = {
        suiteId: PropTypes.string.isRequired,
        eventToUpdate: PropTypes.string,
        eventToReset: PropTypes.string,
        errorGroupBrowserIds: PropTypes.array,
        sectionRoot: PropTypes.bool.isRequired,
        // from store
        expand: PropTypes.string.isRequired,
        suiteName: PropTypes.string.isRequired,
        suiteStatus: PropTypes.string.isRequired,
        suiteChildIds: PropTypes.array,
        suiteBrowserIds: PropTypes.array,
        shouldBeShown: PropTypes.bool.isRequired,
        hasFailedRetries: PropTypes.bool.isRequired,
        // from SectionCommonWrapper
        shouldBeOpened: PropTypes.func.isRequired,
        sectionStatusResolver: PropTypes.func.isRequired
    }

    constructor(props) {
        super(props);

        this._lazyRender = React.createRef();
    }

    state = {
        opened: this.props.shouldBeOpened(this._getStates())
    }

    // eslint-disable-next-line camelcase
    UNSAFE_componentWillReceiveProps(nextProps) {
        const updatedStates = this._getStates(nextProps);
        this.setState({opened: this.props.shouldBeOpened(updatedStates)});
    }

    _getStates(props = this.props) {
        const {suiteStatus, expand, hasFailedRetries} = props;

        return {
            failed: isFailStatus(suiteStatus) || isErroredStatus(suiteStatus),
            retried: hasFailedRetries,
            expand
        };
    }

    _onToggleSection = () => {
        this.setState({opened: !this.state.opened});
        const {eventToUpdate, suiteId} = this.props;

        if (eventToUpdate) {
            window.dispatchEvent(new Event(eventToUpdate));
        }

        this.props.actions.toggleSuiteSection(suiteId);
    }

    _drawSection() {
        const {
            suiteId,
            suiteName,
            suiteStatus,
            suiteChildIds,
            suiteBrowserIds,
            errorGroupBrowserIds,
            sectionRoot,
            sectionStatusResolver
        } = this.props;
        const {opened} = this.state;

        if (!opened) {
            return (
                <div className={sectionStatusResolver({status: suiteStatus, opened, sectionRoot})}>
                    <Title name={suiteName} suiteId={suiteId} handler={this._onToggleSection} />
                </div>
            );
        }

        const childSuitesTmpl = suiteChildIds && suiteChildIds.map((suiteId) => {
            return <SectionCommonWrapper
                key={suiteId}
                suiteId={suiteId}
                eventToUpdate={this.props.eventToUpdate}
                eventToReset={this.props.eventToReset}
                sectionRoot={false}
                errorGroupBrowserIds={errorGroupBrowserIds}
            />;
        });

        const browsersTmpl = suiteBrowserIds && suiteBrowserIds.map((browserId) => {
            return <SectionBrowser key={browserId} browserId={browserId} errorGroupBrowserIds={errorGroupBrowserIds} />;
        });

        return (
            <div className={sectionStatusResolver({status: suiteStatus, opened, sectionRoot})}>
                <Title name={suiteName} suiteId={suiteId} handler={this._onToggleSection} />
                <div className="section__body">
                    {childSuitesTmpl}
                    {browsersTmpl}
                </div>
            </div>
        );
    }

    _drawLazySection() {
        const {suiteId, eventToUpdate, eventToReset, lazyLoadOffset} = this.props;

        return <LazilyRender key={suiteId} eventToUpdate={eventToUpdate} eventToReset={eventToReset} offset={lazyLoadOffset}>
            {render => render ? this._drawSection() : null}
        </LazilyRender>;
    }

    render() {
        if (!this.props.shouldBeShown) {
            return null;
        }

        return this.props.lazyLoadOffset > 0
            ? this._drawLazySection()
            : this._drawSection();
    }
}

const SectionCommonWrapper = connect(
    () => {
        const shouldSuiteBeShown = mkShouldSuiteBeShown();
        const hasSuiteFailedRetries = mkHasSuiteFailedRetries();

        return (state, {suiteId, errorGroupBrowserIds, sectionRoot}) => {
            const suite = state.tree.suites.byId[suiteId];
            const shouldBeShown = sectionRoot ? true : shouldSuiteBeShown(state, {suiteId, errorGroupBrowserIds});
            let hasFailedRetries = false;

            if (shouldBeShown) {
                hasFailedRetries = hasSuiteFailedRetries(state, {suiteId});
            }

            return {
                expand: state.view.expand,
                lazyLoadOffset: state.view.lazyLoadOffset,
                suiteName: suite.name,
                suiteStatus: suite.status,
                suiteChildIds: suite.suiteIds,
                suiteBrowserIds: suite.browserIds,
                shouldBeShown,
                hasFailedRetries
            };
        };
    },
    (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(SectionWrapper(SectionCommon));

export default SectionCommonWrapper;
