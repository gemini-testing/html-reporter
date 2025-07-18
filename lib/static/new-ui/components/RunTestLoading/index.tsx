import React, {ReactNode} from 'react';
import {Spin} from '@gravity-ui/uikit';

import styles from './index.module.css';

export const RunTestLoading = (): ReactNode => (
    <div className={styles.container}>
        <Spin size={'xs'} style={{marginRight: '4px'}} />Test is running
    </div>
);
