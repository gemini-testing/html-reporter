# Принятие скриншотов из отчётов в CI

## Обзор

Данная функция позволяет ревьюерам принять новые эталонные скриншоты прямо из статического HTML-отчёта, опубликованного в CI (например, в S3 или на внутреннем веб-сервере). Типичный сценарий выглядит так:

1. CI-прогон завершает тесты, генерирует сборку html-reporter и выкладывает статический отчёт в доступное ревьюерам место.
2. Ревьюер открывает этот отчёт, помечает скриншоты, которые должны стать новыми эталонами, и нажимает **Commit**.
3. html-reporter упаковывает выбранные скриншоты вместе с метаданными репозитория и отправляет их на принадлежащий вам сервис. Этот сервис работает постоянно (например, в вашем кластере или как облачная функция) и обновляет pull request новыми эталонами.

В режиме GUI эта функция выключена, потому что локальный интерфейс уже умеет принимать скриншоты напрямую. Чтобы элементы UI принятия скриншотов появились в статическом отчёте, необходимо задать URL репозитория, pull request'а и сервиса, как показано ниже.

## Предварительная настройка

Добавьте блок `staticImageAccepter` в конфигурацию репортера, которая используется при сборке статического отчёта:

```js
plugins: {
    'html-reporter/hermione': {
        enabled: true,
        // ...другие настройки репортера
        staticImageAccepter: {
            enabled: true,
            repositoryUrl: 'https://github.com/org/project',
            pullRequestUrl: 'https://github.com/org/project/pull/42',
            serviceUrl: 'https://accepter.example.com/static-accepter',
            meta: {
                ciRunId: process.env.GITHUB_RUN_ID,
                // дополнительные данные, которые нужны вашему сервису
            },
            axiosRequestOptions: {
                timeout: 120000
            }
        }
    }
}
```

* Элементы для принятия скриншотов в статическом отчёте не появятся, если не задан `enabled` или отчёт открыт не в статическом режиме. `repositoryUrl`, `pullRequestUrl` и `serviceUrl` обязательны; без них кнопка «Accept» недоступна.
* Сохраняемые изображения всегда ссылаются на путь эталона. html-reporter выбросит ошибку, если инструмент не предоставляет `refImg.relativePath`, потому что сервису нужен конечный относительный путь для каждого файла.
* Параметр `axiosRequestOptions` (необязательный) прокидывается в HTTP-клиент интерфейса отчёта — так можно настроить таймауты, заголовки или авторизацию, требуемые вашим сервисом.

## Общая схема работы

1. Ревьюер просматривает статический отчёт, отмечает скриншоты и открывает диалог **Commit**.
2. html-reporter собирает выбранные элементы, загружает бинарные данные каждого «actual»-скриншота и формирует `multipart/form-data`, содержащий метаданные репозитория, сообщение коммита и файлы изображений.
3. Этот payload отправляется POST-запросом на `serviceUrl`. Прогресс загрузки отображается в интерфейсе.
4. Ваш сервис аутентифицирует запрос, проверяет его, сохраняет загруженные скриншоты и обновляет ветку PR (например, создаёт коммит или открывает follow-up PR). Он работает постоянно, поэтому его можно переиспользовать для разных отчётов и CI-запусков.
5. Любой HTTP-статус в диапазоне `[200, 400)` считается успехом: интерфейс помечает изображения как принятые, запоминает их идентификаторы в `localStorage`, чтобы не отправлять повторно, и показывает уведомление. Ошибки приводят к отображению сообщения об ошибке.

## Контракт HTTP API

html-reporter всегда отправляет один POST-запрос на `staticImageAccepter.serviceUrl`. Тело запроса имеет тип `multipart/form-data`.

### Поля формы

| Имя | Тип | Описание |
|-----|-----|----------|
| `repositoryUrl` | текст | Полный URL Git-репозитория с эталонами (обычно целевой репозиторий PR).|
| `pullRequestUrl` | текст | Полный URL pull request'а, который нужно обновить. Используйте его, чтобы определить ветку и владельца внутри сервиса.|
| `message` | текст | Сообщение коммита, выбранное ревьюером. По умолчанию `chore: update <tool> screenshot references`.|
| `meta` | текст (опционально) | Произвольная JSON-строка из `staticImageAccepter.meta`. Можно передавать контекст CI (ID прогона, автора, флаги).|
| `image` | файл (повторяется) | Каждый выбранный скриншот передаётся бинарным файлом. Имя файла равно относительному пути в репозитории (например, `test/screens/page/diff.png`).|

### Семантика запроса

* Файлы добавляются параллельно (до 256 одновременных загрузок), порядок не гарантируется — опирайтесь на `file.originalname` (или аналог) вместо позиции.
* Каждый файл заменяет соответствующий эталон (`ref`) по указанному относительному пути. Именно сервис отвечает за запись контента в репозиторий или хранилище.
* Клиент не отправляет отдельный JSON-список изображений — достаточно данных `multipart`.
* Механизмы аутентификации, авторизации и защиты от CSRF лежат на вашей стороне. Дополнительные заголовки можно задать через `axiosRequestOptions` (например, bearer-токен).

### Ожидаемый ответ

* Любой статус в диапазоне `[200, 400)` считается успешным. Можно вернуть тело (например, JSON с ссылками на коммиты), но интерфейсу оно не требуется.
* Остальные статусы или исключения приводят к ошибке в UI. Возвращайте развёрнутые сообщения, чтобы упрощать отладку.

## Пример: Express-сервис с GitHub App

Один из удобных способов выдать постоянному сервису права на обновление PR — аутентифицировать его как установку GitHub App. Приложение получает минимальные разрешения (`contents: write`, `pull_requests: read`), а GitHub самостоятельно вращает краткоживущие токены установки. После этого сервис может клонировать ветку PR, подменять эталоны и пушить коммит от имени приложения.

### Что нужно настроить в GitHub заранее

1. **Создайте GitHub App** (Settings → Developer settings → GitHub Apps) со следующими правами на репозиторий: `Contents: Read & Write` и `Pull requests: Read`. Для этого сценария вебхуки не обязательны.
2. **Сгенерируйте приватный ключ** для приложения и сохраните PEM-строку в менеджере секретов. Сервер будет использовать её для получения installation token’ов.
3. **Установите приложение** во все репозитории, где планируете принимать скриншоты. Во время установки GitHub попросит выбрать репозитории — отметьте нужные. Выполнить установку могут только администраторы репозитория или организации.

После установки приложение при каждом запросе обменивает свои учётные данные на installation token. Этот токен подставляется в URL удалённого репозитория, поэтому все Git-операции выполняются от имени сервисного аккаунта приложения.

Ниже приведён упрощённый Express-сервер, который развёрнут на постоянной инфраструктуре (например, в Kubernetes или на отдельном сервере). Он принимает запросы из html-reporter, аутентифицируется как GitHub App, клонирует ветку PR во временную директорию, записывает файлы, делает коммит с указанным сообщением и пушит изменения.

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
const privateKey = process.env.GITHUB_APP_PRIVATE_KEY!; // PEM-строка

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

**Переменные окружения**

* `GITHUB_APP_ID` — числовой идентификатор приложения.
* `GITHUB_APP_PRIVATE_KEY` — приватный ключ в PEM-формате. Храните его в защищённом хранилище.
* Приложение должно быть установлено во всех репозиториях, где нужно принимать скриншоты из статических отчётов. Ему нужны права `Contents: Read & Write` и `Pull requests: Read`.

## Пример интеграции с GitHub Actions

Сам сервис живёт отдельно, а CI продолжает генерировать и публиковать статический отчёт. Ниже пример workflow:

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

Ревьюеры открывают опубликованный отчёт. Когда они подтверждают новые эталоны, html-reporter отправляет изображения на ваш постоянный сервис. Тот выполняет описанные выше действия GitHub App и пушит коммит в ветку PR.

Следуя этому контракту, вы позволяете ревьюерам принимать новые эталоны прямо из статических сборок html-reporter и при этом полностью контролируете процесс их публикации.
