import useResizeObserver from '@react-hook/resize-observer';
import PropTypes from 'prop-types';
import React, {useEffect, useRef, useState} from 'react';

export default (WrappedComponent) => {
    function WithSyncedScale(props) {
        const {image1, image2} = props;

        const scaleFactor = useRef(1);
        const shouldScale = useRef(image1.size.width !== image2.size.width);
        const isFirstImageWider = useRef(image1.size.width > image2.size.width);

        const [state, setState] = useState({
            syncedImage1: {
                containerRef: useRef(null),
                width: image1.size.width
            },
            syncedImage2: {
                containerRef: useRef(null),
                width: image2.size.width
            },
            resizesNum: 0
        });

        const getRenderedImgWidth = (syncedImage) => {
            return syncedImage.containerRef.current
                ? syncedImage.containerRef.current.offsetWidth
                : syncedImage.width;
        };

        const _calcScaleFactor = () => {
            if (!shouldScale.current) {
                return scaleFactor.current;
            }

            const {image1, image2} = props;
            const {syncedImage1, syncedImage2} = state;

            const imgWidth = isFirstImageWider.current ? image1.size.width : image2.size.width;
            const renderedImgWidth = isFirstImageWider.current
                ? getRenderedImgWidth(syncedImage1)
                : getRenderedImgWidth(syncedImage2);

            return renderedImgWidth / imgWidth;
        };

        const _getScaledWidth = (image) => {
            if (!shouldScale.current) {
                return image.size.width;
            }

            const scaledWidth = Math.ceil(image.size.width * scaleFactor.current);

            return Math.min(scaledWidth, image.size.width);
        };

        const _handleResize = () => {
            if (!shouldScale.current) {
                return;
            }

            const {image1, image2} = props;
            scaleFactor.current = _calcScaleFactor();

            setState({
                syncedImage1: {
                    ...state.syncedImage1,
                    width: isFirstImageWider.current ? image1.size.width : _getScaledWidth(image1)
                },
                syncedImage2: {
                    ...state.syncedImage2,
                    width: isFirstImageWider.current ? _getScaledWidth(image2) : image2.size.width
                },
                resizesNum: state.resizesNum + 1
            });
        };

        useEffect(() => {
            _handleResize();
        }, []);

        const containerRef = useRef(null);
        useResizeObserver(containerRef, _handleResize);

        const {syncedImage1, syncedImage2, resizesNum} = state;

        return (
            <div ref={containerRef}>
                <WrappedComponent
                    syncedImage1={syncedImage1}
                    syncedImage2={syncedImage2}
                    resizesNum={resizesNum}
                    getRenderedImgWidth={getRenderedImgWidth}
                    {...props}
                />
            </div>
        );
    }

    WithSyncedScale.propTypes = {
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
    };

    return WithSyncedScale;
};
