import PropTypes from 'prop-types';

export const imageType = PropTypes.shape({
    path: PropTypes.string.isRequired,
    size: PropTypes.shape({
        width: PropTypes.number,
        height: PropTypes.number
    })
});

export const syncedImageType = PropTypes.shape({
    containerRef: PropTypes.shape({
        current: PropTypes.instanceOf(Element)
    }),
    width: PropTypes.number
});
