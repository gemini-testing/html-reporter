import React from 'react';

// We are using custom icon here, because there are issues with gravity-ui icon in safari due to use of clip path
export const PlayIcon = (): React.ReactNode => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 16 16" width={14} height={14}>
        <path
            d="M13.5,10.16c1.66-.96,1.66-3.37,0-4.33L5,.92C3.33-.04,1.25,1.16,1.25,3.08v9.83c0,1.93,2.09,3.13,3.75,2.16l8.5-4.92Z"
            fill="#000"
            fillRule="evenodd"
        />
    </svg>
);
