import chalk from 'chalk';
import readline from 'node:readline';

type StatusState = {
    processed: number;
    total: number;
    currentId: string;
    failed: number;
    failedLogName?: string;
};

type SummaryData = {
    processed: number;
    autoAccepted: number;
    elapsedMs: number;
    downloadMs: number;
    compareMs: number;
    warningMessage?: string;
};

type ProgressApi = {
    start: () => void;
    updateStatus: (next: Partial<StatusState>) => void;
    finish: (summary: SummaryData) => void;
    fail: (message: string) => void;
};

const SPINNER_FRAMES = ['·', '‥', '…', '⁖', '⁘', '⁙', '⁙', '⁘', '⁖', '…', '‥', '·', ' ', ' '];
const WORDS = [
    'Pixelating',
    'Comparitating',
    'Validazzling',
    'Renderlizing',
    'Baselineing',
    'Quantumizing',
    'Crystallizing',
    'Diffing',
    'Thunking',
    'Testplaning'
];

const TOOL_TITLE = '  ∵ Testplane — screenshots migrator tool';

const TOOL_DESCRIPTION = `  ───────────────────────────────────────────────────────────────────────

  This tool is aimed at easing migration from Testplane v8 to v9 and can mass-update reference screenshots.
  For it to work, you need to run your tests and get html-report with failed visual checks first.`;

const pickWord = (current: string): string => {
    if (WORDS.length <= 1) {
        return WORDS[0] ?? current;
    }
    let next = current;
    while (next === current) {
        next = WORDS[Math.floor(Math.random() * WORDS.length)];
    }
    return next;
};

const formatSeconds = (ms: number): string => (ms / 1000).toFixed(1);

const renderBar = (part: number, total: number, width: number): string => {
    if (total <= 0) {
        return '░'.repeat(width);
    }
    const filled = Math.max(0, Math.min(width, Math.round((part / total) * width)));
    return '▓'.repeat(filled) + '░'.repeat(width - filled);
};

export const createCliUi = (
    total: number,
    options: {onStderr?: (text: string) => void} = {}
): ProgressApi => {
    const stdout = process.stdout;
    const isInteractive = Boolean(stdout.isTTY);
    const title = chalk.hex('#9a66ff')('\n' + TOOL_TITLE);
    const subtitle = chalk.dim(TOOL_DESCRIPTION);
    const spinnerColor = chalk.hex('#FFFFFF');
    const statusColor = chalk.dim;
    const originalStderrWrite = process.stderr.write.bind(process.stderr);

    let frameIndex = 0;
    let dotsIndex = 0;
    let currentWord = pickWord('');
    let status: StatusState = {processed: 0, total, currentId: '—', failed: 0};
    let startAt = Date.now();
    let spinnerTimer: NodeJS.Timeout | null = null;
    let dotsTimer: NodeJS.Timeout | null = null;
    let elapsedTimer: NodeJS.Timeout | null = null;
    let wordTimer: NodeJS.Timeout | null = null;
    let lastLoggedAt = 0;
    let lastLoggedProcessed = 0;
    let interceptActive = false;

    const render = (): void => {
        if (!isInteractive) {
            return;
        }
        readline.moveCursor(stdout, 0, -4);
        readline.clearLine(stdout, 0);
        readline.cursorTo(stdout, 0);
        const frame = SPINNER_FRAMES[frameIndex];
        const dots = '.'.repeat(dotsIndex);
        stdout.write(`  ${spinnerColor(frame)} ${currentWord} ${dots}\n`);

        readline.clearLine(stdout, 0);
        readline.cursorTo(stdout, 0);
        stdout.write(statusColor(`    ╰ Processed ${status.processed} of ${status.total} test results. Now working on: ${status.currentId}`) + '\n');

        readline.clearLine(stdout, 0);
        readline.cursorTo(stdout, 0);
        if (status.failed > 0) {
            const suffix = status.failedLogName ? ` See ${status.failedLogName}` : '';
            stdout.write(chalk.yellow(`    ╰ Failed ${status.failed} test results.${suffix}`) + '\n');
        } else {
            stdout.write('\n');
        }

        readline.clearLine(stdout, 0);
        readline.cursorTo(stdout, 0);
        stdout.write(`  ⏱ ${formatSeconds(Date.now() - startAt)}s elapsed\n`);
    };

    const start = (): void => {
        if (!isInteractive) {
            stdout.write(`∵ Testplane — screenshots migrator tool\n`);
            stdout.write('This tool is aimed at easing migration from Testplane v8 to v9 and can mass-update reference screenshots. For it to work, you need to run your tests and get html-report with failed visual checks first.\n');
            return;
        }
        stdout.write(`${title}\n`);
        stdout.write(`${subtitle}\n\n`);
        stdout.write('\n\n\n\n');
        startAt = Date.now();
        spinnerTimer = setInterval(() => {
            frameIndex = (frameIndex + 1) % SPINNER_FRAMES.length;
            render();
        }, 120);
        dotsTimer = setInterval(() => {
            dotsIndex = (dotsIndex + 1) % 4;
        }, 360);
        elapsedTimer = setInterval(render, 100);
        wordTimer = setInterval(() => {
            currentWord = pickWord(currentWord);
        }, 5000);
        render();
    };

    const updateStatus = (next: Partial<StatusState>): void => {
        status = {...status, ...next};
        if (!isInteractive) {
            const now = Date.now();
            const shouldLog = status.processed === status.total ||
                status.processed !== lastLoggedProcessed && (status.processed % 10 === 0 || now - lastLoggedAt > 5000);
            if (!shouldLog) {
                return;
            }
            lastLoggedAt = now;
            lastLoggedProcessed = status.processed;
            const suffix = status.failed > 0 && status.failedLogName ? ` (failed ${status.failed}, log ${status.failedLogName})` : '';
            stdout.write(`Processed ${status.processed}/${status.total}. Now working on: ${status.currentId}${suffix}\n`);
        }
    };

    const finish = (summary: SummaryData): void => {
        if (!isInteractive) {
            const elapsedSec = (summary.elapsedMs / 1000).toFixed(1);
            const warningLine = summary.warningMessage ? `\n${summary.warningMessage}` : '';
            stdout.write(`\nMigration finished\nItems: ${summary.processed} processed, ${summary.autoAccepted} auto-accepted\nTotal time: ${elapsedSec}s${warningLine}\n`);
            return;
        }
        if (spinnerTimer) {
            clearInterval(spinnerTimer);
        }
        if (dotsTimer) {
            clearInterval(dotsTimer);
        }
        if (elapsedTimer) {
            clearInterval(elapsedTimer);
        }
        if (wordTimer) {
            clearInterval(wordTimer);
        }
        if (interceptActive) {
            process.stderr.write = originalStderrWrite;
            interceptActive = false;
        }
        readline.moveCursor(stdout, 0, -4);
        for (let i = 0; i < 4; i += 1) {
            readline.clearLine(stdout, 0);
            readline.cursorTo(stdout, 0);
            if (i < 3) {
                stdout.write('\n');
            }
        }
        readline.moveCursor(stdout, 0, -3);

        const elapsedSec = summary.elapsedMs / 1000;
        const workTotal = summary.downloadMs + summary.compareMs;
        const downloadSec = workTotal > 0 ? elapsedSec * (summary.downloadMs / workTotal) : 0;
        const compareSec = Math.max(0, elapsedSec - downloadSec);
        const barWidth = 10;

        stdout.write(`   ✓ Migration finished\n`);
        stdout.write(`  ───────────────────────────────────────────────────────────────────────\n\n`);
        stdout.write(`   Items            ${summary.processed} processed, ${summary.autoAccepted} auto-accepted\n`);
        stdout.write(`   Total            ${elapsedSec.toFixed(1)}s\n`);
        stdout.write(`   ├─ Download      ${downloadSec.toFixed(1)}s  ${renderBar(downloadSec, elapsedSec, barWidth)}\n`);
        stdout.write(`   └─ Processing    ${compareSec.toFixed(1)}s  ${renderBar(compareSec, elapsedSec, barWidth)}\n\n`);
        if (summary.warningMessage) {
            stdout.write(`   ${chalk.yellow(summary.warningMessage)}\n\n`);
        }
        stdout.write(`   Launch HTML Reporter GUI to see results: ${chalk.blue('npx testplane gui')} or your project-specific CLI command\n\n`);
    };

    const fail = (message: string): void => {
        if (!isInteractive) {
            stdout.write(`\nMigration failed\n${message}\n`);
            return;
        }
        if (spinnerTimer) {
            clearInterval(spinnerTimer);
        }
        if (dotsTimer) {
            clearInterval(dotsTimer);
        }
        if (elapsedTimer) {
            clearInterval(elapsedTimer);
        }
        if (wordTimer) {
            clearInterval(wordTimer);
        }
        if (interceptActive) {
            process.stderr.write = originalStderrWrite;
            interceptActive = false;
        }
        readline.moveCursor(stdout, 0, -4);
        for (let i = 0; i < 4; i += 1) {
            readline.clearLine(stdout, 0);
            readline.cursorTo(stdout, 0);
            if (i < 3) {
                stdout.write('\n');
            }
        }
        readline.moveCursor(stdout, 0, -3);
        const paddedMessage = message
            .split('\n')
            .map((line) => `  ${line}`)
            .join('\n');

        stdout.write(`   ✗ Migration failed\n`);
        stdout.write(`  ───────────────────────────────────────────────────────────────────────\n\n`);
        stdout.write(`${chalk.red(paddedMessage)}\n\n`);
    };

    if (options.onStderr && isInteractive) {
        process.stderr.write = ((chunk: unknown, _encoding?: unknown, callback?: () => void) => {
            const text = Buffer.isBuffer(chunk) ? chunk.toString() : String(chunk);
            options.onStderr?.(text);
            if (callback) {
                callback();
            }
            return true;
        }) as typeof process.stderr.write;
        interceptActive = true;
    }

    return {start, updateStatus, finish, fail};
};
