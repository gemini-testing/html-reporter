# Плагины для отчета

## Обзор

Используйте опцию `plugins` в конфиге плагина `html-reporter`, чтобы расширить функциональность отчета с помощью собственных плагинов к отчету.

Чтобы ваши плагины в отчете заработали, включите опцию [pluginsEnabled][plugins-enabled] в конфиге плагина `html-reporter`, установив её значение в `true`.

Список плагинов задается в виде массива с их описаниями. По умолчанию список считается пустым: `[]`.

Плагины позволяют добавить в отчет собственные UI-компоненты (как для статического отчета, так и для GUI-режима), а также серверные «ручки» _(routes)_ (для GUI-режима).

## Настройка

Описание плагинов выглядит следующим образом:

```javascript
plugins: [
    {
        name: 'plugin-name',
        component: 'PluginReactComponentName',
        point: 'extension-point-name',
        position: 'wrap',
        config: { param: 'value' }
    },
    {
        name: 'plugin-name',
        component: 'AnotherPluginReactComponentName',
        point: 'extension-point-name',
        position: 'before'
    },

    // ...
]
```

### Расшифровка параметров конфигурации

| **Параметр** | **Тип** | **Описание** |
| ------------ | ------- | ------------ |
| [name](#name) | String | Обязательный параметр. Имя пакета с плагином для отчета. Предполагается, что плагин можно будет подключить с помощью _require(name)_. |
| [component](#component) | String | Имя React-компонента из плагина. |
| [point](#point) | String | Имя точки расширения в плагине _html-reporter_. |
| [position](#position) | String | Определяет способ, с помощью которого компонент будет размещен в точке расширения. |
| [config](#config) | Object | Конфигурация плагина. |

Плагин, для которого задан только параметр `name`, может быть использован для переопределения существующей мидлвари GUI-сервера.

Плагин может определять больше одного компонента. Каждый компонент может быть применен к нескольким точкам расширения и/или несколько раз к одной и той же точке (с отдельными конфигурационными записями). Порядок применения компонентов определяется порядком конфигурации.

### name

Обязательный параметр. Имя пакета с плагином для отчета. Предполагается, что плагин можно будет подключить с помощью _require(name)_.

### component

Имя React-компонента из плагина.

### point

Имя точки расширения в плагине _html-reporter_.

Определяет конкретное месторасположение указанного компонента внутри пользовательского интерфейса html-отчета.

Подробнее смотрите в разделе «Точки расширения».

### position

Определяет способ, с помощью которого компонент будет размещен в точке расширения пользовательского интерфейса html-отчета.

Доступны следующие значение:

| **Значение** | **Описание** |
| ------------ | ------------ |
| wrap         | обернуть точку расширения в UI |
| before       | разместить компонент перед точкой расширения |
| after        | разместить компонент после точки расширения |

### config

Конфигурация плагина.

## Код плагинов для отчета

Примеры плагинов можно [посмотреть в функциональных тестах][html-reporter-plugins].

Плагин `html-reporter` &mdash; это объект с некоторым набором React-компонентов, заданных в виде его ключей, и необязательным ключом `reducers` с массивом redux-редьюсеров для управления состоянием компонентов, которые позже объединяются с помощью [reduce-reducers][reduce-reducers].

Ожидается, что плагин для отчета будет иметь следующие модульные файлы в корне своего пакета: `plugin.js` и/или `middleware.js`.

### plugin.js

Опциональный модуль. Файл, который должен экспортировать объект (или набор именованных экспортов) или функцию, возвращающую такой объект или массив с некоторой определенной структурой.

Можно повторно использовать зависимости `html-reporter` в плагинах (React, Redux и др.). Для этого из модуля должен быть экспортирован массив со списком необходимых зависимостей, за которым следует функция, с переданными ей соответствующими зависимостями, и возвращающая сам плагин.

Например:

```javascript
import 'plugin-styles.css';

export default ['react', function(React, options) {
    class PluginComponent extends React.Component {
        // реализация компонента
    }

    return {
        PluginComponent,
        reducers: []
    };
}];
```

Стили для плагина должны загружаться вместе с `plugin.js`, и итоговый файл должен быть одним бандлом.

Значение, экспортируемое из `plugin.js`, должно передаваться в `__hermione_html_reporter_register_plugin__`.

Это можно сделать двумя способами.

Например, настроить сборку _webpack_ так, чтобы она создавала соответствующую библиотеку `jsonp`:

```javascript
// ...
output: {
    filename: 'plugin.js',
    path: __dirname,
    library: '__hermione_html_reporter_register_plugin__',
    libraryTarget: 'jsonp'
},
// ...
```

Или передать значение, экспортируемое из `plugin.js`, явно:

```javascript
__hermione_html_reporter_register_plugin__(['react', function(React, options) {
    // ...
    return { PluginComponent };
}]);
```

### middleware.js

Опциональный модуль. Экспортирует функцию, принимающую `Router` от [express][express]. Ожидается, что «ручки» плагина будут подключены к роутеру. А роутер затем подключается к «ручке» `/plugin-routes/:pluginName/`.

```javascript
module.exports = function(pluginRouter) {
    pluginRouter.get('/plugin-route', function(req, res) {
        // реализация «ручки»
    });
};
```

Затем «ручки» могут быть вызваны из React-компонентов плагина, определенных в `plugin.js `. Для удобства имя плагина всегда передается с опциями под названием `pluginName`, когда для экспорта используется функция или массив функций:

```javascript
export default ['react', 'axios', function(React, axios, { pluginName, pluginConfig, actions, actionNames, selectors }) {
    class PluginComponent extends React.Component {
        // ... где-то внутри компонента ...
        const result = await axios.get(`/plugin-routes/${pluginName}/plugin-route`);
    }

    return {
        PluginComponent,
        reducers: []
    };
}
```

В этом примере также можно увидеть следующие свойства:

| **Свойство** | **Описание** |
| ------------ | ------------ |
| pluginName   | имя плагина |
| pluginConfig | конфигурация плагина |
| actions      | Redux-действия |
| actionNames  | имена действий в _html-reporter_, которые используются в Redux-действиях, чтобы иметь возможность подписаться на события отчета |
| selectors    | закэшированные селекторы отчета, которые были созданы с помощью библиотеки [reselect][redux-reselect] |

### Доступные зависимости

В плагинах доступны следующие зависимости:

- [react][react]
- [redux][redux]
- [react-redux][react-redux]
- [lodash][lodash]
- [prop-types][prop-types]
- [classnames][classnames]
- [semantic-ui-react][semantic-ui-react]
- [react-markdown][react-markdown]
- [reduce-reducers][reduce-reducers]
- [immer][immer]
- [reselect][redux-reselect]
- [axios][axios]

### Доступные компоненты

#### `<Details />`

Компонент, с помощью которого можно переключать отображение контента (аналог ката).

Пример использования:

```javascript
// ...внутри вашего React-компонента

render() {
    return <Details
        title='Some title'
        content='Some content' // контент, который будет появляться по нажатию на заголовок
        extendClassNames='some_class_name' // можно добавить свои css-классы к компоненту
        onClick={() => console.log('clicked')} // а также свой обработчик
    />
}
```

где:

| **Свойство** | **Тип** | **Описание** |
| ------------ | ------- | ------------ |
| title | String или JSX.Element | Обязательный параметр. Заголовок, описывающий информацию, скрытую под ним. |
| content | Function или String или String[] или JSX.Element | Обязательный параметр. Контент, который будет появляться по нажатию на заголовок. |
| extendClassNames | String или String[] | Css-классы, которые нужно добавить к компоненту. Необязательный параметр. |
| onClick | Function | Обработчик, который будет вызван по нажатию на заголовок. Необязательный параметр. |

## Точки расширения

Точки расширения &mdash; это места в пользовательском интерфейсе отчета, которые доступны для расширения с помощью React-компонентов, экспортируемых _плагинами для отчета_.

Каждая точка расширения может передавать определенные props'ы компонентам плагина в зависимости от самой точки. Поскольку некоторые плагины могут полагаться на конкретное размещение и, следовательно, на конкретные props'ы, то можно ограничить компоненты плагина определенными точками расширения, указав статическое свойство `point` для таких компонентов плагина:

```javascript
class PluginComponent extends React.Component {
    static point = 'result';
    // ...
}
```

В данный момент доступны следующие точки расширения:

| **Точка** | **Описание** |
| --------- | ------------ |
| result    | Позволяет расширить каждый результат теста. Добавляет props'ы _resultId_ и _testName_ в компонент плагина. |
| result_meta | Позволяет расширить мета-информацию для каждого результата теста. Добавляет props'ы _resultId_ и _testName_ в компонент плагина. |
| menu-bar | Позволяет расширить меню. |
| root | Позволяет добавить такие плавающие элементы, как модальное окно или попап. |

Точка расширения может быть расширена более чем одним компонентом. В этом случае порядок применения компонентов определяется порядком настройки плагинов. Каждый следующий компонент применяется ко всем ранее составленным компонентам в точке расширения.

[plugins-enabled]: ./html-reporter-setup.md#pluginsenabled
[html-reporter-plugins]: https://github.com/gemini-testing/html-reporter/blob//master/./test/func/html-reporter-plugins
[reduce-reducers]: https://github.com/redux-utilities/reduce-reducers
[express]: https://github.com/expressjs/express
[redux-reselect]: https://github.com/reduxjs/reselect
[react]: https://github.com/facebook/react
[redux]: https://github.com/reduxjs/redux
[react-redux]: https://github.com/reduxjs/react-redux
[lodash]: https://github.com/lodash/lodash
[prop-types]: https://github.com/facebook/prop-types
[classnames]: https://github.com/JedWatson/classnames
[semantic-ui-react]: https://github.com/Semantic-Org/Semantic-UI-React
[react-markdown]: https://github.com/remarkjs/react-markdown
[immer]: https://github.com/immerjs/immer
[axios]: https://github.com/axios/axios
