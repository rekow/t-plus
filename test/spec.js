/**
 * @file Package test specs for t-plus.
 * @author David Rekow <d@davidrekow.com>
 * @copyright David Rekow 2015
 */

var assert = require('assert'),
  eq = assert.equal,
  t = require('../src/index');

describe("t-plus", function () {

  afterEach(function () {
    t.macros = {};
    t.templates = {};
  });

  it("instantiates a template", function () {
    var tpl = new t('Hello');

    assert(tpl instanceof t);
    eq(tpl.t, 'Hello');
  });

  it("handles undefined source", function (done) {
    var tpl = new t();

    tpl.render({ content: 'I am var' }, function (html) {
      eq(html, '', "Nonexistant templates are evaluated to empty string");
      done();
    });
  });

  it("handles malformed source", function (done) {
    var tpl = new t('{{=}}');

    tpl.render({ content: 'I am var' }, function (html) {
      eq(html, '{{=}}', "Malformed template directives are ignored");
      done();
    });
  });

  it("handles undefined context", function (done) {
    var tpl = new t('{{=undefinedContent}}');

    tpl.render({ content: 'I am var' }, function (html) {
      eq(html, '', "Nonexistant variables are evaluated to empty string");
      done();
    });
  });

  it("interpolates raw content", function (done) {
    var tpl = new t('{{=content}}');

    tpl.render({ content: 'I am var' }, function (html) {
      eq(html, 'I am var', "Variables are correctly replaced");
      done();
    });
  });

  it("interpolates html-safe content", function (done) {
    var tpl = new t('{{%content}}');

    tpl.render({ content: '<div>' }, function (html) {
      eq(html, '&lt;div&gt;', "Variables are correctly scrubbed");
      done();
    });
  });

  it("interpolates computed properties", function (done) {
    var tpl = new t('{{=content}}');

    tpl.render({
      content: function () {
        return '<div>';
      }
    }, function (html) {
      eq(html, '<div>', "Computed properties are called.");
      done();
    });
  });

  it("interpolates deeply-nested context", function (done) {
    var tpl = new t('{{=data.nested.content}}');

    tpl.render({ data: { nested: { content: '<div>' }}}, function (html) {
      eq(html, '<div>', "Nested keys are correctly navigated");
      done();
    });
  });

  it("interpolates iterated context objects", function (done) {
    var tpl = new t('{{@content}}{{=key}}: {{=val}},{{/content}}');

    tpl.render({
      content: {
        key1: 'value1',
        key2: 'value2'
      }
    }, function (html) {
      eq(html, 'key1: value1,key2: value2,', "Object iteration is correctly evaluated.");
      done();
    });
  });

  it("interpolates iterated context arrays", function (done) {
    var tpl = new t('{{@content}}{{=i}}:{{=n}}:{{=val}},{{/content}}');

    tpl.render({
      content: [
        'value1',
        'value2'
      ]
    }, function (html) {
      eq(html, '0:1:value1,1:2:value2,', "Object iteration is correctly evaluated.");
      done();
    });
  });

  it("interpolates scoped context objects", function (done) {
    var tpl = new t('{{>data.nested}}{{=content}}{{/data.nested}}');

    tpl.render({ data: { nested: { content: '<div>' }}}, function (html) {
      eq(html, '<div>', "Nested scope object is correctly evaluated");
      done();
    });
  });

  it("interpolates scoped context arrays", function (done) {
    var tpl = new t('{{>content}}<{{=tag}}></{{=tag}}>{{/content}}');

    tpl.render({
      content: [
       { tag: 'div' },
       { tag: 'span' }
      ]
    }, function (html) {
      eq(html, '<div></div><span></span>', "Nested scope array is correctly evaluated");
      done();
    });
  });

  it("evaluates conditional 'if' blocks", function (done) {
    var tpl = new t('{{exists}}hello{{/exists}}');

    tpl.render({}, function (html) {
      eq(html, '', "content not rendered when conditional context doesn't exist");
      tpl.render({ exists: true }, function (_html) {
        eq(_html, 'hello', 'content rendered when conditional context exists');
        done();
      });
    });
  });

  it("evaluates conditional 'if-not' blocks", function (done) {
    var tpl = new t('{{!exists}}hello{{/exists}}');

    tpl.render({}, function (html) {
      eq(html, 'hello', "content rendered when conditional context doesn't exist");
      tpl.render({ exists: true }, function (_html) {
        eq(_html, '', 'content not rendered when conditional context exists');
        done();
      });
    });
  });

  it("evaluates conditional 'if-else' blocks", function (done) {
    var tpl = new t('{{exists}}hello{{:exists}}goodbye{{/exists}}');

    tpl.render({}, function (html) {
      eq(html, 'goodbye', "fallback content rendered when conditional context doesn't exist");
      tpl.render({ exists: true }, function (_html) {
        eq(_html, 'hello', "content rendered when conditional context exists");
        done();
      });
    });
  });

  it("evaluates blocks in root templates, replacing with content", function (done) {
    var tpl = new t('{{#content}}i am content{{/content}}');

    tpl.render(null, function (html) {
      eq(html, 'i am content', "block content is rendered for each block");
      done();
    });
  });

  it("evaluates simple template inheritance, replacing blocks and ignoring other content", function (done) {
    t.put('parent', '{{#content}}parentContent{{/content}} otherContent');
    var tpl = new t('{{^parent}}{{#content}}i am content{{/content}} ignoredContent');

    tpl.render(null, function (html) {
      eq(html, 'i am content otherContent', "child blocks replace parent blocks, child content outside blocks ignored");
      done();
    });
  });

  it("evaluates complex template inheritance with nested blocks", function (done) {
    t.put('outer', '{{#outer}}outerContent{{/outer}} otherContent');
    t.put('inner', '{{^outer}}{{#outer}}{{#inner}}innerContent{{/inner}} innerOuterContent{{#other}}{{/other}}{{/outer}} ignoredMiddleContent')
    var tpl = new t('{{^inner}}{{#inner}}i am content{{/inner}} ignoredContent');

    tpl.render(null, function (html) {
      eq(html, 'i am content innerOuterContent otherContent', "nested blocks unpack correctly");
      done();
    });
  });

  it("evaluates included templates, passing context", function (done) {
    var included = t.put('included', '{{=content}}');
    var tpl = new t('i am content {{+included}}');

    tpl.render({ content: 'includedContent'}, function (html) {
      eq(html, 'i am content includedContent', "template included and evaluated with same context");
      done();
    });
  });

  it("evaluates included templates, ignoring missing templates", function (done) {
    var tpl = new t('i am content {{+included}}');

    tpl.render({ content: 'includedContent'}, function (html) {
      eq(html, 'i am content ', "missing template inclusion ignored");
      done();
    });
  });

  it("evaluates included templates, ignoring transcludes", function (done) {
    t.put('parent', '{{#block}}{{/block}} parentContent');
    t.put('included', '{{^parent}}{{#block}}{{=content}}{{/block}}');

    var tpl = new t('i am content {{+included}}');

    tpl.render({ content: 'includedContent'}, function (html) {
      eq(html, 'i am content ', "include with extends statement ignored");
      done();
    });
  });

  it("evaluates macro expressions", function (done) {
    t.macro('li', function (i, n, val) {
      return '<li>' + n + ': ' + val + '</li>' + this.parse();
    });

    var tpl = new t('<ul>{{@list}}{{ li(i, n, val) }}{{/list}}</ul>');

    tpl.render({ list: ['a', 'b'] }, function (html) {
      eq(html, '<ul><li>1: a</li><li>2: b</li></ul>', 'macro correctly executes with passed arguments');
      done();
    });
  });

  it("evaluates block macros", function (done) {
    t.macro('li', function (i, n, val) {
      return '<li>' + n + ': ' + val + '</li>';
    });

    var tpl = new t('<ul>{{@list}}{{ li(i, n, val) }}{{/li}}{{/list}}</ul>');

    tpl.render({ list: ['a', 'b'] }, function (html) {
      eq(html, '<ul><li>1: a</li><li>2: b</li></ul>', 'macro correctly executes with passed arguments');
      done();
    });
  });

  it("evaluates block macros, falling back to block content for errors", function (done) {
    var tpl = new t('<ul>{{@list}}{{ li(i, n, val) }}<li>no item</li>{{/li}}{{/list}}</ul>');

    tpl.render({ list: ['a', 'b'] }, function (html) {
      eq(html, '<ul><li>no item</li><li>no item</li></ul>', 'macro correctly executes with passed arguments');
      done();
    });
  });
});