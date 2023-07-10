import React, {Component} from 'react';
import classNames from 'classnames';

export default (SectionComponent) => class WrappedComponent extends Component {
    sectionStatusResolver({status, shouldBeOpened, sectionRoot}) {
        const baseClasses = ['section', {'section_collapsed': !shouldBeOpened}];

        return classNames(baseClasses, {
            [`section_status_${status}`]: status,
            'section_root': sectionRoot
        });
    }

    render() {
        return <SectionComponent
            {...this.props}
            sectionStatusResolver={this.sectionStatusResolver}
        />;
    }
};
