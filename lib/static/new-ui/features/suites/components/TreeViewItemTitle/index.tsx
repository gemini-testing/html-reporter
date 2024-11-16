import React, {useEffect, useRef} from 'react';
import {TreeViewData, TreeViewItemType} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import styles from './index.module.css';
import classNames from 'classnames';
import {Checkbox} from '@gravity-ui/uikit';
import {useDispatch, useSelector} from 'react-redux';
import {toggleBrowserCheckbox, toggleSuiteCheckbox} from '@/static/modules/actions';
import {getToggledCheckboxState, isCheckboxChecked, isCheckboxIndeterminate} from '@/common-utils';
import {getAreCheckboxesNeeded} from '@/static/new-ui/store/selectors';

interface TreeViewItemTitleProps {
    className?: string;
    item: TreeViewData;
}

export function TreeViewItemTitle({item, className}: TreeViewItemTitleProps): React.JSX.Element {
    const dispatch = useDispatch();
    const areCheckboxesNeeded = useSelector(getAreCheckboxesNeeded);
    const checkStatus = useSelector(state =>
        item.type === TreeViewItemType.Suite ? state.tree.suites.stateById[item.id].checkStatus : state.tree.browsers.stateById[item.id].checkStatus);
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.onclick = (e): void => {
                e.stopPropagation();

                if (item.type === TreeViewItemType.Suite) {
                    dispatch(toggleSuiteCheckbox({
                        suiteId: item.id,
                        checkStatus: getToggledCheckboxState(checkStatus)
                    }));
                } else if (item.type === TreeViewItemType.Browser) {
                    dispatch(toggleBrowserCheckbox({
                        suiteBrowserId: item.id,
                        checkStatus: getToggledCheckboxState(checkStatus)
                    }));
                }
            };
        }
    }, [ref, item, checkStatus]);

    return <div className={styles.container}>
        <span>{item.title}</span>
        {
            item.type === TreeViewItemType.Browser &&
            item.errorTitle &&
            <span className={classNames(styles['tree-view-item__error-title'], className)}>{item.errorTitle}</span>
        }
        {areCheckboxesNeeded && <Checkbox checked={isCheckboxChecked(checkStatus)} indeterminate={isCheckboxIndeterminate(checkStatus)} className={styles.checkbox} size={'m'} controlRef={ref}/>}
    </div>;
}
