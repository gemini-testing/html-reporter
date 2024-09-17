import classNames from 'classnames';
import {CoordBounds} from 'looks-same';
import React, {ReactNode, useCallback, useRef} from 'react';
import {createPortal} from 'react-dom';

import {addTimestamp, encodePathSegments} from '@/static/new-ui/components/Screenshot/utils';
import {DiffCircle, DiffCircleHandle} from '@/static/new-ui/components/Screenshot/DiffCircle';
import {ImageSize} from '@/types';
import styles from './index.module.css';

interface ScreenshotProps {
    containerClassName?: string;
    containerStyle?: React.CSSProperties;
    imageClassName?: string;
    diffClusters?: CoordBounds[];
    /** When cache is disabled, current timestamp is added to image src to prevent it from caching. */
    disableCache?: boolean;
    image: {
        /** URL or path to the image. Local paths will be automatically encoded. */
        path: string;
        size?: ImageSize;
    };
    style?: React.CSSProperties;
}

export function Screenshot(props: ScreenshotProps): ReactNode {
    const imageRef = useRef<HTMLImageElement | null>(null);
    const circlesRef = useRef<DiffCircleHandle[]>([]);

    const handleDiffClick = useCallback(() => {
        if (!circlesRef.current) {
            return;
        }

        for (const circle of circlesRef.current) {
            circle.pulse();
        }
    }, [circlesRef]);

    const {image} = props;

    const encodedImageSrc = encodePathSegments(image.path);
    const imageSrc = props.disableCache ? addTimestamp(encodedImageSrc) : encodedImageSrc;

    const containerClassName = classNames(styles.container, props.containerClassName, {
        [styles['container--clickable']]: props.diffClusters?.length
    });
    const containerStyle: React.CSSProperties = Object.assign({}, props.containerStyle);
    if (image.size) {
        type CSSProperty = 'width';
        containerStyle['--natural-width' as CSSProperty] = image.size.width;
        containerStyle['--natural-height' as CSSProperty] = image.size.height;
    }

    const imageClassName = classNames(styles.image, props.imageClassName);
    const imageStyle: React.CSSProperties = Object.assign({}, props.style);
    if (image.size) {
        imageStyle.aspectRatio = `${image.size.width} / ${image.size.height} auto`;
    }

    let diffCircles: ReactNode[] = [];
    if (props.diffClusters?.length) {
        diffCircles = props.diffClusters.map((c, id) => image.size && createPortal(<DiffCircle
            diffImageOriginalSize={image.size}
            diffImageRef={imageRef}
            diffCluster={c}
            ref={(handle): void => {
                if (handle) {
                    circlesRef.current[id] = handle;
                }
            }}
            key={id}
        />, document.body));
    }

    return <div className={containerClassName} onClick={handleDiffClick} style={containerStyle}>
        <img className={imageClassName} src={imageSrc} ref={imageRef} style={imageStyle}/>
        {diffCircles}
    </div>;
}
