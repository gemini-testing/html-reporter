'use strict';

const {getCommandsHistory} = require('lib/history-utils');

describe('history-utils', () => {
    describe('getCommandsHistory', () => {
        const sandbox = sinon.createSandbox();

        beforeEach(() => {
            sandbox.stub(process, 'cwd').returns('/path/to');
        });

        afterEach(() => sandbox.restore());

        it('should return commands executed in test file', () => {
            const allHistory = [
                {n: 'foo', a: ['foo-arg'], d: 10, c: []},
                {n: 'baz', a: ['baz-arg'], d: 1, c: []},
                {n: 'bar', a: ['bar-arg'], d: 3, c: []},
                {n: 'qux', a: ['qux-arg'], d: 4, c: [
                    {n: 'qux', a: ['qux-arg'], d: 4, c: []},
                    {n: 'baz', a: ['bar-arg'], d: 3, c: []}
                ]}
            ];

            const history = getCommandsHistory(allHistory);

            assert.deepEqual(history, [
                'foo("foo-arg") <- 10ms\n',
                'baz("baz-arg") <- 1ms\n',
                'bar("bar-arg") <- 3ms\n',
                'qux("qux-arg") <- 4ms\n'
            ]);
        });

        it('should return commands executed in test file and all sub commands of the failed command', () => {
            const allHistory = [
                {n: 'foo', a: ['foo-arg'], d: 10, c: []},
                {n: 'baz', a: ['baz-arg'], d: 1, c: []},
                {n: 'bar', a: ['bar-arg'], d: 3, c: []},
                {n: 'qux', a: ['qux-arg'], d: 4, f: true, c: [
                    {n: 'qux', a: ['qux-arg'], d: 4, c: []},
                    {n: 'baz', a: ['bar-arg'], d: 3, f: true, c: []}
                ]}
            ];

            const history = getCommandsHistory(allHistory);

            assert.deepEqual(history, [
                'foo("foo-arg") <- 10ms\n',
                'baz("baz-arg") <- 1ms\n',
                'bar("bar-arg") <- 3ms\n',
                'qux("qux-arg") <- 4ms\n',
                '\tqux("qux-arg") <- 4ms\n',
                '\tbaz("bar-arg") <- 3ms\n'
            ]);
        });

        it('should return undefined if all history is not given', () => {
            const history = getCommandsHistory(undefined);

            assert.isUndefined(history);
        });
    });
});
