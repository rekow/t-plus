# t+
Tiny, terse templates. Based on [`t`](https://github.com/jasonmoo/t.js).

Inheritance, macros, basic conditional and iteration logic.

[![Build Status](https://travis-ci.org/davidrekow/t-plus.svg?branch=master)](https://travis-ci.org/davidrekow/t-plus) [![Coverage Status](https://coveralls.io/repos/davidrekow/t-plus/badge.png?branch=master)](https://coveralls.io/r/davidrekow/t-plus?branch=master)

## Usage

```javascript
var template = new t('<div id="{{=id}}">{{=content}}</div>');

template.render({
  id: 'div-main',
  content: 'Heyyyyy'
}, function (html) {
  // do something with the rendered content
});
```

## Syntax

### Variable interpolation

- As-is: `{{=variable}}`
- HTML-safe: `{{%variable}}`

### Conditionals

- If: `{{variable}}it exists!{{/variable}}`
- If-not: `{{!variable}}it doesn't exist!{{/variable}}`
- If-else:

```
{{variable}}
  it exists!
{{:variable}}
  it doesn't exist!
{{/variable}}
```

### Enumeration

- Objects: `{{@object}}{{=key}}{{=val}}{{/object}}`
- Arrays: `{{@list}}{{=i}}{{=n}}{{=val}}{{/list}}`
  - `i` is the index
  - `n` is `i + 1` (for numbering)
  - `val` is the item

### Scoped evaluation

  - Object - takes the argument and uses it as base context:

```javascript
var template = new t('{{>obj}}{{=prop1}}{{=prop2}}{{/obj}}');

// Sample data
template.render({
  obj: {
    prop1: 'val1',
    prop2: 'val2'
  }
}, function (html) {
  // html is 'val1val2'
});
```

  - Array - takes the argument and uses each item as base context:

```javascript
var template = new t('{{>objList}}{{=prop1}}{{=prop2}}{{/objList}}');

template.render({
  objList: [{
    prop1: 'val1',
    prop2: 'val2'
  }, {
    prop1: 'val3',
    prop2: 'val4'
  }]
}, function (html) {
  // html is 'val1val2val3val4'
});

```

### Inheritance

- Inline includes (rendered in parent context): `{{+includedTemplate}}`
- Named blocks with default content: `{{#block1}}content{{/block1}}`
- Extending a template & overriding blocks

in `layout/main`:
```
{{^layout/base}}

{{#main}}
  {{#header}}{{/header}}

  {{#content}}
    default content
  {{/content}}

  {{#footer}}{{/footer}}
{{/main}}
```

in `index`:
```
{{^layout/main}}

{{#header}}<nav></nav>{{/header}}

{{#content}}I will be seen!{{/content}}
```

- Included and extended templates must be registered first:

```javascript
t.put('layout/base', baseTpl);
t.put('layout/main', mainTpl);

// Can also pass source string to auto-instantiate
t.put('includedTemplate', 'I feel included');
```

### Macros
- Expression: `{{macroName(arg1, "a string")}}`
- Block, with default content:

```
{{macroName()}}
  I'm default content
{{/macroName}}
```

- Arguments, unless strings, are evaluated against current scope
- Macros must be registered by name first:

```javascript
t.macro('macroName', function (arg1, string1) {
  // use get() to access context in the current scope
  var arg2 = this.get('arg2');

  // trims leading and trailing whitespace
  var trimmed = this.trim(' hello ');

  // returns html-safe content
  var scrubbed = this.scrub('<div>');

  // interpolates a string against the current scope
  var arg3and4 = this.parse('{{=arg3}}{{=arg4}}');

  // return an HTML string, or throw an error to render default content
  return '<div></div>';
});
```

### Whitespace and newline agnostic
- These are the same: `{{=id}}`, `{{= id }}`, `{{ =id }}`
- So are these: `{{check}}yep!{{:check}}nope!{{/check}}`,

```
{{check}}
  yep!
{{:check}}
  nope!
{{/check}}
```

## why?

No good reason, really. I've been using it forever & finally decided to push a friendly version. It's pretty fast, though.

`¯\_(ツ)_/¯`
