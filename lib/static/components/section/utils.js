import classNames from 'classnames';

export const sectionStatusResolver = ({status, shouldBeOpened, sectionRoot}) => {
    const baseClasses = ['section', {'section_collapsed': !shouldBeOpened}];

    return classNames(baseClasses, {
        [`section_status_${status}`]: status,
        'section_root': sectionRoot
    });
};
