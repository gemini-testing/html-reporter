import {Select, SelectProps, Tooltip} from '@gravity-ui/uikit';
import React, {ReactElement, ReactNode, useRef} from 'react';

import styles from './index.module.css';
import {ChangedDot} from '../ChangedDot';

interface AdaptiveSelectProps {
    currentValue: string[];
    label: string;
    // Determines whether select should show dot in its compact view
    showDot?: boolean;
    labelIcon: ReactNode;
    autoClose?: boolean;
    multiple?: boolean;
    children: SelectProps['children'];
}

/* This component implements a select that has 2 states:
   - Full size: icon + selected value
   - Compact size: only icon is displayed */
export function AdaptiveSelect(props: AdaptiveSelectProps): ReactNode {
    const selectRef = useRef<HTMLButtonElement>(null);

    const onUpdate = (): void => {
        if (props.autoClose) {
            selectRef.current?.click();
        }
    };

    return <div className={styles.container}>
        <Tooltip
            content={props.label}
            openDelay={0}
            placement={'top'}
        >
            {/* This wrapper is crucial for the tooltip to position correctly */}
            <div className={styles.tooltip}>
                <Select
                    ref={selectRef}
                    renderSelectedOption={(option): ReactElement => option.title ? <span className={styles.selectedOption}>{option.title}</span> : <></>}
                    className={styles.select}
                    popupClassName={styles.selectPopup}
                    view={'clear'}
                    label={<>
                        <div className={styles.labelIconsContainer}>
                            {props.labelIcon}
                            {props.showDot && <ChangedDot className={styles.labelDot} />}
                        </div>
                    </> as unknown as string}
                    onUpdate={onUpdate}
                    getOptionHeight={(option): number => option.data?.height}
                    multiple={props.multiple}
                    value={props.currentValue}
                >
                    {props.children}
                </Select>
            </div>
        </Tooltip>
    </div>;
}
