import {maskSecret} from 'lib/secret-config-filter';

describe('lib/secret-config-filter', () => {
    it('should redact credentials in request and response headers while preserving ordinary headers', () => {
        const headers = {
            Authorization: 'Bearer test-credential',
            Cookie: 'session=abc123',
            'Set-Cookie': 'session=abc123; HttpOnly',
            'X.Api.Key': 'project-key',
            'X-CSRFToken': 'csrf-value',
            'Content-Type': 'application/json'
        };

        const masked = Object.fromEntries(Object.entries(headers).map(([name, value]) => [
            name, maskSecret(value, `network-request.header.${name}`)
        ]));

        assert.deepEqual(masked, {
            Authorization: 'Beare...', Cookie: 'sessi...', 'Set-Cookie': 'sessi...',
            'X.Api.Key': 'proje...', 'X-CSRFToken': 'csrf-...', 'Content-Type': 'application/json'
        });
    });

    it('should recognize credential values even under an ordinary header name', () => {
        const values = [
            'Bearer test-credential', 'bAsIc dXNlcjpwYXNz',
            'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ1c2VyIn0.c2lnbmF0dXJl',
            'AQADexample', 'y1_example'
        ];

        const masked = values.map(value => maskSecret(value, 'network-request.header.X-Custom'));

        assert.deepEqual(masked, ['Beare...', 'bAsIc...', 'eyJhb...', 'AQADe...', 'y1_ex...']);
    });

    it('should preserve diagnostic identifiers and authentication challenges', () => {
        const values = ['a'.repeat(64), 'a4e761fd-3af8-4e88-8205-f6048c26c069', 'Basic realm="example"'];

        const masked = values.map(value => maskSecret(value, 'network-request.header.X-Diagnostic'));

        assert.deepEqual(masked, values);
    });

    it('should honor custom replacements and explicit overrides, including an empty string', () => {
        const decisions = [undefined, true, false, '', 'redacted'];

        const masked = decisions.map(decision => maskSecret('session=abc123', 'network-request.header.Cookie', () => decision));

        assert.deepEqual(masked, ['sessi...', 'sessi...', 'session=abc123', '', 'redacted']);
    });
});
