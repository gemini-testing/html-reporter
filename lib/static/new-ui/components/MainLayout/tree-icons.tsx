import React from 'react';

export const TreeFull: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
        <g clipPath="url(#clip0_2027_6185)">
            <mask id="mask0_2027_6185" maskUnits="userSpaceOnUse" x={0} y={0} width={16} height={16}>
                <path d="M16 0H0V16H16V0Z" fill="currentColor" />
            </mask>
            <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M3 3.5H10.65C10.93 3.5 11.18 3.61 11.36 3.79C11.54 3.97 11.65 4.22 11.65 4.5V11.5C11.65 11.78 11.54 12.03 11.36 12.21C11.18 12.39 10.93 12.5 10.65 12.5H3C2.72 12.5 2.47 12.39 2.29 12.21C2.11 12.03 2 11.78 2 11.5V4.5C2 4.22 2.11 3.97 2.29 3.79C2.47 3.61 2.72 3.5 3 3.5ZM10.65 2H3C2.31 2 1.68 2.28 1.23 2.73C0.78 3.18 0.5 3.81 0.5 4.5V11.5C0.5 12.19 0.78 12.82 1.23 13.27C1.68 13.72 2.31 14 3 14H10.65C11.34 14 11.97 13.72 12.42 13.27C12.87 12.82 13.15 12.19 13.15 11.5V8V4.5C13.15 3.81 12.87 3.18 12.42 2.73C11.97 2.28 11.34 2 10.65 2Z" fill="currentColor"/>
            </g>
            <path d="M14.7002 13.1701V2.83008" stroke="currentColor" strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round"/>
            <path d="M4.08008 5.2998H9.18008" stroke="currentColor" strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round"/>
            <path d="M6.1001 8H10.2201" stroke="currentColor" strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round"/>
            <path d="M5.37988 10.7002H9.48988" stroke="currentColor" strokeWidth={1.5} strokeMiterlimit={10} strokeLinecap="round"/>
        </g>
        <defs>
            <clipPath id="clip0_2027_6185">
                <rect width={16} height={16} fill="currentColor"/>
            </clipPath>
        </defs>
    </svg>
);

export const TreeHide: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
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

export const TreeShow: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 16 16" fill="none" {...props}>
        <g clipPath="url(#clip0_2027_6196)">
            <mask id="mask0_2027_6196" maskUnits="userSpaceOnUse" x={0} y={0} width={16} height={16}>
                <path d="M0 0H16V16H0V0Z" fill="currentColor"/>
            </mask>
            <g>
                <path fillRule="evenodd" clipRule="evenodd" d="M3 12.5H2.5C2.36739 12.5 2.24021 12.4473 2.14645 12.3536C2.05268 12.2598 2 12.1326 2 12V4C2 3.86739 2.05268 3.74021 2.14645 3.64645C2.24021 3.55268 2.36739 3.5 2.5 3.5H3C3.13261 3.5 3.25979 3.55268 3.35355 3.64645C3.44732 3.74021 3.5 3.86739 3.5 4V12C3.5 12.1326 3.44732 12.2598 3.35355 12.3536C3.25979 12.4473 3.13261 12.5 3 12.5ZM2.5 14H3C3.53043 14 4.03914 13.7893 4.41421 13.4142C4.78929 13.0391 5 12.5304 5 12V4C5 3.46957 4.78929 2.96086 4.41421 2.58579C4.03914 2.21071 3.53043 2 3 2H2.5C1.96957 2 1.46086 2.21071 1.08579 2.58579C0.710714 2.96086 0.5 3.46957 0.5 4V12C0.5 12.5304 0.710714 13.0391 1.08579 13.4142C1.46086 13.7893 1.96957 14 2.5 14ZM13 12.5H8.5C8.23478 12.5 7.98043 12.3946 7.79289 12.2071C7.60536 12.0196 7.5 11.7652 7.5 11.5V4.5C7.5 4.23478 7.60536 3.98043 7.79289 3.79289C7.98043 3.60536 8.23478 3.5 8.5 3.5H13C13.2652 3.5 13.5196 3.60536 13.7071 3.79289C13.8946 3.98043 14 4.23478 14 4.5V11.5C14 11.7652 13.8946 12.0196 13.7071 12.2071C13.5196 12.3946 13.2652 12.5 13 12.5ZM8.5 14H13C13.663 14 14.2989 13.7366 14.7678 13.2678C15.2366 12.7989 15.5 12.163 15.5 11.5V4.5C15.5 3.83696 15.2366 3.20107 14.7678 2.73223C14.2989 2.26339 13.663 2 13 2H8.5C7.83696 2 7.20107 2.26339 6.73223 2.73223C6.26339 3.20107 6 3.83696 6 4.5V11.5C6 12.163 6.26339 12.7989 6.73223 13.2678C7.20107 13.7366 7.83696 14 8.5 14Z" fill="currentColor"/>
            </g>
        </g>
        <defs>
            <clipPath id="clip0_2027_6196">
                <rect width={16} height={16} fill="currentColor"/>
            </clipPath>
        </defs>
    </svg>
);
