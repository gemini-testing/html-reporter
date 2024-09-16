import React, {ReactNode} from 'react';
import {ImageEntity, State} from '@/static/new-ui/types/store';
import {DiffModeId, DiffModes, TestStatus} from '@/constants';
import {DiffViewer} from '../DiffViewer';
import {RadioButton} from '@gravity-ui/uikit';
import {connect} from 'react-redux';
import {bindActionCreators} from 'redux';
import * as actions from '@/static/modules/actions';
import styles from './index.module.css';
import {Screenshot} from '@/static/new-ui/components/Screenshot';

interface AssertViewResultProps {
    result: ImageEntity;
    style?: React.CSSProperties;
    actions: typeof actions;
    diffMode: DiffModeId;
}

function AssertViewResultInternal({result, actions, diffMode, style}: AssertViewResultProps): ReactNode {
    if (result.status === TestStatus.FAIL) {
        const onChangeHandler = (diffMode: DiffModeId): void => {
            actions.changeDiffMode(diffMode);
        };

        return <div style={style} className={styles.diffViewerContainer}>
            <RadioButton onUpdate={onChangeHandler} value={diffMode} className={styles.diffModeSwitcher}>
                {Object.values(DiffModes).map(diffMode =>
                    <RadioButton.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                )}
            </RadioButton>
            <DiffViewer diffMode={diffMode} {...result} />
        </div>;
    } else if (result.status === TestStatus.ERROR) {
        return <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.actualImg} />;
    } else if (result.status === TestStatus.SUCCESS || result.status === TestStatus.UPDATED) {
        return <Screenshot containerStyle={style} containerClassName={styles.screenshot} image={result.expectedImg} />;
    }

    return null;
}

export const AssertViewResult = connect((state: State) => ({
    diffMode: state.view.diffMode
}), (dispatch) => ({actions: bindActionCreators(actions, dispatch)})
)(AssertViewResultInternal);
