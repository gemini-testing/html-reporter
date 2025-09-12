# Contribution guide

## Legal info

Hello! In order for us (YANDEX LLC) to accept patches and other contributions from you, you will have to adopt our Contributor License Agreement (the “CLA”). The current version of the CLA you may find here:

* https://yandex.ru/legal/cla/?lang=en (in English)
* https://yandex.ru/legal/cla/?lang=ru (in Russian).

By adopting the CLA, you state the following:

* You obviously wish and are willingly licensing your contributions to us for our open source projects under the terms of the CLA,
* You have read the terms and conditions of the CLA and agree with them in full,
* You are legally able to provide and license your contributions as stated,
* We may use your contributions for our open source projects and for any other our project too,
* We rely on your assurances concerning the rights of third parties in relation to your contributions.

If you agree with these principles, please read and adopt our CLA. By providing us your contributions, you hereby declare that you have read and adopted our CLA, and we may freely merge your contributions with our corresponding open source project and use it in further in accordance with terms and conditions of the CLA.

### Provide contributions
If you have adopted terms and conditions of the CLA, you are able to provide your contributions. When you submit your pull request, please add the following information into it:

```
I hereby agree to the terms of the CLA available at: [link].
```

Replace the bracketed text as follows:

* [link] is the link at the current version of the CLA (you may add here a link https://yandex.ru/legal/cla/?lang=en (in English) or a link https://yandex.ru/legal/cla/?lang=ru (in Russian).
It is enough to provide us with such notification once.

## How to develop

### Create your own copy of HTML Reporter repo

**Note.** If you are not a member of gemini-testing and going to submit a PR, you should first create a fork of html-reporter repo.

```bash
git clone https://github.com/gemini-testing/html-reporter.git # Replace with your fork URL
cd html-reporter
npm install
```

### Create a test project

When working with html-reporter, you'd want to test your changes on a real project as if you were a user.

To create a test project, use our CLI wizard:

```
npm init testplane@latest testplane-test-project
```

This will create a project in `testplane-test-project` directory.

### Link your local HTML Reporter repo to your test project

Go to html-reporter repo directory and run:

```shell
cd testplane
npm link
```

Then go to your test project's directory and run:

```shell
cd testplane-test-project
npm link html-reporter
```

### Build HTML Reporter

To build html-reporter, you may use `npm run build` command or `npm run watch` to watch for changes.

Great! Now you have everything set up. You can now make some tweaks in html-reporter and run `npx testplane gui` in your test project to see how it works with your changes!

A few important notes:
- If you are changing frontend (`static` directory in html-reporter repo), running build in watch mode and just force refreshing GUI page is enough to see your changes
- If you are changing server-side code of html-reporter, you need to restart gui server (`npx testplane gui`) each time to see your changes
- If you want to see your changes in static report (the one you are viewing using `npx http-server report-dir`) you should either re-generate it from scratch by running testplane once again (`npx testplane`) or replace all js/css files from `build/static`

### Running basic checks locally

You may run all linters and tests locally using the command below.

```shell
npm test
```

For a more granular checks, see scripts section in `package.json`.

### Running e2e tests

End-to-end testing of html-reporter consists of two stages: generating fixture reports using different tools and tests,
then running testplane tests on these reports.

In order to make e2e/screenshot tests stable and reproducible across different environments,
you need to launch browsers inside a Docker container.

1. Make sure you have Docker installed.
    <details>
    <summary>How to?</summary>

    1. If you want to make a personal open-source contribution, you may use Docker free of charge and follow the [official guide](https://docs.docker.com/get-docker/).
    2. If you are acting on behalf of a company, you may not have access to Docker Desktop. In this case:
        - On Linux, you may follow the official installation guide.
        - On Mac, you may use [colima](https://github.com/abiosoft/colima) as a replacement for Docker Desktop.
        - On Windows, you may use Windows Subsystem for Linux to run the Docker CLI without the Desktop application.
    </details>
   
2. Start an image with browsers:
    ```
    npm run browsers:launch
    ```
3. Run e2e tests:
    ```bash
    npm run e2e
    ```

End-to-end tests are divided into multiple workspaces:
- `test/func/packages` — packages needed for generating fixture reports, e.g. test html-reporter plugins
- `test/func/fixtures` — packages to generate fixture reports
- `test/func/tests` — testplane tests that run on fixture reports

If you want a finer-grained control over the process, the following commands may be useful:
- `npm run e2e:generate-fixtures` — generate fixture reports to run tests on
- `npm run --workspace=test/func/tests gui:plugins` — launch testplane GUI for the `plugins` tests set
- `npm run e2e:test` — run e2e tests only, without building packages or generating fixtures

### Working with browser docker images

> [!NOTE]
> If you just want to develop html-reporter, you don't need info below. You should just use prebuilt docker images as described above.

#### Building an image for current platform

If you want to build an image with browsers you can use this command:
- `npm run browsers:build:local`

#### Building a multiplatform image on Mac (Apple Silicon)

If you use colima then you can follow these steps to build a multiplatform image:
1. Install buildx
    - `brew install docker-buildx`
    - `docker buildx install`
2. Start 2 instances 
    - `colima start --profile amd --arch amd`
    - `colima start --profile arm --arch arm`
3. Create a buildx context to use the created instances as nodes
    - `docker buildx create --use --name custom colima-amd`
    - `docker buildx create --append --name custom colima-arm`
4. Build and publish an image
    - `npm run browsers:build-and-push`

Note: to use already created buildx instance, execute this command:
- `docker buildx use custom`

#### Managing multiple colima instances

To get the list of all colima instances you can use `colima list`.
To use specific colima instance, you have to set DOCKER_HOST environment variable.
To get the desired value for DOCKER_HOST, use `colima status [INSTANCE]`  

If you want to update chromedriver or chrome version, change the variables at the beginning of the [Dockerfile](/test/func/docker/Dockerfile).
