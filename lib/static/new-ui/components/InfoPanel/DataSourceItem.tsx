import {Icon, IconProps} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode} from 'react';

import styles from './DataSourceItem.module.css';

interface DataSourceItemProps {
    icon: IconProps['data'];
    title: string;
    success: boolean;
    statusCode?: number | string;
    url?: string;
}

export function DataSourceItem(props: DataSourceItemProps): ReactNode {
    const urlTitle = props.url?.replace(/^https?:\/\//, '');

    return <div className={styles.dataSourceItem}>
        <div className={styles.dataSourceTitleContainer}>
            <Icon data={props.icon} className={styles.dataSourceIcon}/>
            {props.url && urlTitle ?
                // Here we want to place ellipsis in the middle of the long url, e.g. example.com/lo...ng/1234.sqlite
                <a href={props.url} className={styles.title} title={props.title}>
                    <span className={styles.ellipsis} style={{'--max-width': '130px'} as React.CSSProperties}>{urlTitle.slice(0, -24)}</span>
                    {urlTitle.slice(-24)}
                </a> :
                <span className={styles.ellipsis}>{props.title}</span>}
        </div>
        <div className={styles.dataSourceStatus}><span>{props.success ? 'OK' : (props.statusCode && typeof props.statusCode === 'number' ? `E${props.statusCode}` : 'ERR')}</span>
            <div
                className={classNames(styles.dataSourceStatusCircle, props.success ? styles.dataSourceStatusCircleOnline : styles.dataSourceStatusCircleOffline)}></div>
        </div>
    </div>;
}
