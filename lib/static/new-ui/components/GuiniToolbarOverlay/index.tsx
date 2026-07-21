import React, {ReactNode, useEffect, useState} from 'react';
import {ToolbarOverlay} from '@/static/new-ui/components/ToolbarOverlay';
import {Button, Icon, Modal, TextInput, useToaster} from '@gravity-ui/uikit';
import {CloudArrowUpIn, TriangleExclamation} from '@gravity-ui/icons';

import styles from './index.module.css';
import classNames from 'classnames';
import {useDispatch, useSelector} from 'react-redux';
import {
    CommitResult,
    staticAccepterCommitScreenshot,
    staticAccepterUnstageScreenshot, staticAccepterUpdateCommitMessage,
    staticAccepterUpdateToolbarOffset
} from '@/static/modules/actions';
import {Point} from '@/static/new-ui/types';
import {useLocation} from 'react-router-dom';
import {TestStatus, PathNames} from '@/constants';
import {formatCommitPayload} from '@/static/modules/static-image-accepter';
import {pick} from 'lodash';
import {
    isStaticAccepterPopupBlockedError,
    preloadStaticAccepter
} from '@/static/modules/static-accepter-v2';
import {getErrorMessage} from '@/static/modules/utils';

type ModulePreloadStatus = 'idle' | 'loading' | 'ready' | 'error';

export function GuiniToolbarOverlay(): ReactNode {
    const dispatch = useDispatch();
    const toaster = useToaster();

    const isInProgress = useSelector(state => state.processing);
    const allImagesById = useSelector(state => state.tree.images.byId);
    const acceptableImages = useSelector(state => state.staticImageAccepter.acceptableImages);
    const delayedImages = useSelector(state => state.staticImageAccepter.accepterDelayedImages);
    const stagedImages = Object.values(acceptableImages)
        .filter(image => image.commitStatus === TestStatus.STAGED);

    const staticAccepterConfig = useSelector(state => state.config.staticImageAccepter);
    const pullRequestUrl = useSelector(state => state.config.staticImageAccepter.pullRequestUrl);
    const moduleUrl = useSelector(state => state.config.staticImageAccepter.moduleUrl);
    const offset = useSelector(state => state.ui.staticImageAccepterToolbar.offset);
    const loadingTitle = useSelector(state => state.app.loading.taskTitle);
    const location = useLocation();

    const [isVisible, setIsVisible] = useState<boolean | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [modulePreloadStatus, setModulePreloadStatus] = useState<ModulePreloadStatus>('idle');
    const [modulePreloadError, setModulePreloadError] = useState<string | null>(null);
    const [operationError, setOperationError] = useState<{message: string; isPopupBlocked: boolean} | null>(null);
    const [isV2OperationInProgress, setIsV2OperationInProgress] = useState(false);

    const commitMessage = useSelector(state => state.app.staticImageAccepterModal.commitMessage);

    useEffect(() => {
        const newIsVisible = stagedImages.length > 0 &&
            !isInProgress &&
            !isModalVisible &&
            [PathNames.suites, PathNames.visualChecks].some((path) => location.pathname.startsWith(path));
        if (Boolean(newIsVisible) !== Boolean(isVisible)) {
            setIsVisible(newIsVisible);
        }
    }, [stagedImages, location, isModalVisible, isInProgress, isVisible]);

    useEffect(() => {
        if (!isModalVisible || !moduleUrl) {
            return;
        }

        let isCurrent = true;

        setModulePreloadStatus('loading');
        setModulePreloadError(null);
        preloadStaticAccepter(moduleUrl).then(
            () => {
                if (isCurrent) {
                    setModulePreloadStatus('ready');
                }
            },
            (error) => {
                if (isCurrent) {
                    setModulePreloadStatus('error');
                    setModulePreloadError(getErrorMessage(error));
                }
            }
        );

        return () => {
            isCurrent = false;
        };
    }, [isModalVisible, moduleUrl]);

    const onOffsetChange = (offset: Point): void => {
        dispatch(staticAccepterUpdateToolbarOffset({offset}));
    };

    const onCommitClick = (): void => {
        setOperationError(null);
        setIsModalVisible(true);
    };

    const onCancelClick = (): void => {
        dispatch(staticAccepterUnstageScreenshot(stagedImages.map(image => image.id)));
    };

    const onModalCancelClick = (): void => {
        if (isV2OperationInProgress) {
            return;
        }

        setIsModalVisible(false);
    };

    const showCommitError = (error: unknown): void => {
        const message = getErrorMessage(error);

        if (moduleUrl) {
            setOperationError({message, isPopupBlocked: isStaticAccepterPopupBlockedError(error)});
        }

        toaster.add({
            name: 'static-accepter-error',
            title: 'Failed to commit images',
            content: message + '. See console for details.',
            isClosable: true,
            autoHiding: 5000,
            renderIcon: () => <TriangleExclamation className='toaster__icon--error' width={20} height={20} />,
            className: 'toaster'
        });
    };

    const onModulePreloadRetry = (): void => {
        if (!moduleUrl) {
            return;
        }

        setModulePreloadStatus('loading');
        setModulePreloadError(null);
        preloadStaticAccepter(moduleUrl).then(
            () => setModulePreloadStatus('ready'),
            (error) => {
                setModulePreloadStatus('error');
                setModulePreloadError(getErrorMessage(error));
            }
        );
    };

    const onModalCommitClick = (): void => {
        try {
            const imagesInfo = formatCommitPayload(
                Object.values(acceptableImages),
                allImagesById,
                delayedImages
            );
            const opts = {
                ...pick(staticAccepterConfig, [
                    'repositoryUrl',
                    'pullRequestUrl',
                    'serviceUrl',
                    'moduleUrl',
                    'axiosRequestOptions',
                    'meta'
                ]),
                message: commitMessage
            };

            if (!moduleUrl) {
                setIsModalVisible(false);
            } else {
                setOperationError(null);
                setIsV2OperationInProgress(true);
            }

            // The v2 thunk calls static accepter synchronously during this dispatch, before this handler yields.
            const operation = dispatch(staticAccepterCommitScreenshot(imagesInfo, opts)) as unknown as Promise<CommitResult>;

            void operation.then((result) => {
                if (result.error) {
                    showCommitError(result.error);
                    return;
                }

                if (moduleUrl) {
                    setIsModalVisible(false);
                }
            }, showCommitError).finally(() => setIsV2OperationInProgress(false));
        } catch (error) {
            setIsV2OperationInProgress(false);
            showCommitError(error);
        }
    };

    const onCommitMessageUpdate = (newCommitMessage: string): void => {
        dispatch(staticAccepterUpdateCommitMessage({commitMessage: newCommitMessage}));
    };

    return <ToolbarOverlay isVisible={isVisible} className={styles.container} draggable={{offset, onOffsetChange}}>
        <div>{stagedImages.length} {stagedImages.length > 1 ? 'images are' : 'image is'} staged for commit</div>
        <div className={styles.buttonsContainer}>
            <Button view={'flat-contrast'} className={styles.button} onClick={onCancelClick}>Cancel</Button>
            <Button view={'normal-contrast'} className={classNames(styles.primaryButton, styles.button)} onClick={onCommitClick}>Commit...</Button>
        </div>
        <Modal open={isModalVisible} onClose={onModalCancelClick} contentClassName={styles.modalContainer}>
            <div className='text-header-1'>Commit images</div>
            <div className={styles.modalDescription}>Commit with {stagedImages.length} {stagedImages.length > 1 ? 'images' : 'image'} will be added to your pull request at <a href={pullRequestUrl} target='_blank' rel='noreferrer'>{pullRequestUrl}</a>.</div>
            <div className={styles.modalFieldLabel}>Commit Message</div>
            <TextInput className={styles.modalInput} value={commitMessage} onUpdate={onCommitMessageUpdate} disabled={isV2OperationInProgress}/>
            {moduleUrl && modulePreloadStatus === 'error' &&
                <div className={styles.modalError} role='alert'>
                    <div>Failed to load Static Accepter: {modulePreloadError}</div>
                    <Button view='flat' onClick={onModulePreloadRetry}>Retry loading</Button>
                </div>}
            {isV2OperationInProgress && <div className={styles.modalStatus}>{loadingTitle}</div>}
            {operationError &&
                <div className={styles.modalError} role='alert'>
                    <div>{operationError.message}</div>
                    {operationError.isPopupBlocked &&
                        <div>Allow popups for this report and press Commit again.</div>}
                </div>}
            <div className={styles.modalButtonsContainer}>
                {moduleUrl && modulePreloadStatus === 'loading' && !isV2OperationInProgress &&
                    <div className={styles.modalFooterStatus}>Loading Static Accepter…</div>}
                <Button view={'flat'} className={styles.button} onClick={onModalCancelClick} disabled={isV2OperationInProgress}>Cancel</Button>
                <Button
                    view={'action'}
                    className={styles.modalButtonPrimary}
                    onClick={onModalCommitClick}
                    disabled={Boolean(moduleUrl) && (modulePreloadStatus !== 'ready' || isV2OperationInProgress || !commitMessage.trim())}
                    loading={isV2OperationInProgress}
                >
                    <Icon data={CloudArrowUpIn}/>Commit
                </Button>
            </div>
        </Modal>
    </ToolbarOverlay>;
}
