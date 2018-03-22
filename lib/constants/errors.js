'use strict';

exports.getCommonErrors = () => ({
    NO_REF_IMAGE_ERROR: 'NoRefImageError'
});

exports.getHermioneErrors = () => {
    return Object.assign({
        IMAGE_DIFF_ERROR: 'ImageDiffError'
    }, exports.getCommonErrors());
};
