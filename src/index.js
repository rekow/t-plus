/**
 * @file Main t module.
 * @author David Rekow <d@davidrekow.com>
 * @copyright David Rekow 2012-2015
 */

/**
 * A directive for dynamically rendering HTML.
 * 
 * @typedef {function(this:Scope, ...?):string}
 */
var Macro;


/**
 * Matchers.
 */
var RE = /** @type {Object.<string, RegExp>} */({
  block: /\{\{\s*?([@!>#]?)(.+?)\s*?\}\}(([\s\S]*?)(\{\{\s*?:\2\s*?\}\}([\s\S]*?))?)\{\{\s*?\/\1?\2\s*?\}\}/g,
  include: /\{\{\s*?\+\s*?([^\s]+?)\s*?\}\}/g,
  extend: /^\s*?\{\{\s*?\^([\w\W]+?)\s*?\}\}/,
  macro: /\{\{\s*?(([^\s\(]+))\(([^\)]*?)\)\s*?\}\}(?:([\s\S.]*)\{\{\s*?\/\s*?(?:\1|\2)\}\})?/g,
  section: /\{\{\s*?(#(.+?))\s*?\}\}([\s\S]*?)\{\{\s*?\/\1?\2\s*?\}\}/g,
  val: /\{\{\s*?([=%])\s*?(.+?)\s*?\}\}/g,
  quoted: /^('|")(?:.*?)\1$/,
  length: /\.length$/,
  triml: /^\s+/,
  trimr: /\s+$/,
  apos: /'/g,
  quot: /"/g,
  lt: /</g,
  gt: />/g
});

/**
 * Handlers.
 */
var FN = /** @const */({
  /**
   * Processes template extensions.
   *
   * @param {t} tpl
   * @param {Object.<string, string>} sections
   * @param {function(t)} cb
   */
  extend: function (tpl, sections, cb) {
    var hasParent = RE.extend.exec(tpl.t),
      extended = tpl.t.replace(RE.section, function (_, __, name, inner) {
        if (!sections[name]) {
          sections[name] = inner;
        }

        return hasParent ? _ : sections[name];
      });

    if (hasParent) {
      return t.get(hasParent[1], /** @param {t} parent */(function (parent) {
        tpl.t = parent.t;
        return FN.extend(tpl, sections, cb);
      }));
    }

    tpl.t = extended;

    if (RE.section.test(tpl.t)) {
      return FN.extend(tpl, sections, cb);
    }

    return cb(tpl);
  },

  /**
   * Processes template includes.
   *
   * @param {t} tpl
   * @param {Scope} scope
   * @param {function(string)} cb
   */
  include: function (tpl, scope, cb) {
    var includes = [],
      hasInclude;

    while ((hasInclude = RE.include.exec(tpl.t))) {
      includes.push(hasInclude[1]);
    }

    if (includes.length) {
      return t.get(includes, function (includes) {
        tpl.t = tpl.t.replace(RE.include, function (_, name) {
          var include = includes[name];

          if (include && !RE.extend.test(include.t)) {
            return include.t;
          }

          return '';
        });

        return FN.include(tpl, scope, cb);
      });
    }

    tpl.parsed = tpl.t;

    return t.render(tpl, scope, cb);
  }
});


/**
 * Template constructor.
 *
 * @constructor
 * @param {string} source Template source.
 */
var t = function (source) {
  /**
   * @expose
   * @type {string}
   */
  this.t = source;

  /**
   * @private
   * @type {string}
   */
  this.src = source;

  /**
   * @private
   * @type {?string}
   */
  this.parsed = null;
};

/**
 * Currently-installed macros.
 *
 * @expose
 * @static
 * @type {Object.<string, Macro>}
 */
t.macros = {};

/**
 * Currently-installed templates.
 *
 * @expose
 * @static
 * @type {Object.<string, t>}
 */
t.templates = {};

/**
 * Gets a template by name, or a list by names.
 *
 * @expose
 * @static
 * @param {(string|Array.<string>)} name
 * @param {(function(t)|function(Object.<string, t>))} cb
 */
t.get = function (name, cb) {
  var result, count;

  if (Array.isArray(name)) {
    result = {};
    count = name.length;

    name.forEach(function (name) {
      t.get(name, function (_t) {
        result[name] = _t;
        if (--count === 0) {
          cb(result);
        }
      });
    });
  } else {
    cb(t.templates[/** @type {string} */(name)]);
  }
};

/**
 * Registers or returns a macro by name.
 *
 * @expose
 * @static
 * @param {string} name
 * @param {Macro=} macro
 * @return {?Macro}
 */
t.macro = function (name, macro) {
  if (macro) {
    t.macros[name] = macro;
  }

  return t.macros[name];
};

/**
 * Registers a template by name.
 *
 * @expose
 * @static
 * @param {string} name
 * @param {(t|string)} tpl
 */
t.put = function (name, tpl) {
  t.templates[name] = tpl instanceof t ? tpl : new t(/** @type {string} */(tpl));
};

/**
 * Initiates a render pass and executes macros.
 *
 * @private
 * @static
 * @param {t} tpl
 * @param {Scope} scope
 * @param {function(string)} cb
 */
t.render = function (tpl, scope, cb) {
  var html;

  if (!tpl.t) {
    return cb('');
  }

  tpl.src = tpl.t;

  if (!tpl.parsed) {
    return FN.extend(tpl, {}, function (_t) {
      return FN.include(_t, scope, cb);
    });
  }

  tpl.t = tpl.parsed;

  html = scope.parse(tpl.t);

  tpl.t = tpl.src;
  return cb(html);
};

/**
 * External method to begin render.
 * @expose
 * @param {Object.<string, ?>} scope
 * @param {function(string)} cb
 */
t.prototype.render = function (scope, cb) {
  var tpl = this;
  setTimeout(function () {
    t.render(tpl, new Scope(scope), cb);
  }, 0);
};


/**
 * The lexical scope a template is rendered with.
 *
 * @private
 * @constructor
 * @param {Object.<string, ?>} scope
 */
var Scope = function (scope) {
  /**
   * @private
   * @type {Object.<string, ?>}
   */
  this.data = scope;
};

/**
 * Resolves the value for a given key on the current Scope.
 *
 * @expose
 * @param {string} key
 * @return {?}
 */
Scope.prototype.get = function (key) {
  /*jshint eqnull:true*/
  var data = this.data,
    parts = key.split('.');

  while (data && parts.length > 1) {
    data = data[parts.shift()];
  }

  // Handle computed properties, preserving correct `this` value.
  if (typeof data[parts[0]] === 'function') {
    return data[parts.shift()]();
  }

  data = data[parts.shift()];
  return data == null ? '' : data;
};

/**
 * Trims trailing whitespace from the beginning and end of a string.
 *
 * @expose
 * @param {(string|Array.<string>)} str
 * @return {(string|Array.<string>)}
 */
Scope.prototype.trim = function (str) {
  if (str.charAt) {
    return str.replace(RE.triml, '').replace(RE.trimr, '');
  }

  return str.map(this.trim);
};

/**
 * Scrubs HTML output to prevent unsafe injection.
 *
 * @expose
 * @param {?} val
 * @return {string}
 */
Scope.prototype.scrub = function (val) {
  var scrubbed = typeof Option === 'object' ? new Option(val).innerHTML :
    val.toString().replace(RE.lt, '&lt;').replace(RE.gt, '&gt;');

  return scrubbed.replace(RE.apos, '&apos;').replace(RE.quot, '&quot;');
};

/**
 * Parses a passed string synchronously for expressions using the current scope.
 *
 * @expose
 * @param {string} source
 * @return {string}
 */
Scope.prototype.parse = function (source) {
  if (!source) {
    return '';
  }

  var scope = this;

  return source.replace(RE.block, function (_, meta, key, inner, ifTrue, hasElse, ifFalse) {
    var val = scope.get(key),
      scoped, parsed;

    if (!val) {
      if (meta === '!') {
        return scope.parse(inner);
      } else if (hasElse) {
        return scope.parse(ifFalse);
      }
      
      return '';
    }

    if (!meta) {
      if (hasElse) {
        return scope.parse(ifTrue);
      }

      return scope.parse(inner);
    } else if (meta === '!') {
      return '';
    }

    scoped = scope.data;

    if (meta === '@') {
      parsed = '';

      if (Array.isArray(val)) {
        val.forEach(function (value, i) {
          scope.data = { i: i, n: i + 1, val: value };
          parsed += scope.parse(inner);
        });
      } else {
        for (key in val) {
          if (val.hasOwnProperty(key)) {
            scope.data = { key: key, val: val[key] };
            parsed += scope.parse(inner);
          }
        }
      }
    } else if (meta === '>') {
      if (Array.isArray(val)) {
        parsed = '';

        val.forEach(function (value) {
          scope.data = value;
          parsed += scope.parse(inner);
        });
      } else {
        scope.data = val;
        parsed = scope.parse(inner);
      }
    }

    scope.data = scoped;

    return parsed;
  }).replace(RE.val, function (_, meta, key) {
    var val = scope.get(key);

    if (val || (val === 0 && !RE.length.test(key))) {
      return meta === '%' ? scope.scrub(val) : val;
    }

    return '';
  }).replace(RE.macro, function (_, __, name, params, inner) {
    var macro = t.macro(name),
      args = scope.trim(params.split(',')).map(/** @param {string} param */(function (param) {
        return RE.quoted.test(param) ? param.slice(1, -1) : scope.get(param);
      }));

    try {
      return macro.apply(scope, args);
    } catch (err) {}

    return scope.parse(inner || '');
  });
};


/** @expose */
this.t = t;


var module = module || {};

if (typeof module.exports === 'object') {
  /** @expose */
  module.exports = t;
}
