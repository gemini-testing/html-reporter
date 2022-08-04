import PropTypes from 'prop-types';

export const groupedTestsType = PropTypes.shape({
    result: PropTypes.shape({
        byKey: PropTypes.object.isRequired,
        allKeys: PropTypes.array.isRequired
    }).isRequired,
    meta: PropTypes.shape({
        byKey: PropTypes.object.isRequired,
        allKeys: PropTypes.array.isRequired
    }).isRequired
});
