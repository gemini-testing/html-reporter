import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import ResizedScreenshot from '../../state/screenshot/resized';
import StateFail from '../../state/state-fail';
import {isNoRefImageError} from '../../../modules/utils';

class ScreenshotAccepterBody extends Component {
    static propTypes = {
        image: PropTypes.shape({
            stateName: PropTypes.string.isRequired,
            expectedImg: PropTypes.object,
            actualImg: PropTypes.object,
            diffImg: PropTypes.object,
            error: PropTypes.object
        }),
        // from store
        testName: PropTypes.string,
        browserName: PropTypes.string
    }

    _renderImages() {
        const {image} = this.props;

        return (
            <div className='image-box__container'>
                {
                    isNoRefImageError(image.error)
                        ? this._renderImageBox('No reference image', image.actualImg)
                        : <StateFail image={image} />
                }
            </div>
        );
    }

    _renderImageBox(label, image) {
        return (
            <div className="image-box__image">
                <div className="image-box__title">{label}</div>
                <ResizedScreenshot image={image} />
            </div>
        );
    }

    _renderTitle() {
        const {testName, browserName, image: {stateName}} = this.props;

        return (
            <div className="screenshot-accepter__title">
                <span className="screenshot-accepter__test-name">{testName}</span>
                <span className="screenshot-accepter__title-divider">{'/'}</span>
                <span className="screenshot-accepter__browser-name">{browserName}</span>
                <span className="screenshot-accepter__title-divider">{'/'}</span>
                <span className="screenshot-accepter__state-name">{stateName}</span>
            </div>
        );
    }

    render() {
        return (
            <div className="screenshot-accepter__body container">
                {this.props.image
                    ? <Fragment>
                        {this._renderTitle()}
                        {this._renderImages()}
                    </Fragment>
                    : <div className="screenshot-accepter__completion-info">
                        {'All screenshots are accepted. Well done! 🎉'}
                    </div>
                }
            </div>
        );
    }
}

export default connect(
    ({tree}, {image}) => {
        const result = image ? tree.results.byId[image.parentId] : {};
        const browser = image ? tree.browsers.byId[result.parentId] : {};

        return {
            testName: browser.parentId,
            browserName: browser.name
        };
    }
)(ScreenshotAccepterBody);
