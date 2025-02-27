import {ArrowUturnCcwLeft} from '@gravity-ui/icons';
import {Button, Divider, Icon, Select, TextInput} from '@gravity-ui/uikit';
import classNames from 'classnames';
import React, {ReactNode} from 'react';
import {useDispatch, useSelector} from 'react-redux';

import {LocalStorageKey, UiMode} from '@/constants/local-storage';
import * as actions from '@/static/modules/actions';
import useLocalStorage from '@/static/hooks/useLocalStorage';
import styles from './index.module.css';
import {AsidePanel} from '@/static/new-ui/components/AsidePanel';
import {PanelSection} from '@/static/new-ui/components/PanelSection';
import {useAnalytics} from '@/static/new-ui/hooks/useAnalytics';
import {NamedSwitch} from '@/static/new-ui/components/NamedSwitch';
import {ShowTimeTravelExperimentFeature, TimeTravelFeature} from '@/constants';
import {setAvailableFeatures} from '@/static/modules/actions/features';

export function SettingsPanel(): ReactNode {
    const dispatch = useDispatch();
    const analytics = useAnalytics();

    const baseHost = useSelector(state => state.view.baseHost);
    const [, setUiMode] = useLocalStorage(LocalStorageKey.UIMode, UiMode.New);

    const onBaseHostChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
        dispatch(actions.updateBaseHost(event.target.value));
    };

    const onOldUiButtonClick = (): void => {
        analytics?.trackFeatureUsage({featureName: 'Switch to old UI'});
        setUiMode(UiMode.Old);

        window.location.pathname = window.location.pathname.replace(/\/new-ui(\.html)?$/, (_match, ending) => ending ? '/index.html' : '/');
    };

    const experimentalToggles: ReactNode[] = [];

    const availableFeatures = useSelector(state => state.app.availableFeatures);
    const isTimeTravelExperimentAvailable = availableFeatures.find(f => f.name === ShowTimeTravelExperimentFeature.name);

    const isTimeTravelEnabled = availableFeatures.some(f => f.name === TimeTravelFeature.name);
    const onTimeTravelUpdate = (enabled: boolean): void => {
        if (enabled && !isTimeTravelEnabled) {
            dispatch(setAvailableFeatures({features: [...availableFeatures, TimeTravelFeature]}));
        } else if (!enabled && isTimeTravelEnabled) {
            dispatch(setAvailableFeatures({features: availableFeatures.filter(f => f.name !== TimeTravelFeature.name)}));
        }
    };

    if (isTimeTravelExperimentAvailable) {
        experimentalToggles.push(<NamedSwitch key={'time-travel'} title={'Time Travel'} description={'Enables new test steps UI, DOM snapshots player and debug mode.'} checked={isTimeTravelEnabled} onUpdate={onTimeTravelUpdate} />);
    }

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

        {experimentalToggles.length > 0 && <>
            <Divider orientation={'horizontal'} className={styles.divider}/>
            <PanelSection title={'Experiments'}>
                {experimentalToggles}
            </PanelSection>
        </>}
    </AsidePanel>;
}
