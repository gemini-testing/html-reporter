import React, {ReactNode} from 'react';
import {ImageEntity, State} from '@/static/new-ui/types/store';
import {DiffModeId, TestStatus} from '@/constants';
import {DiffViewer} from '../DiffViewer';
import {connect} from 'react-redux';
import styles from './index.module.css';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

interface AssertViewResultProps {
    result: ImageEntity;
    style?: React.CSSProperties;
    diffMode: DiffModeId;
}

function AssertViewResultInternal({result, diffMode, style}: AssertViewResultProps): ReactNode {
    if (result.status === TestStatus.FAIL) {
        return <DiffViewer diffMode={diffMode} {...result} />;
    } else if (result.status === TestStatus.ERROR) {
        return <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.actualImg} />;
    } else if (result.status === TestStatus.SUCCESS || result.status === TestStatus.UPDATED) {
        return <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.expectedImg} />;
    }

    return null;
}

export const AssertViewResult = connect((state: State) => ({
    diffMode: state.view.diffMode
}))(AssertViewResultInternal);
