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

## Варианты реализации

Сервис принятия может обновлять PR либо от имени ревьюера, либо от имени бота. Ниже приведены два подхода — выберите тот, что лучше вписывается в ваши процессы, и адаптируйте примеры под свой стек, соблюдая HTTP-контракт.

### Вариант A: GitHub App + вход ревьюера (коммиты от людей)

Чтобы коммиты подписывались именем человека, нажавшего **Commit**, можно объединить GitHub App (даёт доступ к репозиторию) и OAuth-поток этого приложения (выдаёт токен конкретного пользователя). Ревьюер один раз входит на сервис, тот сохраняет сессию и при следующих загрузках выполняет git-операции уже под этим пользователем. В GitHub коммит будет привязан к ревьюеру, а не к боту.

#### Что настроить в GitHub заранее

1. **Создайте GitHub App** (Settings → Developer settings → GitHub Apps) с правами `Contents: Read & Write` и `Pull requests: Read`. Включите **User authorization callback URL** и пункт **Request user authorization (OAuth)**. Запросите область `user:email`, чтобы сервис мог получить e-mail для подписи коммитов. Вебхуки не требуются.
2. **Сгенерируйте приватный ключ** и сохраните PEM-строку в защищённом хранилище. Также выпишите **Client ID** и **Client secret** — они нужны в OAuth-потоке.
3. **Установите приложение** во все репозитории, где нужно принимать скриншоты. Это действие доступно только администраторам организации или репозитория.

После настройки сервис выполняет две независимые авторизации:

* Во время логина приложение обменивает OAuth-код на пользовательский токен и сохраняет его в cookie-сессии.
* При каждом accepter-запросе сервис находит установку приложения, клонирует ветку PR и использует пользовательский токен в Git-URL. GitHub фиксирует коммит на того, кто нажал кнопку.

Ниже — минимальный Express-сервер, который работает постоянно (например, в Kubernetes или на отдельной ВМ). Он предоставляет маршрут входа для ревьюеров, хранит токены в памяти (в production замените на устойчивое шифрованное хранилище), принимает `multipart`-payload от html-reporter и пушит эталоны от имени вошедшего пользователя.

<details>
<summary>TypeScript-пример: GitHub App + OAuth-логин</summary>

```ts
// server.ts
import express from 'express';
import multer from 'multer';
import cookieParser from 'cookie-parser';
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
const clientId = process.env.GITHUB_APP_CLIENT_ID!;
const clientSecret = process.env.GITHUB_APP_CLIENT_SECRET!;
const sessionSecret = process.env.SESSION_SECRET!;

type Session = {token: string; login: string; name: string; email: string};
const sessions = new Map<string, Session>();
const pendingStates = new Set<string>();

const app = express();
app.use(cookieParser(sessionSecret));

app.get('/auth/login', (_req, res) => {
    const state = randomUUID();
    pendingStates.add(state);
    const authorizeUrl = new URL('https://github.com/login/oauth/authorize');
    authorizeUrl.searchParams.set('client_id', clientId);
    authorizeUrl.searchParams.set('redirect_uri', `${process.env.PUBLIC_URL}/auth/callback`);
    authorizeUrl.searchParams.set('state', state);
    authorizeUrl.searchParams.set('scope', 'repo user:email');
    res.redirect(authorizeUrl.toString());
});

app.get('/auth/callback', async (req, res) => {
    const {code, state} = req.query;
    if (typeof code !== 'string' || typeof state !== 'string') {
        res.status(400).send('Missing OAuth parameters');
        return;
    }

    if (!pendingStates.has(state)) {
        res.status(400).send('Unknown OAuth state');
        return;
    }

    const auth = createAppAuth({appId, privateKey, clientId, clientSecret});
    const oauth = await auth({type: 'oauth-user', code});
    const userOctokit = new Octokit({auth: oauth.token});
    const {data: viewer} = await userOctokit.rest.users.getAuthenticated();
    const {data: emails} = await userOctokit.rest.users.listEmailsForAuthenticatedUser();
    const primaryEmail = emails.find((item) => item.primary и item.verified)?.email;

    const sessionId = randomUUID();
    sessions.set(sessionId, {
        token: oauth.token,
        login: viewer.login,
        name: viewer.name ?? viewer.login,
        email: primaryEmail ?? `${viewer.id}+noreply@users.noreply.github.com`
    });

    res.cookie('accepter_session', sessionId, {httpOnly: true, sameSite: 'lax', secure: true});
    pendingStates.delete(state);
    res.send('Аутентификация выполнена. Вернитесь в статический отчёт и повторите попытку.');
});

app.post('/static-accepter', upload.any(), async (req, res) => {
    const sessionId = req.cookies?.accepter_session;
    const session = sessions.get(sessionId ?? '');
    if (!session?.token) {
        res.status(401).send('Сначала авторизуйтесь на /auth/login.');
        return;
    }

    const repositoryUrl = req.body.repositoryUrl as string;
    const pullRequestUrl = req.body.pullRequestUrl as string;
    const message = (req.body.message as string) || 'chore: update baselines';

    if (!repositoryUrl или !pullRequestUrl) {
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

    const remote = `https://${session.login}:${session.token}@github.com/${owner}/${repo}.git`;

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
            '--author': `${session.name} <${session.email}>`
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

</details>

**Переменные окружения**

* `GITHUB_APP_ID` — числовой идентификатор приложения.
* `GITHUB_APP_PRIVATE_KEY` — приватный ключ в PEM-формате. Храните его в защищённом виде (например, в секретном хранилище).
* `GITHUB_APP_CLIENT_ID` и `GITHUB_APP_CLIENT_SECRET` — параметры OAuth-потока.
* `SESSION_SECRET` — случайная строка для подписи cookie. В production замените память на защищённое хранилище.
* `PUBLIC_URL` — публичный HTTPS-адрес сервиса (например, `https://accepter.example.com`).
* Установите приложение во все репозитории, где нужна эта функция. Требуются права `Contents: Read & Write` и `Pull requests: Read`.

### Вариант B: GitHub App без логина (коммиты от бота)

Если не хочется работать с пользовательскими сессиями, то же приложение GitHub может пушить напрямую, используя свой installation token. Сервис остаётся stateless, но все коммиты будут подписаны ботом. **Любой, кто доберётся до эндпоинта, сможет пушить в репозитории, где установлено приложение, поэтому ограничьте доступ к сервису (например, держите его внутри доверенной сети или добавьте собственный уровень авторизации).**

Начальная настройка проще, чем в варианте A: создайте приложение с правами `Contents: Read & Write` и `Pull requests: Read`, сгенерируйте приватный ключ и установите приложение в нужные репозитории. OAuth и маршруты входа не требуются.

<details>
<summary>TypeScript-пример: используем только installation token</summary>

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

const app = express();

app.post('/static-accepter', upload.any(), async (req, res) => {
    const repositoryUrl = req.body.repositoryUrl as string;
    const pullRequestUrl = req.body.pullRequestUrl as string;
    const message = (req.body.message as string) || 'chore: update baselines';

    if (!repositoryUrl или !pullRequestUrl) {
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

    const tokenResponse = await installationOctokit.rest.apps.createInstallationAccessToken({
        installation_id: installation.data.id
    });
    const remote = `https://x-access-token:${tokenResponse.data.token}@github.com/${owner}/${repo}.git`;

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
        await branchGit.commit(message);
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

</details>

**Переменные окружения**

* `GITHUB_APP_ID` — числовой идентификатор приложения.
* `GITHUB_APP_PRIVATE_KEY` — приватный ключ в PEM-формате.
* Приложение должно быть установлено во все репозитории, которые будут получать новые эталоны. Коммиты будут подписаны ботом приложения.
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

Ревьюеры открывают опубликованный отчёт. Перед первой отправкой им нужно войти в ваш сервис (например, перейдя по `/auth/login`). После этого при подтверждении новых эталонов html-reporter отправляет изображения на постоянный сервис. Тот проверяет пользовательскую сессию, использует OAuth-токен GitHub App этого ревьюера и пушит коммит в ветку PR уже от его имени.

Следуя этому контракту, вы позволяете ревьюерам принимать новые эталоны прямо из статических сборок html-reporter и при этом полностью контролируете процесс их публикации.
