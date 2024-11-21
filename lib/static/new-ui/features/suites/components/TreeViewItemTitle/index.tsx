import React, {useEffect, useRef} from 'react';
import {EntityType, TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import styles from './index.module.css';
import classNames from 'classnames';
import {Checkbox} from '@gravity-ui/uikit';
import {useDispatch, useSelector} from 'react-redux';
import {toggleBrowserCheckbox, toggleGroupCheckbox, toggleSuiteCheckbox} from '@/static/modules/actions';
import {getToggledCheckboxState, isCheckboxChecked, isCheckboxIndeterminate} from '@/common-utils';
import {getAreCheckboxesNeeded} from '@/static/new-ui/store/selectors';
import {getItemCheckStatus} from '@/static/new-ui/features/suites/components/TreeViewItemTitle/selectors';
import {GroupEntity} from '@/static/new-ui/types/store';

interface TreeViewItemTitleProps {
    className?: string;
    item: TreeViewItemData;
}

export function TreeViewItemTitle({item, className}: TreeViewItemTitleProps): React.JSX.Element {
    const dispatch = useDispatch();
    const areCheckboxesNeeded = useSelector(getAreCheckboxesNeeded);
    const groups = useSelector(state => state.tree.groups.byId);
    const checkStatus = useSelector(state => getItemCheckStatus(state, item));
    const ref = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (ref.current) {
            ref.current.onclick = (e): void => {
                e.stopPropagation();

                if (item.entityType === EntityType.Group) {
                    const group = Object.values(groups).find(group => group.id === item.entityId) as GroupEntity;

                    dispatch(toggleGroupCheckbox({
                        browserIds: group.browserIds,
                        checkStatus: getToggledCheckboxState(checkStatus)
                    }));
                } else if (item.entityType === EntityType.Suite) {
                    dispatch(toggleSuiteCheckbox({
                        suiteId: item.entityId,
                        checkStatus: getToggledCheckboxState(checkStatus)
                    }));
                } else if (item.entityType === EntityType.Browser) {
                    dispatch(toggleBrowserCheckbox({
                        suiteBrowserId: item.entityId,
                        checkStatus: getToggledCheckboxState(checkStatus)
                    }));
                }
            };
        }
    }, [ref, item, checkStatus]);

    return <div className={styles.container}>
        <div>
            {item.prefix && <span className={styles.titlePrefix}>{item.prefix}</span>}
            <span className={styles.title}>{item.title}</span>
            {item.tags && item.tags.length > 0 &&
                <div className={styles.tagsContainer}>
                    {item.tags.map((tag, index) => <span key={index} className={styles.tag}>{tag}</span>)}
                </div>
            }
        </div>
        {
            item.entityType === EntityType.Browser &&
            item.errorTitle &&
            <span className={classNames(styles['tree-view-item__error-title'], className)}>{item.errorTitle}</span>
        }
        {areCheckboxesNeeded && <Checkbox checked={isCheckboxChecked(checkStatus)} indeterminate={isCheckboxIndeterminate(checkStatus)} className={styles.checkbox} size={'m'} controlRef={ref}/>}
    </div>;
}
