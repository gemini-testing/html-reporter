# API плагина

## Обзор

Html-reporter добавляет к объекту `testplane` объект `htmlReporter` со своим API.

| **Имя** | **Тип** | **Описание** |
| ------- | ------- | ------------ |
| [events](#events) | Object | Список событий, на которые можно подписаться. |
| [extraItems](#extraitems) | Object | Дополнительные элементы, которые будут добавлены в бургер-меню отчета. |
| [imagesSaver](#imagessaver) | Object | Интерфейс для сохранения изображений в хранилище пользователя. |
| [reportsSaver](#reportssaver) | Object | Интерфейс для сохранения sqlite баз данных в хранилище пользователя. |
| [snapshotsSaver](#snapshotssaver) | Object | Интерфейс для сохранения снимков в хранилище пользователя. |
| [addExtraItem](#addextraitem) | Method | Добавляет дополнительный пункт в бургер-меню отчета. |
| [downloadDatabases](#downloaddatabases) | Method | Скачивает все базы данных из переданных файлов типа _databaseUrls.json_. |
| [mergeDatabases](#mergedatabases) | Method | Объединяет все переданные базы данных и сохраняет итоговый отчет по заданному пути. |
| [getTestsTreeFromDatabase](#getteststreefromdatabase) | Method | Возвращает дерево тестов из переданной базы данных. |

## events

Список событий, на которые можно подписаться.

Смотрите подробнее в разделе «[События отчета](./html-reporter-events.md)».

## extraItems

Дополнительные элементы, которые будут добавлены в бургер-меню отчета.

Для добавления элементов используйте метод [addExtraItem](#addextraitem).

## imagesSaver

Интерфейс для сохранения изображений в хранилище пользователя.

### Пример использования

```javascript
const MyStorage = require('my-storage');
const myStorage = new MyStorage();

module.exports = (testplane, opts) => {
    testplane.on(testplane.events.INIT, async () => {
        testplane.htmlReporter.imagesSaver = {
            /**
            * Сохранить изображение в пользовательское хранилище.
            * Функция может быть как асинхронной, так и синхронной. 
            * Функция должна возвращать путь или URL к сохраненному изображению.
            * @property {String} localFilePath – путь к изображению на файловой системе
            * @param {Object} options
            * @param {String} options.destPath – путь к изображению в html-отчете
            * @param {String} options.reportDir - путь к папке html-отчета
            * @returns {String} путь или URL к изображению
            */
            saveImg: async (localFilePath, options) => {
                const { destPath, reportDir } = options;
                const imageUrl = await myStorage.save(localFilePath, destPath, reportDir);

                // ...

                return imageUrl;
            }
        }
    });
};
```

## reportsSaver

Интерфейс для сохранения sqlite баз данных в хранилище пользователя.

### Пример использования

```javascript
const MyStorage = require('my-storage');
const myStorage = new MyStorage();

module.exports = (testplane, opts) => {
    testplane.on(testplane.events.INIT, async () => {
        testplane.htmlReporter.reportsSaver = {
            /**
            * Сохранить sqlite базу данных в пользовательское хранилище.
            * Функция может быть как асинхронной, так и синхронной. 
            * Функция должна возвращать путь или URL к сохраненной sqlite базе данных.
            * @property {String} localFilePath – путь к sqlite базе данных на файловой системе
            * @param {Object} options
            * @param {String} options.destPath – путь к sqlite базе данных в html-отчете
            * @param {String} options.reportDir - путь к папке html-отчета
            * @returns {String} путь или URL к сохраненной sqlite базе данных
            */
            saveReportData: async (localFilePath, options) => {
                const { destPath, reportDir } = options;
                const dbUrl = await myStorage.save(localFilePath, destPath, reportDir);

                // ...

                return dbUrl;
            }
        }
    });
};
```

## snapshotsSaver

Интерфейс для сохранения DOM-снапшотов в хранилище пользователя.

### Пример использования

```javascript
const MyStorage = require('my-storage');
const myStorage = new MyStorage();

module.exports = (testplane, opts) => {
    testplane.on(testplane.events.INIT, async () => {
        testplane.htmlReporter.snapshotsSaver = {
            /**
            * Сохранить снапшот в пользовательское хранилище.
            * Функция может быть как асинхронной, так и синхронной. 
            * Функция должна возвращать путь или URL к сохраненному снапшоту.
            * @property {String} localFilePath – путь к снапшоту на файловой системе
            * @param {Object} options
            * @param {String} options.destPath – путь к снапшоту в html-отчете
            * @param {String} options.reportDir - путь к папке html-отчета
            * @returns {String} путь или URL к сохраненному снапшоту
            */
            saveSnapshot: async (localFilePath, options) => {
                const { destPath, reportDir } = options;
                const snapshotUrl = await myStorage.save(localFilePath, destPath, reportDir);

                // ...

                return snapshotUrl;
            }
        }
    });
};
```

## addExtraItem

Добавляет дополнительный пункт в виде ссылки в бургер-меню html-отчета.

### Пример вызова

```javascript
testplane.htmlReporter.addExtraItem(caption, url);
```

### Параметры вызова

Все параметры являются обязательными.

| **Имя&nbsp;параметра** | **Тип** | **Описание** |
| ---------------------- | ------- | ------------ |
| caption | String | Название пункта, который надо добавить в бургер-меню. |
| url | String | URL, на который будет ссылаться добавляемый пункт меню. |

## downloadDatabases

Скачивает все базы данных из переданных файлов `databaseUrls.json`.

### Пример вызова

```javascript
const dbPaths = await testplane.htmlReporter.downloadDatabases(
    ['.\databaseUrls.json'], { pluginConfig }
);
```

### Параметры вызова

Функция принимает 2 аргумента &mdash; список путей до файлов `databaseUrls.json` в виде массива строк и объект с ключом `pluginConfig`, в значении которого хранится конфиг плагина.

Функция возвращает список путей к сохраненным базам данных.

## mergeDatabases

Объединяет все переданные базы данных и сохраняет итоговый отчет по заданному пути.

### Пример вызова

```javascript
await testplane.htmlReporter.mergeDatabases(srcDbPaths, path);
```

### Параметры вызова

| **Имя&nbsp;параметра** | **Тип** | **Описание** |
| ---------------------- | ------- | ------------ |
| srcDbPaths | String[] | Пути к базам данных. |
| path | String | Путь, по которому будет сохранена итоговая база данных. |

## getTestsTreeFromDatabase

Возвращает дерево тестов из переданной базы данных.

### Пример вызова

```javascript
const dbTree = await testplane.htmlReporter.getTestsTreeFromDatabase(mergedDbPath);
```

### Параметры вызова

Функция принимает один аргумент &mdash; путь к базе данных с результатом прогона тестов.

### Пример использования

```javascript
async function getSuccessTestRunIds({ testplane, mergedDbPath }) {
    const dbTree = await testplane.htmlReporter.getTestsTreeFromDatabase(mergedDbPath);

    const successTestRunIds = [];

    for (const browserId of dbTree.browsers.allIds) {
        const browser = dbTree.browsers.byId[browserId];
        const lastResultId = _.last(browser.resultIds);
        const lastResult = lastResultId && dbTree.results.byId[lastResultId];

        if (!lastResult || lastResult.status !== SUCCESS) {
            continue;
        }

        const testRunId = new URL(lastResult.suiteUrl).searchParams.get("testRunId");

        if (!testRunId) {
            continue;
        }

        successTestRunIds.push(testRunId);
    }

    return successTestRunIds;
}
```
