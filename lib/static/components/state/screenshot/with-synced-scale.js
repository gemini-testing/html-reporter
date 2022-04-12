import React, {Component} from 'react';
import PropTypes from 'prop-types';
import ResizeObserver from 'rc-resize-observer';

export default (WrappedComponent) => class WithSyncedScale extends Component {
    static propTypes = {
        image1: PropTypes.shape({
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            })
        }).isRequired,
        image2: PropTypes.shape({
            size: PropTypes.shape({
                width: PropTypes.number,
                height: PropTypes.number
            })
        }).isRequired
    }

    constructor(props) {
        super(props);

        const {image1, image2} = props;

        this._scaleFactor = 1;
        this._shouldScale = image1.size.width !== image2.size.width;
        this._isFirstImageWider = image1.size.width > image2.size.width;

        this.state = {
            syncedImage1: {
                containerRef: React.createRef(),
                width: image1.size.width
            },
            syncedImage2: {
                containerRef: React.createRef(),
                width: image2.size.width
            },
            resizesNum: 0
        };
    }

    componentDidMount() {
        this._handleResize();
    }

    _calcScaleFactor = () => {
        if (!this._shouldScale) {
            return this._scaleFactor;
        }

        const {image1, image2} = this.props;
        const {syncedImage1, syncedImage2} = this.state;

        const imgWidth = this._isFirstImageWider ? image1.size.width : image2.size.width;
        const renderedImgWidth = this._isFirstImageWider
            ? this.getRenderedImgWidth(syncedImage1)
            : this.getRenderedImgWidth(syncedImage2);

        return renderedImgWidth / imgWidth;
    }

    _getScaledWidth = (image) => {
        if (!this._shouldScale) {
            return image.size.width;
        }

        const scaledWidth = Math.ceil(image.size.width * this._scaleFactor);

        return Math.min(scaledWidth, image.size.width);
    }

    getRenderedImgWidth(syncedImage) {
        return syncedImage.containerRef.current
            ? syncedImage.containerRef.current.offsetWidth
            : syncedImage.width;
    }

    _handleResize = () => {
        if (!this._shouldScale) {
            return;
        }

        const {image1, image2} = this.props;
        this._scaleFactor = this._calcScaleFactor();

        this.setState(prevState => ({
            syncedImage1: {
                ...prevState.syncedImage1,
                width: this._isFirstImageWider ? image1.size.width : this._getScaledWidth(image1)
            },
            syncedImage2: {
                ...prevState.syncedImage2,
                width: this._isFirstImageWider ? this._getScaledWidth(image2) : image2.size.width
            },
            resizesNum: prevState.resizesNum + 1
        }));
    }

    render() {
        const {syncedImage1, syncedImage2, resizesNum} = this.state;

        return (
            <ResizeObserver onResize={this._handleResize}>
                <WrappedComponent
                    syncedImage1={syncedImage1}
                    syncedImage2={syncedImage2}
                    resizesNum={resizesNum}
                    getRenderedImgWidth={this.getRenderedImgWidth}

                    {...this.props}
                />
            </ResizeObserver>
        );
    }
};
