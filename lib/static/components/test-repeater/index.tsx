import React from 'react';
import {useDispatch, useSelector} from 'react-redux';
import {NumberInput, Button, Icon} from '@gravity-ui/uikit';
import {Plus, Minus} from '@gravity-ui/icons';
import styles from './index.module.css';
import {setRepeatCount} from '@/static/modules/actions';
import {ExtensionPointName} from '@/static/new-ui/constants/plugins';

const MAX_REPEATER_COUNT = 99;
const MIN_REPEATER_COUNT = 1;

const PluginComponent = (): React.ReactNode => {
    const dispatch = useDispatch();
    const repeatCount = useSelector((state) => state.repeatCount);

    const changeRepeatCount = (newValue: number): void => {
        if (newValue >= MIN_REPEATER_COUNT && newValue < MAX_REPEATER_COUNT) {
            dispatch(setRepeatCount(newValue));
        }
    };

    return (
        <div className={styles.testRepeaterContainer}>
            <span className="text-header-1">Number of repeats</span>
            <NumberInput
                size='m'
                value={repeatCount}
                style={{maxWidth: '78px'}}
                onChange={(e): void => changeRepeatCount(parseInt(e.target.value, 10))}
                qa='repeat-count'
                hiddenControls
                endContent={(
                    <div className={styles.testRepeaterInput}>
                        <Button view="flat" size="s" onClick={(): void => changeRepeatCount(repeatCount - 1)}>
                            <Icon data={Minus} size={14}/>
                        </Button>
                        <Button view="flat" size="s" onClick={(): void => changeRepeatCount(repeatCount + 1)}>
                            <Icon data={Plus} size={14}/>
                        </Button>
                    </div>
                )}
            />
        </div>
    );
};

export const TestRepeaterComponent = {
    PluginComponent,
    name: 'Test Repeater',
    position: 'after',
    point: ExtensionPointName.RunTestOptions,
    config: {}
};
