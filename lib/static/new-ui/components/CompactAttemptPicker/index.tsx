import {ChevronLeft, ChevronRight} from '@gravity-ui/icons';
import {Button, Icon, Select, Tooltip} from '@gravity-ui/uikit';
import React, {ReactNode, Ref, useMemo} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import styles from './index.module.css';
import {getCurrentNamedImage} from '@/static/new-ui/features/visual-checks/selectors';
import {changeTestRetry} from '@/static/modules/actions';
import {getAssertViewStatusIcon} from '@/static/new-ui/utils/assert-view-status';
import {getImages} from '@/static/new-ui/store/selectors';

export function CompactAttemptPicker(): ReactNode {
    const dispatch = useDispatch();
    const currentImage = useSelector(getCurrentNamedImage);
    const images = useSelector(getImages);
    const currentBrowserId = currentImage?.browserId;
    const currentBrowser = useSelector(state => currentBrowserId && state.tree.browsers.byId[currentBrowserId]);

    const totalAttemptsCount = currentBrowser ? currentBrowser.resultIds.length : null;
    const currentAttemptIndex = useSelector(state => currentBrowser ? state.tree.browsers.stateById[currentBrowser.id].retryIndex : null);

    const onUpdate = ([value]: string[]): void => {
        if (currentBrowserId) {
            dispatch(changeTestRetry({browserId: currentBrowserId, retryIndex: Number(value)}));
        }
    };

    const isDisabled = (next: boolean): boolean => {
        if (currentBrowser && currentAttemptIndex !== null) {
            let i = next ? currentAttemptIndex + 1 : currentAttemptIndex - 1;

            while (next ? (i < currentBrowser?.resultIds.length) : (i >= 0)) {
                const imageId = `${currentBrowser?.resultIds[i]} ${currentImage?.stateName}`;

                if (images[imageId]) {
                    return false;
                }

                i += next ? 1 : -1;
            }
        }

        return true;
    };

    const nextDisabled = useMemo(() => isDisabled(true), [currentAttemptIndex, currentBrowser]);
    const prevDisabled = useMemo(() => isDisabled(false), [currentAttemptIndex, currentBrowser]);

    const onNextPrev = (next: boolean): void => {
        if (currentBrowser && currentAttemptIndex !== null) {
            let nextIndex = null;

            let i = next ? currentAttemptIndex + 1 : currentAttemptIndex - 1;

            while (next ? (i < currentBrowser?.resultIds.length) : (i >= 0)) {
                const imageId = `${currentBrowser?.resultIds[i]} ${currentImage?.stateName}`;

                if (images[imageId]) {
                    nextIndex = i;
                    break;
                }

                i += next ? 1 : -1;
            }

            if (currentBrowserId && nextIndex !== null) {
                dispatch(changeTestRetry({browserId: currentBrowserId, retryIndex: nextIndex}));
            }
        }
    };

    if (!currentBrowser) {
        return null;
    }

    return (
        <div className={styles.container}>
            <Tooltip
                content="Prev screenshot"
                openDelay={0}
                placement="top"
            >
                <Button
                    aria-label="Prev screenshot"
                    view="outlined"
                    onClick={(): void => onNextPrev(false)}
                    disabled={prevDisabled}
                >
                    <Icon data={ChevronLeft}/>
                </Button>
            </Tooltip>
            <Tooltip
                content="Show all attempts"
                openDelay={0}
                placement="top"
            >
                <Select
                    renderControl={({triggerProps: {onClick, onKeyDown}, ref}): React.JSX.Element => (
                        <Button className={styles.attemptSelect} onClick={onClick} onKeyDown={onKeyDown} ref={ref as Ref<HTMLButtonElement>} view={'flat'}>
                                Attempt <span className={styles.attemptNumber}>
                                {currentAttemptIndex !== null ? currentAttemptIndex + 1 : '–'}
                            </span> of <span className={styles.attemptNumber}>{totalAttemptsCount ?? '–'}</span>
                        </Button>
                    )}
                    renderOption={(option): React.JSX.Element => {
                        const imageId = `${option.data.resultId} ${currentImage?.stateName}`;
                        const {icon, className} = getAssertViewStatusIcon(images[imageId] || null);

                        return (
                            <div className={styles.attemptOption}>
                                <span className={className}>{icon}</span>
                                <span>{option.content}</span>
                            </div>
                        );
                    }}
                    popupClassName={styles.attemptSelectPopup}
                    onUpdate={onUpdate}
                >
                    {currentBrowser.resultIds.map((resultId, index) => (
                        <Select.Option key={index} value={index.toString()} content={`Attempt #${index + 1}`} data={{resultId}}></Select.Option>
                    ))}
                </Select>
            </Tooltip>
            <Tooltip
                content="Next screenshot"
                openDelay={0}
                placement="top"
            >
                <Button
                    view="outlined"
                    onClick={(): void => onNextPrev(true)}
                    disabled={nextDisabled}
                >
                    <Icon data={ChevronRight}/>
                </Button>
            </Tooltip>
        </div>
    );
}
