import PropTypes from 'prop-types';

export const ImageData = PropTypes.shape({
    path: PropTypes.string.isRequired,
    size: PropTypes.shape({
        height: PropTypes.number.isRequired,
        width: PropTypes.number.isRequired
    }).isRequired
});
