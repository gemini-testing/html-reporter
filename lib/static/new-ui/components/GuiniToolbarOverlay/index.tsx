import React, {ReactNode, useEffect, useState} from 'react';
import {ToolbarOverlay} from '@/static/new-ui/components/ToolbarOverlay';
import {Button, Icon, Modal, TextInput, useToaster} from '@gravity-ui/uikit';
import {CloudArrowUpIn, TriangleExclamation} from '@gravity-ui/icons';

import styles from './index.module.css';
import classNames from 'classnames';
import {useDispatch, useSelector} from 'react-redux';
import {State} from '@/static/new-ui/types/store';
import {
    CommitResult,
    staticAccepterCommitScreenshot,
    staticAccepterUnstageScreenshot, staticAccepterUpdateCommitMessage,
    staticAccepterUpdateToolbarOffset
} from '@/static/modules/actions';
import {Point} from '@/static/new-ui/types';
import {useLocation} from 'react-router-dom';
import {TestStatus} from '@/constants';
import {formatCommitPayload} from '@/static/modules/static-image-accepter';
import {pick} from 'lodash';

export function GuiniToolbarOverlay(): ReactNode {
    const dispatch = useDispatch();
    const toaster = useToaster();

    const isInProgress = useSelector((state: State) => state.processing);
    const allImagesById = useSelector((state: State) => state.tree.images.byId);
    const acceptableImages = useSelector((state: State) => state.staticImageAccepter.acceptableImages);
    const delayedImages = useSelector((state: State) => state.staticImageAccepter.accepterDelayedImages);
    const stagedImages = Object.values(acceptableImages)
        .filter(image => image.commitStatus === TestStatus.STAGED);

    const staticAccepterConfig = useSelector((state: State) => state.config.staticImageAccepter);
    const pullRequestUrl = useSelector((state: State) => state.config.staticImageAccepter.pullRequestUrl);
    const offset = useSelector((state: State) => state.ui.staticImageAccepterToolbar.offset);
    const location = useLocation();

    const [isVisible, setIsVisible] = useState<boolean | null>(null);
    const [isModalVisible, setIsModalVisible] = useState(false);

    const commitMessage = useSelector((state: State) => state.app.staticImageAccepterModal.commitMessage);

    useEffect(() => {
        const newIsVisible = stagedImages.length > 0 &&
            !isInProgress &&
            !isModalVisible &&
            ['/suites', '/visual-checks'].some((path) => location.pathname.startsWith(path));
        if (Boolean(newIsVisible) !== Boolean(isVisible)) {
            setIsVisible(newIsVisible);
        }
    }, [stagedImages, location, isModalVisible]);

    const onOffsetChange = (offset: Point): void => {
        dispatch(staticAccepterUpdateToolbarOffset({offset}));
    };

    const onCommitClick = (): void => {
        setIsModalVisible(true);
    };

    const onCancelClick = (): void => {
        for (const image of stagedImages) {
            dispatch(staticAccepterUnstageScreenshot(image.id));
        }
    };

    const onModalCancelClick = (): void => {
        setIsModalVisible(false);
    };

    const onModalCommitClick = async (): Promise<void> => {
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
                'axiosRequestOptions',
                'meta'
            ]),
            message: commitMessage
        };

        setIsModalVisible(false);
        const result = (await dispatch(staticAccepterCommitScreenshot(imagesInfo, opts))) as CommitResult;

        if (result.error) {
            toaster.add({
                name: 'static-accepter-error',
                title: 'Failed to commit images',
                content: result.error.message + '. See console for details.',
                isClosable: true,
                autoHiding: 5000,
                renderIcon: () => <TriangleExclamation className={styles.errorToasterIcon} width={20} height={20} />,
                className: styles.errorToaster
            });
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
        <Modal open={isModalVisible} onClose={(): void => setIsModalVisible(false)} contentClassName={styles.modalContainer}>
            <div className='text-header-1'>Commit images</div>
            <div className={styles.modalDescription}>Commit with {stagedImages.length} {stagedImages.length > 1 ? 'images' : 'image'} will be added to your pull request at <a href={pullRequestUrl} target='_blank' rel='noreferrer'>{pullRequestUrl}</a>.</div>
            <div className={styles.modalFieldLabel}>Commit Message</div>
            <TextInput className={styles.modalInput} value={commitMessage} onUpdate={onCommitMessageUpdate}/>
            <div className={styles.modalButtonsContainer}>
                <Button view={'flat'} className={styles.button} onClick={onModalCancelClick}>Cancel</Button>
                <Button view={'action'} className={styles.modalButtonPrimary} onClick={onModalCommitClick}><Icon data={CloudArrowUpIn}/>Commit</Button>
            </div>
        </Modal>
    </ToolbarOverlay>;
}
