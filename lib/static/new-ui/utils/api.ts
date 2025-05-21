import {ApiErrorResponse, UpdateTimeTravelSettingsRequest, UpdateTimeTravelSettingsResponse} from '@/types';

export const isApiErrorResponse = (response: UpdateTimeTravelSettingsResponse): response is ApiErrorResponse => {
    return 'error' in response;
};

export const updateTimeTravelSettings = async (params: UpdateTimeTravelSettingsRequest): Promise<UpdateTimeTravelSettingsResponse> => {
    return fetch('/update-time-travel-settings', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
    }).then(response => response.json());
};
