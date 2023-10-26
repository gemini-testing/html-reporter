import React, {Component, Fragment} from 'react';
import {connect} from 'react-redux';
import PropTypes from 'prop-types';
import ResizedScreenshot from '../../state/screenshot/resized';
import StateFail from '../../state/state-fail';
import {isNoRefImageError} from '../../../../common-utils';
import ViewInBrowserIcon from '../../icons/view-in-browser';

class ScreenshotAccepterBody extends Component {
    static propTypes = {
        image: PropTypes.shape({
            stateName: PropTypes.string.isRequired,
            expectedImg: PropTypes.object,
            actualImg: PropTypes.object,
            diffImg: PropTypes.object,
            error: PropTypes.object,
            parentId: PropTypes.string
        }),
        // from store
        testName: PropTypes.string,
        browserName: PropTypes.string
    };

    _renderImages() {
        const {image} = this.props;

        return (
            <div className='image-box__container'>
                {
                    isNoRefImageError(image.error)
                        ? this._renderImageBox(image.actualImg)
                        : <StateFail image={image} />
                }
            </div>
        );
    }

    _renderImageBox(image) {
        return (
            <div className="image-box__image">
                <ResizedScreenshot image={image} />
            </div>
        );
    }

    _renderTitle() {
        const {testName, browserName, image: {stateName, parentId: resultId, error: imageError}} = this.props;
        const imagesDescription = isNoRefImageError(imageError)
            ? 'actual'
            : 'expected, actual, diff';

        return (
            <div className="screenshot-accepter__title">
                <span className="screenshot-accepter__test-name" data-test-id="screenshot-accepter-test-name">{testName}</span>
                <span className="screenshot-accepter__title-divider">{'/'}</span>
                <span className="screenshot-accepter__browser-name">{browserName}</span>
                <span className="screenshot-accepter__title-divider">{'/'}</span>
                <span className="screenshot-accepter__state-name">{stateName}</span>
                <span className="screenshot-accepter__images-desc"> ({imagesDescription})</span>
                <ViewInBrowserIcon extendClassNames="screenshot-accepter__icon_view-in-browser" resultId={resultId}/>
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
