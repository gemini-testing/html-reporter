import {State} from '@/static/new-ui/types/store';

export const getTotalLoadingProgress = (state: State): number => {
    const progressValues = Object.values(state.app.loading.progress);

    if (progressValues.length === 0) {
        return 1;
    }

    const totalProgress = progressValues.reduce((acc, currentProgress) => {
        return acc + currentProgress;
    }, 0);

    return totalProgress / progressValues.length;
};
