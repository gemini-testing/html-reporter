# Commands

## Overview

The `html-reporter` plugin adds the following commands to Hermione:
* [gui](#gui)&mdash;to run hermione in GUI mode;
* [remove-unused-screens](#remove-unused-screens)&mdash;to remove reference screenshots that are not used in tests;
* [merge-reports](#merge-reports)&mdash;to merge Hermione's separate reports into one general report.

## gui

Use the `gui` command to launch Hermione in GUI mode.

GUI mode allows you to:
* run tests interactively;
* update screenshots&mdash;visually viewing them and taking only the necessary diffs;
* reuse reports from CI;
* filter the results of the run by errors, keys from meta, etc.

### Usage

```bash
npx hermione gui
```

## remove-unused-screens

Use the `remove-unused-screens` command to remove the reference screenshots that are not used in tests.

### How does it work?

First, the command looks for screenshots for which there are no tests on the file system.

Next, the command searches for screenshots that were not used in successful testing (the test result is taken from the SQLite database). To do this, the html-report must exist on the file system and contain the results of the tests run. This means that you must run the tests locally or download the report from CI before running the `remove-unused-screens` command.

### Usage

The `remove-unused-screens` command supports several options:

| **Option** | **Description** |
| ---------- | --------------- |
| -p, --pattern <pattern> | A pattern for finding screenshots on the file system. |
| --skip-questions | Do not ask questions during execution (use default values). |
| -h, --help | Output the reference information on the command to the terminal. |

#### Usage examples

Specifying the folder in which to search for unused screenshots:

```bash
npx hermione remove-unused-screens -p 'hermione-screens-folder'
```

Setting the pattern by which to search for screenshots:

```bash
npx hermione remove-unused-screens -p 'screens/**/*.png'
```

Setting several patterns by which to search for screenshots:

```bash
npx hermione remove-unused-screens -p 'screens/**/chrome/*.png' -p 'screens/**/firefox/*.png'
```

Specifying the folder in which to search for unused screenshots and setting _do-not-ask-questions_ option:

```bash
npx hermione remove-unused-screens -p 'hermione-screens-folder' --skip-questions
```

Getting the reference information about the command:

```bash
npx hermione remove-unused-screens --help
```

## merge-reports

Use the `merge-reports` command to merge Hermione's separate reports into one general report.

The command accepts paths to database files or to `databaseUrls.json` files from other html-reports. It creates a new html-report in the destination folder with a single file `databaseUrls.json`, which will contain a link to the database file or to the files `databaseUrls.json` from the input parameters. Database files are not copied to the destination folder at the same time.

### Usage

The `merge-reports` command supports the following options:

| **Option** | **Description** |
| --------- | ------------ |
| -d, --destination <folder> | The path to the folder where you want to save the final report. |
| -h, --header <header> | Http header for databaseUrls.json files from source paths. |

Usage example:

```bash
npx hermione merge-reports path-to-database.db path-to-databaseUrls.json -d dest-report -h foo=bar
```

Http headers can also be send using the environment variable - `html_reporter_headers` (has a higher priority than the cli option `--header'). Example:

```bash
html_reporter_headers='{"foo":"bar"}' npx hermione merge-reports path-to-database.db path-to-databaseUrls.json -d dest-report -h baz=qux
```

As a result, the `path-to-databaseUrls.json` will be requested with headers: `{foo: 'bar', baz: 'qux'}`.
