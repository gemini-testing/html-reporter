import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';
import classnames from 'classnames';
import {Icon, SegmentedRadioGroup as RadioButton, Select, Tooltip} from '@gravity-ui/uikit';
import {ArrowRightArrowLeft} from '@gravity-ui/icons';

import {getAvailableDiffModes} from '@/static/new-ui/utils/diffModes';
import {DiffModeId, Page} from '@/constants';
import styles from './index.module.css';
import {usePage} from '@/static/new-ui/hooks/usePage';
import {setDiffMode} from '@/static/modules/actions';
import {setVisualChecksDiffMode} from '@/static/modules/actions/visual-checks-page';

interface DiffModeSelectorProps {
    className?: string;
    onlySelect?: boolean;
    qa?: string;
}

export const DiffModeSelector = (props: DiffModeSelectorProps): ReactNode => {
    const dispatch = useDispatch();
    const page = usePage();

    const diffMode = useSelector(state => page === Page.suitesPage ? state.view.diffMode : state.app.visualChecksPage.diffMode);

    const onDiffModeChangeHandler = (diffModeId: DiffModeId): void => {
        dispatch(page === Page.suitesPage ? setDiffMode({diffModeId}) : setVisualChecksDiffMode(diffModeId));
    };

    const availableDiffModes = getAvailableDiffModes(page);

    return (
        <div className={classnames(styles.diffModeContainer, props.className, props.onlySelect && styles.onlySelect)} data-qa="diff-mode-container">
            {!props.onlySelect && (
                <RadioButton onUpdate={onDiffModeChangeHandler} value={diffMode} className={styles.diffModeSwitcher}>
                    {availableDiffModes.map(diffMode =>
                        <RadioButton.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                    )}
                </RadioButton>
            )}
            <Tooltip
                content="Diff mode"
                openDelay={0}
                placement="top"
            >
                <Select
                    className={styles.diffModeSelect}
                    qa={props.qa}
                    label={<Icon data={ArrowRightArrowLeft}/> as unknown as string} value={[diffMode]}
                    onUpdate={([diffMode]): void => onDiffModeChangeHandler(diffMode as DiffModeId)}
                    multiple={false}
                >
                    {availableDiffModes.map(diffMode =>
                        <Select.Option value={diffMode.id} content={diffMode.title} title={diffMode.description} key={diffMode.id}/>
                    )}
                </Select>
            </Tooltip>
        </div>
    );
};
