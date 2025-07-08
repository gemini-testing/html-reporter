import {ChevronLeft, ChevronRight} from '@gravity-ui/icons';
import {Button, Icon, Select} from '@gravity-ui/uikit';
import React, {ReactNode, Ref} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import styles from './index.module.css';
import {getCurrentNamedImage} from '@/static/new-ui/features/visual-checks/selectors';
import {getIconByStatus} from '@/static/new-ui/utils';
import {changeTestRetry} from '@/static/modules/actions';

export function CompactAttemptPicker(): ReactNode {
    const dispatch = useDispatch();
    const currentImage = useSelector(getCurrentNamedImage);
    const currentBrowserId = currentImage?.browserId;
    const currentBrowser = useSelector(state => currentBrowserId && state.tree.browsers.byId[currentBrowserId]);
    const resultsById = useSelector(state => state.tree.results.byId);

    const totalAttemptsCount = currentBrowser ? currentBrowser.resultIds.length : null;
    const currentAttemptIndex = useSelector(state => currentBrowser ? state.tree.browsers.stateById[currentBrowser.id].retryIndex : null);

    const onUpdate = ([value]: string[]): void => {
        if (currentBrowserId) {
            dispatch(changeTestRetry({browserId: currentBrowserId, retryIndex: Number(value)}));
        }
    };

    const onPreviousClick = (): void => {
        if (currentBrowserId && currentAttemptIndex !== null && currentAttemptIndex > 0) {
            dispatch(changeTestRetry({browserId: currentBrowserId, retryIndex: currentAttemptIndex - 1}));
        }
    };

    const onNextClick = (): void => {
        if (currentBrowserId && currentAttemptIndex !== null && totalAttemptsCount !== null && currentAttemptIndex < totalAttemptsCount - 1) {
            dispatch(changeTestRetry({browserId: currentBrowserId, retryIndex: currentAttemptIndex + 1}));
        }
    };

    if (!currentBrowser) {
        return null;
    }

    return (
        <div className={styles.container}>
            <Button view={'outlined'} onClick={onPreviousClick} disabled={currentAttemptIndex === 0}><Icon data={ChevronLeft}/></Button>
            <Select
                renderControl={({triggerProps: {onClick, onKeyDown}, ref}): React.JSX.Element => (
                    <Button className={styles.attemptSelect} onClick={onClick} onKeyDown={onKeyDown} ref={ref as Ref<HTMLButtonElement>} view={'flat'}>
                        Attempt <span className={styles.attemptNumber}>
                            {currentAttemptIndex !== null ? currentAttemptIndex + 1 : '–'}
                        </span> of <span className={styles.attemptNumber}>{totalAttemptsCount ?? '–'}</span>
                    </Button>
                )}
                renderOption={(option): React.JSX.Element => (
                    <div className={styles.attemptOption}>
                        {getIconByStatus(resultsById[option.data.resultId].status)}
                        <span>{option.content}</span>
                    </div>
                )} popupClassName={styles.attemptSelectPopup}
                onUpdate={onUpdate}
            >
                {currentBrowser.resultIds.map((resultId, index) => (
                    <Select.Option key={index} value={index.toString()} content={`Attempt #${index + 1}`} data={{resultId}}></Select.Option>
                ))}
            </Select>
            <Button view={'outlined'} onClick={onNextClick} disabled={totalAttemptsCount === null || currentAttemptIndex === totalAttemptsCount - 1}>
                <Icon data={ChevronRight}/>
            </Button>
        </div>
    );
}
