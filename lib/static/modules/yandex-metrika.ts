enum YandexMetrikaMethod {
    ReachGoal = 'reachGoal',
    Params = 'params',
}

interface YandexMetrikaSdk {
    (counterId: number, method: YandexMetrikaMethod.ReachGoal, goalId: string, goalParams: Record<string, unknown>): void;
    (counterId: number, method: YandexMetrikaMethod.Params, params: Record<string, unknown>): void;
}

declare global {
    interface Window {
        ym?: YandexMetrikaSdk;
    }
}

enum GoalId {
    ScreenshotAccept = 'ACCEPT_SCREENSHOT',
    OpenedScreenshotsAccept = 'ACCEPT_OPENED_SCREENSHOTS',
    FeatureUsage = 'FEATURE_USAGE'
}

interface ScreenshotAcceptData {
    acceptedImagesCount: number;
}

interface FeatureUsageData {
    featureName: string;
}

export class YandexMetrika {
    protected readonly _isEnabled: boolean;
    protected readonly _counterNumber: number;

    constructor(isEnabled: boolean, counterNumber: number) {
        this._isEnabled = isEnabled;
        this._counterNumber = counterNumber;
    }

    protected _registerGoal(goalId: GoalId, goalParams = {}): void {
        if (!this._isEnabled) {
            return;
        }

        window.ym?.(this._counterNumber, YandexMetrikaMethod.ReachGoal, goalId, goalParams);
    }

    setVisitParams(params: Record<string, unknown>): void {
        if (!this._isEnabled) {
            return;
        }

        window.ym?.(this._counterNumber, YandexMetrikaMethod.Params, params);
    }

    trackScreenshotsAccept(params: ScreenshotAcceptData = {acceptedImagesCount: 1}): void {
        this._registerGoal(GoalId.ScreenshotAccept, params);
    }

    trackOpenedScreenshotsAccept(params: ScreenshotAcceptData): void {
        this._registerGoal(GoalId.OpenedScreenshotsAccept, params);
    }

    trackFeatureUsage(params: FeatureUsageData): void {
        this._registerGoal(GoalId.FeatureUsage, params);
    }
}
