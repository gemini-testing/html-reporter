import type {SecretConfigFilter} from './types';

const NETWORK_HEADER_PREFIX = 'network-request.header.';
const SENSITIVE_FIELDS = /token|secret|password|passwd|apikey|accesskey|privatekey/;
const SENSITIVE_HEADERS = /^(authorization|proxyauthorization|cookie|setcookie)$|csrf|xsrf|session/;
const AUTH_CREDENTIAL = /^(?:Basic|Bearer)[ \t]+[a-z0-9._~+/-]+=*$/i;
// Recognize common compact JWS/JWE shapes without decoding or verifying tokens.
const JWT = /^eyJ[\w-]+\.(?:[\w-]+\.[\w-]*|[\w-]*\.[\w-]+\.[\w-]+\.[\w-]+)$/;

export const defaultSecretConfigFilter = (value: string, path: string): boolean => {
    const isHeader = path.startsWith(NETWORK_HEADER_PREFIX);
    const segments = isHeader ? [path.slice(NETWORK_HEADER_PREFIX.length)] : path.split('/').slice(1);
    const sensitivePath = segments.some(segment => {
        const name = segment.replace(/~1/g, '/').replace(/~0/g, '~').replace(/[^a-z0-9]/gi, '').toLowerCase();

        return SENSITIVE_FIELDS.test(name) || (isHeader && SENSITIVE_HEADERS.test(name));
    });

    if (sensitivePath) {
        return true;
    }

    const trimmedValue = value.trim();
    return trimmedValue.startsWith('AQAD') || trimmedValue.startsWith('y1_')
        || AUTH_CREDENTIAL.test(trimmedValue) || JWT.test(trimmedValue);
};

export const maskSecret = (value: string, path: string, filter: SecretConfigFilter | null = null): string => {
    const result = filter?.(value, path) ?? defaultSecretConfigFilter(value, path);

    if (typeof result === 'string') {
        return result;
    }
    if (!result) {
        return value;
    }

    return path.startsWith(NETWORK_HEADER_PREFIX) ? `${value.slice(0, 5)}...` : 'XXXX';
};
