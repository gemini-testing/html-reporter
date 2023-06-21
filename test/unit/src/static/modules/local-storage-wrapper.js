import * as localStorageWrapper from 'src/static/modules/local-storage-wrapper';
import {mkStorage} from '../../../utils';

describe('src/static/modules/local-storage-wrapper', () => {
    const prefix = 'html-reporter';

    beforeEach(() => {
        global.window = {localStorage: mkStorage()};
    });

    afterEach(() => {
        global.window = undefined;
    });

    describe('setItem', () => {
        it('should convert value to json and set value to localStorage', () => {
            localStorageWrapper.setItem('foo', {bar: []});

            assert.equal(global.window.localStorage.getItem(`${prefix}:foo`), '{"bar":[]}');
        });
    });

    describe('getItem', () => {
        it('should return parsed value from localStorage', () => {
            const value = {bar: []};

            localStorageWrapper.setItem('foo', value);

            assert.deepEqual(localStorageWrapper.getItem('foo'), value);
        });

        it('should return default value if key doesn\'t exist in localStorage', () => {
            assert.equal(localStorageWrapper.getItem('bar', 'baz'), 'baz');
        });

        it('should return localStorage value if parsing occur an error', () => {
            const value = {bar: []};

            localStorageWrapper.setItem('foo', value);
            global.window.localStorage.setItem(`${prefix}:foo`, '{foo}');

            assert.equal(localStorageWrapper.getItem('foo'), '{foo}');
        });
    });

    describe('hasItem', () => {
        it('should return true if key exist in localStorage', () => {
            localStorageWrapper.setItem('foo', 'bar');

            assert.isTrue(localStorageWrapper.hasItem('foo'));
        });

        it('should return false if key doesn\'t exist in localStorage', () => {
            assert.isFalse(localStorageWrapper.hasItem('foo'));
            assert.equal(localStorageWrapper.getItem('foo'), undefined);
        });
    });
});
