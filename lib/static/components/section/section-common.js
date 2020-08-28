import React, {Component} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import LazilyRender from '@gemini-testing/react-lazily-render';
import SectionWrapper from './section-wrapper';
import SectionBrowser from './section-browser';
import {isFailStatus, isErroredStatus} from '../../../common-utils';
import Title from './title/simple';
import {mkShouldSuiteBeShown, mkHasSuiteFailedRetries} from '../../modules/selectors/tree';

class SectionCommon extends Component {
    static propTypes = {
        suiteId: PropTypes.string.isRequired,
        eventToUpdate: PropTypes.string,
        errorGroupBrowserIds: PropTypes.array.isRequired,
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

    state = {
        opened: this.props.shouldBeOpened(this._getStates()),
        isRendered: false
    }

    handleRender = () => {
        this.setState({isRendered: true});
    }

    componentWillReceiveProps(nextProps) {
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
        const {eventToUpdate} = this.props;

        if (eventToUpdate) {
            window.dispatchEvent(new Event(eventToUpdate));
        }
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
        const {suiteId, eventToUpdate, lazyLoadOffset} = this.props;
        const content = this.state.isRendered ? this._drawSection() : null;

        return <LazilyRender key={suiteId} eventToUpdate={eventToUpdate} offset={lazyLoadOffset} onRender={this.handleRender} content={content} />;
    }

    render() {
        if (!this.props.shouldBeShown) {
            return null;
        }

        const {sectionRoot, lazyLoadOffset} = this.props;

        return sectionRoot && lazyLoadOffset > 0
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
)(SectionWrapper(SectionCommon));

export default SectionCommonWrapper;
