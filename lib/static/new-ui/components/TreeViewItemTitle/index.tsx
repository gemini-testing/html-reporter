import {ChevronRight} from '@gravity-ui/icons';
import {Checkbox} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {getToggledCheckboxState, isCheckboxChecked, isCheckboxIndeterminate} from '@/common-utils';
import {EntityType, TreeViewItemData} from '@/static/new-ui/features/suites/components/SuitesPage/types';
import {toggleBrowserCheckbox, toggleGroupCheckbox, toggleSuiteCheckbox} from '@/static/modules/actions';
import {getAreCheckboxesNeeded} from '@/static/new-ui/store/selectors';
import {getItemCheckStatus} from '@/static/new-ui/components/TreeViewItemTitle/selectors';
import styles from './index.module.css';

interface TreeViewItemTitleProps {
    className?: string;
    item: TreeViewItemData;
}

export function TreeViewItemTitle({item}: TreeViewItemTitleProps): React.JSX.Element {
    const dispatch = useDispatch();
    const areCheckboxesNeeded = useSelector(getAreCheckboxesNeeded);
    const groups = useSelector(state => state.tree.groups.byId);
    const checkStatus = useSelector(state => getItemCheckStatus(state, item));
    const isVisualChecksPage = /\/visual-checks/.test(location.hash); // @todo: remove after implement search on visual checks page

    const handleCheckboxClick = (e: React.MouseEvent): void => {
        e.stopPropagation();

        if (item.entityType === EntityType.Group) {
            const group = groups[item.entityId];

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

    const headTitleParts = item.title.slice(0, -1);
    const tailTitlePart = item.title[item.title.length - 1];

    const titleContainerClassName = classNames({
        [styles['title-container--clamped']]: item.entityType === EntityType.Group,
        [styles['title-container--inline']]: item.entityType !== EntityType.Group
    });

    return <div className={styles.container}>
        <div>
            <div className={titleContainerClassName}>
                {item.prefix && <span className={styles.titlePrefix}>{item.prefix}</span>}
                <span className={styles.title}>
                    {headTitleParts.map((titlePart, index) => <React.Fragment key={index}>
                        <span className={index !== headTitleParts.length - 1 ? styles.titlePart : ''}>{titlePart}</span>
                        <ChevronRight height={12} className={styles.titleSeparator}/>
                    </React.Fragment>)}
                    <span className={headTitleParts.length > 0 ? styles.titlePart : ''}>{tailTitlePart}</span>
                </span>
            </div>
            {item.tags && item.tags.length > 0 &&
                <div className={styles.tagsContainer}>
                    {item.tags.map((tag, index) => <span key={index} className={styles.tag}>{tag}</span>)}
                </div>
            }
        </div>
        {(areCheckboxesNeeded && !isVisualChecksPage) &&
            <div className={styles.checkboxWrapper} onClick={handleCheckboxClick}>
                <Checkbox
                    checked={isCheckboxChecked(checkStatus)}
                    indeterminate={isCheckboxIndeterminate(checkStatus)}
                    className={styles.checkbox}
                    size={'m'}
                />
            </div>
        }
    </div>;
}
