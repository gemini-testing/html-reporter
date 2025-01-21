import React, {ReactNode} from 'react';
import {connect} from 'react-redux';

import {ImageEntity} from '@/static/new-ui/types/store';
import {DiffModeId, TestStatus} from '@/constants';
import {DiffViewer} from '../DiffViewer';
import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageLabel} from '@/static/new-ui/components/ImageLabel';
import {getImageDisplayedSize} from '@/static/new-ui/utils';
import styles from './index.module.css';
import {ErrorHandler} from '../../features/error-handling/components/ErrorHandling';

interface AssertViewResultProps {
    result: ImageEntity;
    style?: React.CSSProperties;
    diffMode: DiffModeId;
}

function AssertViewResultInternal({result, diffMode, style}: AssertViewResultProps): ReactNode {
    if (result.status === TestStatus.FAIL) {
        return <ErrorHandler.Root watchFor={[result]} fallback={<ErrorHandler.FallbackCardCrash />}>
            <DiffViewer diffMode={diffMode} {...result} />
        </ErrorHandler.Root>;
    }

    if (result.status === TestStatus.ERROR) {
        return <ErrorHandler.Root watchFor={[result]} fallback={<ErrorHandler.FallbackCardCrash />}>
            <div className={styles.screenshotContainer}>
                <ImageLabel title={'Actual'} subtitle={getImageDisplayedSize(result.actualImg)} />
                <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.actualImg} />
            </div>
        </ErrorHandler.Root>;
    }

    if (result.status === TestStatus.SUCCESS || result.status === TestStatus.UPDATED) {
        return <ErrorHandler.Root watchFor={[result]} fallback={<ErrorHandler.FallbackCardCrash />}>
            <div className={styles.screenshotContainer}>
                <ImageLabel title={'Expected'} subtitle={getImageDisplayedSize(result.expectedImg)} />
                <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.expectedImg} />
            </div>
        </ErrorHandler.Root>;
    }

    if (result.status === TestStatus.STAGED) {
        return <ErrorHandler.Root watchFor={[result]} fallback={<ErrorHandler.FallbackCardCrash />}>
            <div className={styles.screenshotContainer}>
                <ImageLabel title={'Staged'} subtitle={getImageDisplayedSize(result.actualImg)} />
                <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.actualImg} />
            </div>
        </ErrorHandler.Root>;
    }

    if (result.status === TestStatus.COMMITED) {
        return <ErrorHandler.Root watchFor={[result]} fallback={<ErrorHandler.FallbackCardCrash />}>
            <div className={styles.screenshotContainer}>
                <ImageLabel title={'Committed'} subtitle={getImageDisplayedSize(result.actualImg)} />
                <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.actualImg} />
            </div>
        </ErrorHandler.Root>;
    }

    return null;
}

export const AssertViewResult = connect(state => ({
    diffMode: state.view.diffMode
}))(AssertViewResultInternal);
