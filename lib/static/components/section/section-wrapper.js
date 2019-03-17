import React, {Component} from 'react';
import classNames from 'classnames';
import {isFailStatus, isSkippedStatus} from '../../../common-utils';

export default (SectionComponent) => class WrappedComponent extends Component {
    shouldBeOpened({failed, retried, expand}) {
        if (expand === 'errors' && failed) {
            return true;
        } else if (expand === 'retries' && retried) {
            return true;
        } else if (expand === 'all') {
            return true;
        }

        return false;
    }

    sectionStatusResolver({status, opened}) {
        const baseClasses = ['section', {'section_collapsed': !opened}];

        if (status) {
            return classNames(baseClasses, `section_status_${status}`);
        }

        return classNames(
            baseClasses,
            {'section_status_skip': isSkippedStatus(status)},
            {'section_status_fail': isFailStatus(status)},
            {'section_status_success': !(isSkippedStatus(status) || isFailStatus(status))}
        );
    }

    toggleSection = (opts) => {
        this.props.actions.toggleSection(opts);
    }

    render() {
        return <SectionComponent
            {...this.props} shouldBeOpened={this.shouldBeOpened}
            sectionStatusResolver={this.sectionStatusResolver} toggleSection={this.toggleSection}
        />;
    }
};
