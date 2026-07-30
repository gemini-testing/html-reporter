import React from 'react';

const TreeHide: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
        <g clipPath="url(#clip0_2027_6203)">
            <mask id="mask0_2027_6203" style={{maskType: 'luminance'}} maskUnits="userSpaceOnUse" x={0} y={0} width={16} height={16}>
                <path d="M16 0H0V16H16V0Z" fill="currentColor"/>
            </mask>
            <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M13.0001 12.5H5.3501C5.0701 12.5 4.8201 12.39 4.6401 12.21C4.4601 12.03 4.3501 11.78 4.3501 11.5V4.5C4.3501 4.22 4.4601 3.97 4.6401 3.79C4.8201 3.61 5.0701 3.5 5.3501 3.5H10.7501H13.0001C13.2801 3.5 13.5301 3.61 13.7101 3.79C13.8901 3.97 14.0001 4.22 14.0001 4.5V11.5C14.0001 11.78 13.8901 12.03 13.7101 12.21C13.5301 12.39 13.2801 12.5 13.0001 12.5ZM5.3501 14H13.0001C13.6901 14 14.3201 13.72 14.7701 13.27C15.2201 12.82 15.5001 12.19 15.5001 11.5V4.5C15.5001 3.81 15.2201 3.18 14.7701 2.73C14.3201 2.28 13.6901 2 13.0001 2H5.3501C4.6601 2 4.0301 2.28 3.5801 2.73C3.1301 3.18 2.8501 3.81 2.8501 4.5V11.5C2.8501 12.19 3.1301 12.82 3.5801 13.27C4.0301 13.72 4.6601 14 5.3501 14Z" fill="currentColor"/>
            </g>
            <path d="M1.2998 2.83008V13.1701" stroke="currentColor" strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round"/>
        </g>
        <defs>
            <clipPath id="clip0_2027_6203">
                <rect width={16} height={16} fill="currentColor"/>
            </clipPath>
        </defs>
    </svg>
);

export default TreeHide;
