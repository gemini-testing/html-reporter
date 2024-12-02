import {Xmark} from '@gravity-ui/icons';
import {Icon, Select, SelectOption, SelectOptionGroup, Tooltip} from '@gravity-ui/uikit';
import React, {ReactNode} from 'react';

import styles from './index.module.css';

interface AdaptiveSelectProps {
    options: SelectOptionGroup[] | SelectOption[];
    currentValue: string;
    label: string;
    labelIcon: ReactNode;
    autoClose?: boolean;
    onClear?: () => void;
    onOptionClick?: (value: string) => void;
    currentOptionIcon?: ReactNode;
}

/* This component implements a select that has 3 states:
   - Full size, just like regular select
   - Medium size, when label turns into icon
   - Compact size, when only icon is displayed */
export function AdaptiveSelect(props: AdaptiveSelectProps): ReactNode {
    const onUpdate = (ids: string[]): void => {
        if (ids.length === 0) {
            props.onClear?.();
        }
    };

    const renderOption = (option: SelectOption): React.JSX.Element => {
        const onOptionClick = (e: React.MouseEvent): void => {
            e.stopPropagation();
            props.onOptionClick?.(option.value);
        };

        const onClearButtonClick = (e: React.MouseEvent): void => {
            e.stopPropagation();
            onUpdate([]);
        };

        return <div className={styles.optionContainer} onClick={onOptionClick}>
            <span>{option.content}</span>
            {props.currentValue === option.value && <div className={styles.currentOptionIconsContainer}>
                {props.currentOptionIcon}
                <div className={styles.clearButton} onClick={onClearButtonClick}><Icon data={Xmark} /></div>
            </div>}
        </div>;
    };

    return <div className={styles.container}>
        <Tooltip
            disablePortal={true}
            content={props.label}
            contentClassName={styles.tooltip}
            openDelay={0}
            placement={'top'}
        >
            {/* This wrapper is crucial for the tooltip to position correctly */}
            <div>
                <Select
                    className={styles.select}
                    popupClassName={styles.selectPopup}
                    view={'clear'}
                    label={<>
                        <span className={styles.labelText}>{props.label}</span>
                        <div className={styles.labelIconsContainer}>
                            {props.labelIcon}
                            {props.currentValue && <div className={styles.labelDot}></div>}
                        </div>
                    </> as unknown as string}
                    options={props.options}
                    onUpdate={onUpdate}
                    renderOption={renderOption}
                    disablePortal={true}
                    multiple={!props.autoClose}
                    value={[props.currentValue]}
                    hasClear={Boolean(props.currentValue)}
                />
            </div>
        </Tooltip>
    </div>;
}
