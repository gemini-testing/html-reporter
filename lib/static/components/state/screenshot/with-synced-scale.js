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
        this._shouldScaleSmallestImg = image1.size.width !== image2.size.width;
        this._isFirstImageWider = image1.size.width > image2.size.width;

        this.state = {
            imagesContainerHeight: 0,
            syncedImage1: {
                containerRef: React.createRef(),
                paddingTop: this._calcImgPaddingTop(image1),
                width: image1.size.width
            },
            syncedImage2: {
                containerRef: React.createRef(),
                paddingTop: this._calcImgPaddingTop(image2),
                width: image2.size.width
            }
        };
    }

    componentDidMount() {
        this._handleResize();
    }

    _calcImgPaddingTop(image) {
        return ((image.size.height / image.size.width) * 100).toFixed(2);
    }

    _calcScaleFactor = () => {
        if (!this._shouldScaleSmallestImg) {
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
        if (!this._shouldScaleSmallestImg) {
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

    _calcImagesContainerHeight = () => {
        const {syncedImage1, syncedImage2} = this.state;

        const imgWidth1 = syncedImage1.containerRef.current.offsetWidth;
        const imgWidth2 = syncedImage2.containerRef.current.offsetWidth;

        const imgHeight1 = Math.ceil(imgWidth1 * syncedImage1.paddingTop / 100);
        const imgHeight2 = Math.ceil(imgWidth2 * syncedImage2.paddingTop / 100);

        return Math.max(imgHeight1, imgHeight2);
    }

    _handleResize = () => {
        Promise.resolve().then(() => {
            const {image1, image2} = this.props;
            this._scaleFactor = this._calcScaleFactor();

            this.setState(prevState => ({
                imagesContainerHeight: this._calcImagesContainerHeight(),
                syncedImage1: {
                    ...prevState.syncedImage1,
                    width: this._isFirstImageWider ? image1.size.width : this._getScaledWidth(image1)
                },
                syncedImage2: {
                    ...prevState.syncedImage2,
                    width: this._isFirstImageWider ? this._getScaledWidth(image2) : image2.size.width
                }
            }));
        });
    }

    render() {
        const {syncedImage1, syncedImage2, imagesContainerHeight} = this.state;

        return (
            <ResizeObserver onResize={this._handleResize}>
                <WrappedComponent
                    syncedImage1={syncedImage1}
                    syncedImage2={syncedImage2}
                    imagesContainerHeight={imagesContainerHeight}
                    getRenderedImgWidth={this.getRenderedImgWidth}
                    {...this.props}
                />
            </ResizeObserver>
        );
    }
};
