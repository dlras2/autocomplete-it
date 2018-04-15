# autocomplete-it

[![npm](https://img.shields.io/npm/v/autocomplete-it.svg)](https://www.npmjs.com/package/autocomplete-it) ![npm bundle size (minified + gzip)](https://img.shields.io/bundlephobia/minzip/autocomplete-it.svg)

Use autocomplete-it to implement intelligent autocomplete functionality in your app. Queries can match parts of the beginnings of sequential words, and matches can optionally be wrapped for client-side highlighting.

## Usage

### API

#### constructor(inputs[, options])

* `inputs` &lt;Array&gt;
* `options` &lt;Object&gt;
  * `defaultLimit` &lt;integer&gt; **Default:** `10`
  * `maximumLimit` &lt;integer&gt; **Default:** `100`

```javascript
const AI = require('autocomplete-it');
const values = [
  'blood orange',
  'boysenberry',
  'goji berry',
  'gooseberry',
  'orange'
];
const ai = new AI(values);
```

#### lookup(query[, options])

* `query` &lt;string&gt;
* `options` &lt;Object&gt;
  * `limit` &lt;integer&gt; | &lt;undefined&gt;
  * `highlight` &lt;string&gt; | &lt;Array&gt;

Simply look up values that match the given query.

```javascript
ai.lookup('go');
// [ 'goji berry',
//   'gooseberry' ]
```

Highlight the matched query pieces.

```javascript
ai.lookup('go', { highlight: '[]' });
// [ { display: '[go]ji berry', value: 'goji berry' },
//   { display: '[go]oseberry', value: 'gooseberry' } ]
```

Queries that match the beginning of the value return before other matches.

```javascript
ai.lookup('or', { highlight: '[]' });
// [ { display: '[or]ange', value: 'orange' },
//   { display: 'blood [or]ange', value: 'blood orange' } ]
```

If not enough results match the query as a whole, split matches are returned.

```javascript
ai.lookup('bo', { highlight: '[]' });
// [ { display: '[bo]ysenberry', value: 'boysenberry' },
//   { display: '[b]lood [o]range', value: 'blood orange' } ]
```

Split queries force a wordbreak before matching values further.

```javascript
ai.lookup('b o', { highlight: '[]' });
// [ { display: '[b]lood [o]range', value: 'blood orange' } ]
```
