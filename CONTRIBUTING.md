# Contribution guide

> This document is currently a work in progress and is not yet comprehensive.
> Additional info will be added over time.

### Running e2e tests

End-to-end testing of html-reporter consists of two stages: generating fixture reports using different tools and tests,
then running hermione tests on these reports.

In order to make e2e/screenshot tests stable and reproducible across different environments,
you need to launch browsers inside a Docker container.

1. Make sure you have Docker installed.
    <details><summary>How to?</summary>
    1. If you want to make a personal open-source contribution, you may use Docker free of charge and follow the [official guide](https://docs.docker.com/get-docker/).
    2. If you are acting on behalf of a company, you may not have access to Docker Desktop. In this case:
        - On Linux, you may follow the official installation guide.
        - On Mac, you may use [colima](https://github.com/abiosoft/colima) as a replacement for Docker Desktop.
        - On Windows, you may use Windows Subsystem for Linux to run the Docker CLI without the Desktop application.
    </details>
   
2. Build and start an image with browsers:
    ```
    npm run e2e:build-browsers && npm run e2e:launch-browsers
    ```
3. Run e2e tests:
    ```bash
    npm run e2e
    ```

End-to-end tests are divided into multiple workspaces:
- `test/func/packages` — packages needed for generating fixture reports, e.g. test html-reporter plugins
- `test/func/fixtures` — packages to generate fixture reports
- `test/func/tests` — hermione tests that run on fixture reports

If you want a finer-grained control over the process, the following commands may be useful:
- `npm run e2e:generate-fixtures` — generate fixture reports to run tests on
- `npm run --workspace=test/func/tests gui:plugins` — launch hermione GUI for the `plugins` tests set
- `npm run e2e:test` — run e2e tests only, without building packages or generating fixtures
