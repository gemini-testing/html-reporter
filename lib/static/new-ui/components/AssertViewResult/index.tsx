import React, {ReactNode} from 'react';
import classNames from 'classnames';

import {ImageEntity} from '@/static/new-ui/types/store';
import {DiffModeId, DiffModes, TestStatus} from '@/constants';
import {DiffViewer} from '../DiffViewer';
import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageLabel} from '@/static/new-ui/components/ImageLabel';
import {getImageDisplayedSize} from '@/static/new-ui/utils';
import styles from './index.module.css';

interface AssertViewResultProps {
    result: ImageEntity;
    style?: React.CSSProperties;
    diffMode: DiffModeId;
    labelClassName?: string;
    magnifier?: React.RefObject<HTMLElement>
}

export function AssertViewResult({result, diffMode, style, labelClassName, magnifier}: AssertViewResultProps): ReactNode {
    if (result.status === TestStatus.FAIL) {
        return (
            <DiffViewer
                labelClassName={labelClassName}
                diffMode={diffMode}
                magnifier={magnifier}
                {...result}
            />
        );
    }

    if (result.status === TestStatus.ERROR) {
        const sbsFitStyle = diffMode === DiffModes.THREE_UP_SCALED_TO_FIT.id ? {'--desired-height': 'calc(100vh - 350px)'} : {};

        return (
            <div className={styles.screenshotContainer} style={style as React.CSSProperties}>
                <ImageLabel className={labelClassName} title={'Actual'} subtitle={getImageDisplayedSize(result.actualImg)} />
                <Screenshot
                    stopClickPropagation={false}
                    magnifier={magnifier}
                    containerStyle={{...sbsFitStyle, ...style}}
                    containerClassName={classNames(styles.screenshot, 'image-outline')}
                    image={result.actualImg}
                    {...result}
                />
            </div>
        );
    }

    if (result.status === TestStatus.SUCCESS || result.status === TestStatus.UPDATED) {
        return (
            <div className={styles.screenshotContainer}>
                <ImageLabel className={labelClassName} title={'Expected'} subtitle={getImageDisplayedSize(result.expectedImg)} />
                <Screenshot
                    stopClickPropagation={false}
                    magnifier={magnifier}
                    containerStyle={style}
                    containerClassName={classNames(styles.screenshot, 'image-outline')}
                    image={result.expectedImg}
                />
            </div>
        );
    }

    if (result.status === TestStatus.STAGED) {
        return (
            <div className={styles.screenshotContainer}>
                <ImageLabel className={labelClassName} title={'Staged'} subtitle={getImageDisplayedSize(result.actualImg)} />
                <Screenshot
                    stopClickPropagation={false}
                    magnifier={magnifier}
                    containerStyle={style}
                    containerClassName={styles.screenshot}
                    image={result.actualImg}
                />
            </div>
        );
    }

    if (result.status === TestStatus.COMMITED) {
        return (
            <div className={styles.screenshotContainer}>
                <ImageLabel className={labelClassName} title={'Committed'} subtitle={getImageDisplayedSize(result.actualImg)} />
                <Screenshot
                    stopClickPropagation={false}
                    magnifier={magnifier}
                    containerStyle={style}
                    containerClassName={styles.screenshot}
                    image={result.actualImg}
                />
            </div>
        );
    }

    return null;
}
