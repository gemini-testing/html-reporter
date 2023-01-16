# События плагина

## Обзор

Плагин `html-reporter` добавляет в интерфейс гермионы специальный объект _htmlReporter_, через который, в том числе, можно подписаться на события отчета. Для этого `hermione.htmlReporter` предоставляет свойство `events` со списком событий, на которые можно подписаться:

* [DATABASE_CREATED](#database_created) &mdash; событие, которое триггерится сразу после создания sqlite базы данных;
* [TEST_SCREENSHOTS_SAVED](#test_screenshots_saved) &mdash; событие, которое триггерится после сохранения скриншотов теста;
* [REPORT_SAVED](#report_saved) &mdash; событие, которое триггерится после сохранения всех файлов отчета.

## DATABASE_CREATED

**sync | master**

Событие `DATABASE_CREATED` триггерится сразу после создания sqlite базы данных. Обработчик события выполняется синхронно.

### Подписка на событие

```javascript
hermione.htmlReporter.on(hermione.htmlReporter.events.DATABASE_CREATED, (db) => {
    console.info(`Выполняется обработка события DATABASE_CREATED...`);
});
```

#### Параметры обработчика

В обработчик события передается инстанс базы данных.

### Пример использования

```javascript
const parseConfig = require('./config');

module.exports = (hermione, opts) => {
    const pluginConfig = parseConfig(opts);

    if (!pluginConfig.enabled || hermione.isWorker()) {
        // или плагин отключен, или мы находимся в контексте воркера – уходим
        return;
    }

    // свойство "htmlreporter" гарантированно есть в объекте "hermione"
    // в момент срабатывания события INIT
    hermione.on(hermione.events.INIT, () => {
        hermione.htmlReporter.on(hermione.htmlReporter.events.DATABASE_CREATED, (db) => {
            db.prepare(`CREATE TABLE IF NOT EXISTS testTable (foo TEXT, bar TEXT)`).run();
        });
    });
};
```

## TEST_SCREENSHOTS_SAVED

**async | master**

Событие `TEST_SCREENSHOTS_SAVED` триггерится после сохранения скриншотов очередного теста. Обработчик события может быть асинхронным.

### Подписка на событие

```javascript
hermione.htmlReporter.on(
    hermione.htmlReporter.events.TEST_SCREENSHOTS_SAVED,
    async ({ testId, attempt, imagesInfo }) => {
        console.info(`Screenshots for test "${testId}" (attempt #${attempt}) were saved:`, imagesInfo);

        /* Expected output:
        Screenshots for test "Feature Test.chrome-desktop" (attempt #0) were saved:
        [
            {
                stateName: 'plain',
                refImg: { path: '...', size: { width: 400, height: 200 } },
                status: 'fail',
                error: undefined,
                diffClusters: [...],
                expectedImg: { path: '...', size: { width: 400, height: 200 } }
                actualImg: { path: '...', size: { width: 400, height: 200 } }
                diffImg: { path: '...', size: { width: 400, height: 200 } }
            }
        ]
        */
    }
);
```

#### Параметры обработчика

В обработчик события передается объект с информацией о тесте следующего вида:

```javascript
{
    testId, // идентификатор теста вида "<test full title>.<browser id>"
    attempt, // номер попытки выполнения теста
    imagesInfo // информация о скриншотах (см. выше пример подписки на событие)
}
```

## REPORT_SAVED

**async | master**

Событие `REPORT_SAVED` триггерится после сохранения всех файлов отчета. Обработчик события может быть асинхронным.

### Подписка на событие

```javascript
hermione.htmlReporter.on(hermione.htmlReporter.events.REPORT_SAVED,
    async ({ reportPath }) => {
        console.info(`Выполняется обработка события REPORT_SAVED, report path = ${reportPath}...`);
    }
);
```

#### Параметры обработчика

В обработчик передается объект с ключом `reportPath`, в значении которого хранится путь к сохраненному отчету.

### Пример использования

```javascript
hermione.htmlReporter.on(hermione.htmlReporter.events.REPORT_SAVED,
    async ({ reportPath }) => {
        await uploadDirToS3(reportPath); // загружаем отчет в хранилище S3
    }
);
```
