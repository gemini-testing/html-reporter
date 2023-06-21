import React, {Component, Fragment} from 'react';
import PropTypes from 'prop-types';

import MetaInfoContent from '../../section/body/meta-info/content';

export default class ScreenshotAccepterMeta extends Component {
    static propTypes = {
        showMeta: PropTypes.bool.isRequired,
        image: PropTypes.shape({
            parentId: PropTypes.string
        })
    }

    render() {
        const {showMeta, image} = this.props;

        if (!showMeta || !image) {
            return null;
        }

        return (
            <Fragment>
                <div className="screenshot-accepter__meta container">
                    <MetaInfoContent
                        resultId={image.parentId}
                    />
                </div>
                <hr className='tab__separator' />
            </Fragment>
        );
    }
}
