import {useSelector} from 'react-redux';

export const useRunOptionsString = (): string => useSelector((state) => {
    const opts: string[] = [];

    if (state.repeatCount > 1) {
        opts.push(`x${state.repeatCount}`);
    }

    Object.values(state.runOptions).forEach((value) => {
        if (value && value.length > 0) {
            opts.push(value);
        }
    });

    return opts.join('⋅');
});
