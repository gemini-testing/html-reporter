import React, {ReactNode} from 'react';
import {connect} from 'react-redux';

import {ImageEntity, State} from '@/static/new-ui/types/store';
import {DiffModeId, TestStatus} from '@/constants';
import {DiffViewer} from '../DiffViewer';
import {Screenshot} from '@/static/new-ui/components/Screenshot';
import {ImageLabel} from '@/static/new-ui/components/ImageLabel';
import {getImageDisplayedSize} from '@/static/new-ui/utils';
import styles from './index.module.css';

interface AssertViewResultProps {
    result: ImageEntity;
    style?: React.CSSProperties;
    diffMode: DiffModeId;
}

function AssertViewResultInternal({result, diffMode, style}: AssertViewResultProps): ReactNode {
    if (result.status === TestStatus.FAIL) {
        return <DiffViewer diffMode={diffMode} {...result} />;
    } else if (result.status === TestStatus.ERROR) {
        return <div className={styles.screenshotContainer}>
            <ImageLabel title={'Actual'} subtitle={getImageDisplayedSize(result.actualImg)} />
            <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.actualImg} />
        </div>;
    } else if (result.status === TestStatus.SUCCESS || result.status === TestStatus.UPDATED) {
        return <div className={styles.screenshotContainer}>
            <ImageLabel title={'Expected'} subtitle={getImageDisplayedSize(result.expectedImg)} />
            <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.expectedImg} />
        </div>;
    } else if (result.status === TestStatus.STAGED) {
        return <div className={styles.screenshotContainer}>
            <ImageLabel title={'Staged'} subtitle={getImageDisplayedSize(result.actualImg)} />
            <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.actualImg} />
        </div>;
    } else if (result.status === TestStatus.COMMITED) {
        return <div className={styles.screenshotContainer}>
            <ImageLabel title={'Committed'} subtitle={getImageDisplayedSize(result.actualImg)} />
            <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.actualImg} />
        </div>;
    }

    return null;
}

export const AssertViewResult = connect((state: State) => ({
    diffMode: state.view.diffMode
}))(AssertViewResultInternal);
