'use strict';

const {getCommandsHistory} = require('lib/history-utils');

describe('history-utils', () => {
    describe('getCommandsHistory', () => {
        const sandbox = sinon.createSandbox();

        beforeEach(() => {
            sandbox.stub(process, 'cwd').returns('/path/to');
        });

        afterEach(() => sandbox.restore());

        it('should return commands executed in test file and all sub commands of the last command', async () => {
            const allHistory = [
                {n: 'foo', a: ['foo-arg'], d: 10, c: []},
                {n: 'baz', a: ['baz-arg'], d: 1, c: []},
                {n: 'bar', a: ['bar-arg'], d: 3, c: []},
                {n: 'qux', a: ['qux-arg'], d: 4, c: [
                    {n: 'qux', a: ['qux-arg'], d: 4, c: []},
                    {n: 'baz', a: ['bar-arg'], d: 3, c: []}
                ]}
            ];

            const history = await getCommandsHistory(allHistory);

            assert.deepEqual(history, [
                '\tfoo("foo-arg") <- 10ms\n',
                '\tbaz("baz-arg") <- 1ms\n',
                '\tbar("bar-arg") <- 3ms\n',
                '\tqux("qux-arg") <- 4ms\n',
                '\t\tqux("qux-arg") <- 4ms\n',
                '\t\tbaz("bar-arg") <- 3ms\n'
            ]);
        });

        it('should return undefined if all history is not given', async () => {
            const history = await getCommandsHistory(undefined);

            assert.isUndefined(history);
        });

        it('should return failure message in case of exception', async () => {
            const history = await getCommandsHistory([{}]);

            assert.match(history, /failed to get command history: .*/);
        });
    });
});
