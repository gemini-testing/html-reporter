# Accepting screenshots from reports in CI

## Overview

The static image accepter lets reviewers promote new screenshot baselines from a static HTML report that was published by CI (for example, on S3 or behind an internal web server). A typical flow looks like this:

1. A CI job finishes running tests, generates the html-reporter bundle, and uploads the static report somewhere reviewers can reach it.
2. A reviewer opens that static report, stages the screenshots that should become the new baselines, and presses **Commit**.
3. html-reporter packages the staged screenshots together with repository metadata and sends them to a service that you operate. That service runs persistently (for example on your infrastructure or as a cloud function) and is responsible for updating the pull request with the new baselines.

The static accepter is disabled in GUI mode. To expose it in the static bundle you must configure repository, pull request, and service URLs as shown below.

## Configuration prerequisites

Add the `staticImageAccepter` block to the reporter configuration used when building the static report:

```js
plugins: {
    'html-reporter/hermione': {
        enabled: true,
        // ...other reporter options
        staticImageAccepter: {
            enabled: true,
            repositoryUrl: 'https://github.com/org/project',
            pullRequestUrl: 'https://github.com/org/project/pull/42',
            serviceUrl: 'https://accepter.example.com/static-accepter',
            meta: {
                ciRunId: process.env.GITHUB_RUN_ID,
                // any other contextual data required by your service
            },
            axiosRequestOptions: {
                timeout: 120000
            }
        }
    }
}
```

* The accepter is ignored unless the `enabled` flag is set and the report is opened in static mode. `repositoryUrl`, `pullRequestUrl`, and `serviceUrl` are mandatory; missing values disable the feature inside the bundle.【F:lib/static/modules/static-image-accepter.ts†L36-L52】
* Images collected for committing always reference the stored baseline path. The accepter throws if the underlying tool cannot provide a `refImg.relativePath`, because the service needs the final repository-relative destination for each file.【F:lib/static/modules/static-image-accepter.ts†L54-L82】
* `axiosRequestOptions` (optional) are forwarded to the HTTP client used by the report UI so you can tweak timeouts, headers, or authentication parameters required by your service.【F:lib/static/modules/actions/static-accepter.ts†L58-L107】

## High-level workflow

1. Reviewers browse the static report, stage the screenshots they want to promote, and open the **Commit** dialog.
2. html-reporter gathers the staged entries, fetches the binary data for each actual image, and builds a `multipart/form-data` payload that includes repository metadata, the chosen commit message, and every image file.【F:lib/static/modules/actions/static-accepter.ts†L69-L107】
3. The payload is sent as an HTTP `POST` request to the configured `serviceUrl`. Upload progress is exposed in the UI so reviewers can monitor large batches.【F:lib/static/modules/actions/static-accepter.ts†L108-L115】
4. Your accepter service performs authentication, verifies the request, stores the uploaded screenshots, and updates the PR branch (for example by creating a commit or opening a follow-up PR). It runs persistently so it can be reused across reports and CI runs.
5. On any HTTP status between 200 (inclusive) and 400 (exclusive) the UI treats the operation as successful, marks images as committed, stores their identifiers in local storage to avoid duplicate work, and shows a success notification. Non-2xx responses bubble up as errors in the UI.【F:lib/static/modules/actions/static-accepter.ts†L116-L148】

## HTTP API contract

The html-reporter always sends a single HTTP `POST` request to `staticImageAccepter.serviceUrl`. The request body is `multipart/form-data`.

### Form fields

| Field name | Type | Description |
|------------|------|-------------|
| `repositoryUrl` | text part | Full URL of the Git repository that contains the baselines (usually the PR target repository).【F:lib/static/modules/actions/static-accepter.ts†L75-L90】|
| `pullRequestUrl` | text part | Full URL of the PR that should receive the commit. Use it to discover branch/owner information inside your service.【F:lib/static/modules/actions/static-accepter.ts†L75-L90】|
| `message` | text part | Commit message chosen by the reviewer. Defaults to `chore: update <tool> screenshot references` if left unchanged.【F:lib/static/components/modals/static-accepter-confirm/index.tsx†L19-L56】|
| `meta` | text part (optional) | Arbitrary JSON string produced from the configured `staticImageAccepter.meta` object. Use it to pass CI context (run IDs, actor, custom flags).【F:lib/static/modules/actions/static-accepter.ts†L83-L90】|
| `image` | file part (repeated) | Each staged screenshot is uploaded as a binary file. The browser fetches the actual image blob and attaches it with the filename set to the repository-relative destination path (for example `test/screens/page/diff.png`).【F:lib/static/modules/actions/static-accepter.ts†L91-L107】【F:lib/types.ts†L216-L233】|

### Request semantics

* Multiple `image` parts are added in parallel (up to 256 concurrent downloads) before the request is dispatched. Order is not guaranteed, so the server should rely on `file.originalname` (or equivalent) rather than the upload order.【F:lib/static/modules/actions/static-accepter.ts†L91-L107】
* Each image corresponds to an `actual` screenshot that is meant to replace the `ref` baseline located at the given relative path. Your server is responsible for writing the file content to that path within the repository checkout or storage backend.
* The client does not send a structured list of images in the body — the file parts themselves are authoritative. Use the multipart metadata to reconstruct the commit.
* Authentication, authorization, and CSRF protections are entirely up to your implementation. Supply any additional headers through `axiosRequestOptions` (for example, bearer tokens) if you want the report to authenticate against the service.【F:lib/static/modules/actions/static-accepter.ts†L58-L107】

### Response expectations

* Any HTTP status in the range `[200, 400)` is treated as success. You may return a body (for example JSON with links to created commits), but the UI does not require it.
* Any other status or thrown error results in a failure notification for the reviewer. Include descriptive error messages in the response body to simplify troubleshooting.【F:lib/static/modules/actions/static-accepter.ts†L116-L147】

## Example: Express service backed by a GitHub App

One straightforward way to let a persistent service update pull requests is to authenticate it as a GitHub App installation. The App holds the minimal permissions needed (`contents: write`, `pull_requests: read`) and GitHub rotates short-lived installation tokens for you. The service can then clone the PR branch, drop in the uploaded baselines, and push a commit on behalf of the App.

### GitHub setup required beforehand

1. **Create a GitHub App** (Settings → Developer settings → GitHub Apps) with the following repository permissions: `Contents: Read & Write` and `Pull requests: Read`. The App does not require any webhooks for this flow.
2. **Generate a private key** for the App and store the PEM string in your secret manager. The server will use it to request installation tokens.
3. **Install the App** on every repository where you intend to accept screenshots. During installation GitHub asks which repositories to authorize; select the relevant ones. Only repository or organization admins can perform this step.

Once the App is installed, the service authenticates by exchanging the App credentials for an installation token every time it handles a request. That token is injected into the Git remote URL so all Git operations happen under the App’s robot account identity.

Below is a minimal Express implementation that runs on your infrastructure (for example, in Kubernetes or on a small VM). It receives requests from html-reporter, authenticates as a GitHub App, clones the PR branch into a temporary directory, writes the uploaded files, commits them using the reviewer-provided message, and pushes the updated branch.

```ts
// server.ts
import express from 'express';
import multer from 'multer';
import path from 'path';
import os from 'os';
import fs from 'fs/promises';
import {randomUUID} from 'crypto';
import simpleGit from 'simple-git';
import {Octokit} from 'octokit';
import {createAppAuth} from '@octokit/auth-app';

const upload = multer({storage: multer.memoryStorage()});

const appId = process.env.GITHUB_APP_ID!;
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY!; // PEM string

app.post('/static-accepter', upload.any(), async (req, res) => {
    const repositoryUrl = req.body.repositoryUrl as string;
    const pullRequestUrl = req.body.pullRequestUrl as string;
    const message = (req.body.message as string) || 'chore: update baselines';
    const meta = req.body.meta ? JSON.parse(req.body.meta) : {};

    if (!repositoryUrl || !pullRequestUrl) {
        res.status(400).send('Missing repositoryUrl or pullRequestUrl');
        return;
    }

    if (!req.files?.length) {
        res.status(400).send('No images provided');
        return;
    }

    const {owner, repo} = parseRepository(repositoryUrl);

    const appOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {appId, privateKey}
    });

    const installation = await appOctokit.rest.apps.getRepoInstallation({owner, repo});
    const installationOctokit = new Octokit({
        authStrategy: createAppAuth,
        auth: {
            appId,
            privateKey,
            installationId: installation.data.id
        }
    });

    const prNumber = extractPullNumber(pullRequestUrl);
    const {data: pull} = await installationOctokit.rest.pulls.get({owner, repo, pull_number: prNumber});
    const branch = pull.head.ref;

    const {token} = await installationOctokit.auth({type: 'installation'});
    const remote = `https://x-access-token:${token}@github.com/${owner}/${repo}.git`;

    const worktree = await fs.mkdtemp(path.join(os.tmpdir(), `accepter-${randomUUID()}-`));
    const git = simpleGit();

    try {
        await git.clone(remote, worktree, ['--single-branch', '--branch', branch]);
        const branchGit = simpleGit(worktree);

        for (const file of req.files as Express.Multer.File[]) {
            const destination = path.join(worktree, file.originalname);
            await fs.mkdir(path.dirname(destination), {recursive: true});
            await fs.writeFile(destination, file.buffer);
        }

        await branchGit.add('.');
        await branchGit.commit(message, undefined, {
            '--author': `${meta.actor ?? 'visual bot'} <${meta.actorEmail ?? 'bot@example.com'}>`
        });
        await branchGit.push('origin', branch);

        res.status(204).end();
    } catch (err) {
        console.error(err);
        res.status(500).send('Failed to update pull request');
    } finally {
        await fs.rm(worktree, {recursive: true, force: true});
    }
});

function parseRepository(repositoryUrl: string) {
    const match = repositoryUrl.match(/github\.com\/(.+?)\/(.+?)(\.git)?$/);
    if (!match) {
        throw new Error(`Unsupported repository URL: ${repositoryUrl}`);
    }
    return {owner: match[1], repo: match[2]};
}

function extractPullNumber(pullRequestUrl: string) {
    const match = pullRequestUrl.match(/pull\/(\d+)/);
    if (!match) {
        throw new Error(`Unsupported pull request URL: ${pullRequestUrl}`);
    }
    return Number(match[1]);
}

const port = process.env.PORT ?? 3000;
app.listen(port, () => {
    console.log(`Static accepter listening on :${port}`);
});
```

**Environment variables**

* `GITHUB_APP_ID` – the numeric App ID.
* `GITHUB_APP_PRIVATE_KEY` – the PEM-encoded private key generated for the App. Store it securely (for example in your secrets manager).
* The App must be installed in every repository that should accept screenshots. It needs `Contents: Read & Write` and `Pull requests: Read` permissions.

## Example: Integrating with GitHub Actions

The accepter service is long-lived, but CI is still responsible for producing the static report and publishing it. The workflow below shows one possible setup:

```yaml
jobs:
  visual-tests:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      id-token: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx testplane --reporter=html-reporter --reporter-options path=testplane-report
      - name: Upload static report to S3
        uses: jakejarvis/s3-sync-action@v0.5.1
        with:
          args: --delete
        env:
          AWS_S3_BUCKET: ${{ secrets.AWS_S3_BUCKET }}
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: ${{ secrets.AWS_REGION }}
          SOURCE_DIR: testplane-report
          DEST_DIR: "testplane-reports/${{ github.run_id }}-${{ github.run_number }}-${{ github.run_attempt }}/"
      - name: Publish report URL
        run: |
          echo "Report: https://reports.example.com/testplane-reports/${{ github.run_id }}-${{ github.run_number }}-${{ github.run_attempt }}/index.html" >> "$GITHUB_STEP_SUMMARY"
```

Reviewers open the published report. When they approve new baselines, the static accepter UI POSTs the images to your persistent service. That service performs the GitHub App workflow described above and pushes the commit back to the PR branch.

By implementing this contract you can let reviewers approve new baselines directly from static html-reporter builds while keeping full control over how screenshots are promoted inside your CI/CD system.
