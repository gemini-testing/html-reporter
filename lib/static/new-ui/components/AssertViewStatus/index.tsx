import React, {ReactNode} from 'react';
import {ImageEntity, ImageEntityError} from '@/static/new-ui/types/store';
import {TestStatus} from '@/constants';
import {Icon} from '@gravity-ui/uikit';
import {ArrowsRotateLeft, CircleCheck, CircleDashed, CircleExclamation} from '@gravity-ui/icons';
import {isNoRefImageError} from '@/common-utils';
import styles from './index.module.css';

interface AssertViewStatusProps {
    image: ImageEntity | null;
}

export function AssertViewStatus({image}: AssertViewStatusProps): ReactNode {
    let status = <><Icon data={CircleDashed} width={16}/><span>Failed to compare</span></>;

    if (image === null) {
        status = <><Icon data={CircleDashed} width={16}/><span>Image is absent</span></>;
    } else if (image.status === TestStatus.SUCCESS) {
        status = <><Icon data={CircleCheck} width={16}/><span>Images match</span></>;
    } else if (isNoRefImageError((image as ImageEntityError).error)) {
        status = <><Icon data={CircleExclamation} width={16}/><span>Reference not found</span></>;
    } else if (image.status === TestStatus.FAIL) {
        status = <><Icon data={CircleExclamation} width={16}/><span>Difference detected</span></>;
    } else if (image.status === TestStatus.UPDATED) {
        status = <><Icon data={ArrowsRotateLeft} width={16}/><span>Reference updated</span></>;
    }

    return <div className={styles.container}>{status}</div>;
}
