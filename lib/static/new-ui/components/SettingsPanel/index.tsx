import {ArrowUturnCcwLeft} from '@gravity-ui/icons';
import {Button, Icon, Select, TextInput} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {LocalStorageKey, UiMode} from '@/constants/local-storage';
import * as actions from '@/static/modules/actions';
import {State} from '@/static/new-ui/types/store';
import useLocalStorage from '@/static/hooks/useLocalStorage';
import styles from './index.module.css';

export function SettingsPanel(): ReactNode {
    const dispatch = useDispatch();

    const baseHost = useSelector((state: State) => state.view.baseHost);
    const [, setUiMode] = useLocalStorage(LocalStorageKey.UIMode, UiMode.New);

    const onBaseHostChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        dispatch(actions.updateBaseHost(event.target.value));
    };

    const onOldUiButtonClick = (): void => {
        setUiMode(UiMode.Old);

        window.location.pathname = window.location.pathname.replace(/\/new-ui(\.html)?$/, (_match, ending) => ending ? '/index.html' : '/');
    };

    return <div className={styles.container}>
        <h2 className={classNames('text-display-1')}>Settings</h2>
        <div className={styles.separator}/>
        <div>
            <div className={classNames('text-header-1', styles.settingTitle)}>Base Host</div>
            <div className={styles.settingSubtitle}>URLs in Meta and in test steps&apos; commands are affected by
                this.
            </div>
            <TextInput className={styles.settingControl} onChange={onBaseHostChange} value={baseHost}/>
        </div>
        <div className={styles.separator}/>
        <div>
            <div className={classNames('text-header-1', styles.settingTitle)}>New UI</div>
            <div className={styles.settingSubtitle}>Minimalistic yet informative, the new UI offers a cleaner look and
                optimised screen space usage.
            </div>
            <Button className={classNames(styles.settingControl, 'regular-button')} onClick={onOldUiButtonClick}>
                <Icon data={ArrowUturnCcwLeft}/>Switch back to the old UI
            </Button>
        </div>
        <div className={styles.separator}/>
        <div>
            <div className={classNames('text-header-1', styles.settingTitle)}>Theme</div>
            <div className={styles.settingSubtitle}>Currently only light theme is available — stay tuned for night mode.</div>
            <Select className={classNames(styles.settingControl, 'regular-button')} value={['Light']} width={'max'} disabled={true}/>
        </div>
    </div>;
}
