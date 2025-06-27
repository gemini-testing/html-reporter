import {ArrowUturnCcwLeft} from '@gravity-ui/icons';
import {Button, Divider, Icon, Select, TextInput} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode, useCallback} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {TimeTravelFeature} from '@/constants';
import {LocalStorageKey, UiMode} from '@/constants/local-storage';
import * as actions from '@/static/modules/actions';
import useLocalStorage from '@/static/hooks/useLocalStorage';
import {AsidePanel} from '@/static/new-ui/components/AsidePanel';
import {PanelSection} from '@/static/new-ui/components/PanelSection';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import {NamedSwitch} from '@/static/new-ui/components/NamedSwitch';
import {isApiErrorResponse, updateTimeTravelSettings} from '../../utils/api';
import {ExtensionPoint} from '@/static/new-ui/features/plugins/components/ExtensionPoint';
import {ExtensionPointName} from '@/static/new-ui/features/plugins/types';

import styles from './index.module.css';

export function SettingsPanel(): ReactNode {
    const dispatch = useDispatch();
    const analytics = useAnalytics();

    const baseHost = useSelector(state => state.view.baseHost);

    const isTimeTravelAvailable = useSelector(state => state.app.availableFeatures.some(f => f.name === TimeTravelFeature.name));

    const [, setUiMode] = useLocalStorage(LocalStorageKey.UIMode, UiMode.New);
    const [isRecommendedTimeTravelSettingsEnabled, setRecommendedTimeTravelSettingsEnabled] = useLocalStorage(LocalStorageKey.TimeTravelUseRecommendedSettings, true);

    const onBaseHostChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        dispatch(actions.updateBaseHost(event.target.value));
    };

    const onOldUiButtonClick = (): void => {
        analytics?.trackFeatureUsage({featureName: 'Switch to old UI'});
        setUiMode(UiMode.Old);

        window.location.pathname = window.location.pathname.replace(/\/new-ui(\.html)?$/, (_match, ending) => ending ? '/index.html' : '/');
    };

    const onTimeTravelRecommendedSettingsToggle = useCallback(async (enabled: boolean): Promise<void> => {
        if (!isTimeTravelAvailable) {
            return;
        }

        analytics?.trackFeatureUsage({featureName: enabled ? 'Enable Time Travel Recommended Settings' : 'Disable Time Travel Recommended Settings'});
        setRecommendedTimeTravelSettingsEnabled(enabled);

        const response = await updateTimeTravelSettings({useRecommendedSettings: enabled});
        if (isApiErrorResponse(response)) {
            console.error('Failed to update time travel settings:', response.error.message);
        } else {
            dispatch(actions.setBrowserFeatures({browserFeatures: response.data.browserFeatures}));
        }
    }, [analytics, setRecommendedTimeTravelSettingsEnabled]);

    return <AsidePanel title={'Settings'}>
        <PanelSection title={'Base Host'} description={<>URLs in Meta and in test steps&apos; commands are affected by this.</>}>
            <TextInput onChange={onBaseHostChange} value={baseHost}/>
        </PanelSection>
        <Divider orientation={'horizontal'} className={styles.divider}/>
        <PanelSection title={'New UI'} description={'Minimalistic yet informative, the new UI offers a cleaner look and optimised screen space usage.'}>
            <Button className={classNames(styles.settingControl, 'regular-button')} onClick={onOldUiButtonClick}>
                <Icon data={ArrowUturnCcwLeft}/>Switch back to the old UI
            </Button>
        </PanelSection>
        <Divider orientation={'horizontal'} className={styles.divider}/>
        <PanelSection title={'Theme'} description={'Currently only light theme is available — stay tuned for night mode.'}>
            <Select className={classNames(styles.settingControl, 'regular-button')} value={['Light']} width={'max'} disabled={true}/>
        </PanelSection>
        <Divider orientation={'horizontal'} className={styles.divider}/>
        {isTimeTravelAvailable && <PanelSection title={'Time Travel'}>
            <NamedSwitch
                title={'Use recommended settings'}
                description={isRecommendedTimeTravelSettingsEnabled ?
                    'Settings for the best debugging experience will be applied on top of your config (recommended).' :
                    'Using project config without changes. This may affect availability of time travel features.'}
                checked={isRecommendedTimeTravelSettingsEnabled}
                onUpdate={onTimeTravelRecommendedSettingsToggle}
            />
        </PanelSection>}

        <ExtensionPoint name={ExtensionPointName.Settings} />
    </AsidePanel>;
}
