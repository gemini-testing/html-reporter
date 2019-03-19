import React, {Component} from 'react';
import classNames from 'classnames';

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

        return classNames(baseClasses, {[`section_status_${status}`]: status});
    }

    render() {
        return <SectionComponent
            {...this.props}
            shouldBeOpened={this.shouldBeOpened}
            sectionStatusResolver={this.sectionStatusResolver}
        />;
    }
};
