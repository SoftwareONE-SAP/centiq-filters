Filter = typeof Filter === 'undefined' ? {} : Filter;

/**
 * Eq(field)(value)
 *
 * { field: { $eq: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/eq/
 */
Filter.Eq = function EqFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('Eq takes a single String argument');
  }
  return function Eq(value) {
    if (value !== null && typeof value !== 'string' && typeof value !==
      'number') {
      throw new Error('Invalid value passed to Eq for ' + field);
    }
    var selector = {};
    selector[field] = value;
    return selector;
  };
};

/**
 * Ne(field)(value)
 *
 * { field: { $ne: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/ne/
 */
Filter.Ne = function NeFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('Ne takes a single String argument');
  }
  return function Ne(value) {
    if (value !== null && typeof value !== 'string' && typeof value !==
      'number') {
      throw new Error('Invalid value passed to Ne for ' + field);
    }
    var selector = {};
    selector[field] = { $ne: value };
    return selector;
  };
};

/**
 * Gt(field)(value)
 *
 * { field: { $gt: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/gt/
 */
Filter.Gt = function GtFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('Gt takes a single String argument');
  }
  return function Gt(value) {
    if (typeof value !== 'number' && !(value instanceof Date)) {
      value = parseFloat(value);
      if (isNaN(value)) {
        throw new Error('Invalid value passed to Gt for ' + field);
      }
    }
    var selector = {};
    selector[field] = {
      $gt: value
    };
    return selector;
  };
};

/**
 * Gte(field)(value)
 *
 * { field: { $gte: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/gte/
 */
Filter.Gte = function GteFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('Gte takes a single String argument');
  }
  return function Gte(value) {
    if (typeof value !== 'number' && !(value instanceof Date)) {
      value = parseFloat(value);
      if (isNaN(value)) {
        throw new Error('Invalid value passed to Gte for ' + field);
      }
    }
    var selector = {};
    selector[field] = {
      $gte: value
    };
    return selector;
  };
};

/**
 * Lt(field)(value)
 *
 * { field: { $lt: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/lt/
 */
Filter.Lt = function LtFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('Lt takes a single String argument');
  }
  return function Lt(value) {
    if (typeof value !== 'number' && !(value instanceof Date)) {
      value = parseFloat(value);
      if (isNaN(value)) {
        throw new Error('Invalid value passed to Lt for ' + field);
      }
    }
    var selector = {};
    selector[field] = {
      $lt: value
    };
    return selector;
  };
};

/**
 * Lte(field)(value)
 *
 * { field: { $lte: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/lte/
 */
Filter.Lte = function LteFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('Lte takes a single String argument');
  }
  return function Lte(value) {
    if (typeof value !== 'number' && !(value instanceof Date)) {
      value = parseFloat(value);
      if (isNaN(value)) {
        throw new Error('Invalid value passed to Lte for ' + field);
      }
    }
    var selector = {};
    selector[field] = {
      $lte: value
    };
    return selector;
  };
};

/**
 * In(field)([values])
 *
 * { field: { $in: [values] } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/in/
 */
Filter.In = function InFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('In takes a single String argument');
  }
  return function In(values) {
    if (!Array.isArray(values)) {
      throw new Error('Invalid value passed to In');
    }

    if (values.length === 1) {
      return Filter.Eq(field)(values[0]);
    }

    var selector = {};
    selector[field] = {
      $in: values,
    };
    return selector;
  };
};

/**
 * Nin(field)([values])
 *
 * { field: { $nin: [values] } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/nin/
 */
Filter.Nin = function NinFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('Nin takes a single String argument');
  }
  return function Nin(values) {
    if (!Array.isArray(values)) {
      throw new Error('Invalid value passed to Nin');
    }

    if (values.length === 1) {
      return Filter.Ne(field)(values[0]);
    }

    var selector = {};
    selector[field] = {
      $nin: values,
    };
    return selector;
  };
};

/**
 * Or({
 * 	k1: filter1
 * 	k2: filter2,
 * 	k3: filter3(10),
 * })({ k1: 2, k2: 4 })
 *
 * { $or: [ filter1(2), filter2(4), filter3(10) ] }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/or/
 */
Filter.Or = function OrFactory(filters) {
  if (arguments.length !== 1 || typeof filters !== 'object') {
    throw new Error('Or takes a single Object argument');
  }
  return function Or(values) {
    if (typeof values === 'undefined') {
      values = {};
    }
    if (typeof values !== 'object') {
      throw new Error('Invalid value passed to Or');
    }
    var queries = [];
    if (Array.isArray(filters)) {
      queries = filters;
    } else {
      Object.keys(filters).forEach(function(name){
        var query = filters[ name ];
        if (typeof query === 'function') {
          query = query(values[ name ]);
        }
        queries.push(query);
      });
    }
    return fixupOr({
      $or: queries,
    });
  };
};

/**
 * And({
 * 	k1: filter1
 * 	k2: filter2,
 * 	k3: filter3(10),
 * })({ k1: 2, k2: 4 })
 *
 * { $and: [ filter1(2), filter2(4), filter3(10) ] }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/and/
 */
Filter.And = function AndFactory(filters) {
  if (arguments.length !== 1 || typeof filters !== 'object') {
    throw new Error('And takes a single Object argument');
  }
  return function And(values) {
    if (typeof values === 'undefined') {
      values = {};
    }
    if (typeof values !== 'object') {
      throw new Error('Invalid value passed to And');
    }
    var queries = [];
    if (Array.isArray(filters)) {
      queries = filters;
    } else {
      Object.keys(filters).forEach(function(name){
        var query = filters[ name ];
        if (typeof query === 'function') {
          query = query(values[ name ]);
        }
        queries.push(query);
      });
    }
    return fixupAnd({
      $and: queries,
    });
  };
};

/**
 * Not(Gt(field))(3)
 *
 * { field: { $not: { $gt: 3 } } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/not/
 */
Filter.Not = function NotFactory(func) {
  if (arguments.length !== 1 || typeof func !== 'function') {
    throw new Error('Eq takes a single Function argument');
  }
  return function Not(value) {
    var selector = func(value);

    /**
     * Special case for $where as this is not allowed:
     *     { $not: { $where: func } }
     *
     * But this equivalent is:
     *     { $where: function(){ return !func.apply(this, arguments) } }
     */
    if (selector.$where) {
      var where = selector.$where;
      if (typeof where === 'string') {
        where = Function('return !(' + where.replace(/[\s;]+$/, '') + ')');
      } else {
        where = function() {
          return !(selector.$where.apply(this, arguments));
        };
      }
      return {
        $where: where,
      };
    }

    Object.keys(selector).forEach(function(k) {
      var v = selector[k];

      if (v instanceof RegExp) {
        // { $not: RegExp } is fine and dandy. Leave alone
      } else if (v !== null && typeof v === 'object') {
        if (v.$regex) v = fixupRegex(v);
      } else {
        /**
         * Not allowed: { field: { $not: 'wibble' } }
         * Allowed:     { field: { $not: { $eq: 'wibble' } } }
         */
        v = {
          $eq: v
        };
      }

      selector[k] = {
        $not: v
      };
    });

    return selector;
  };
};

/**
 * Nor({
 * 	k1: filter1
 * 	k2: filter2,
 * 	k3: filter3(10),
 * })({ k1: 2, k2: 4 })
 *
 * { $nor: [ filter1(2), filter2(4), filter3(10) ] }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/nor/
 */
Filter.Nor = function NorFactory(filters) {
  if (arguments.length !== 1 || typeof filters !== 'object') {
    throw new Error('Nor takes a single Object argument');
  }
  return function Nor(values) {
    if (typeof values === 'undefined') {
      values = {};
    }
    if (typeof values !== 'object') {
      throw new Error('Invalid value passed to Nor');
    }
    var queries = [];
    if (Array.isArray(filters)) {
      queries = filters;
    } else {
      Object.keys(filters).forEach(function(name){
        var query = filters[ name ];
        if (typeof query === 'function') {
          query = query(values[ name ]);
        }
        queries.push(query);
      });
    }
    return {
      $nor: queries,
    };
  };
};

/**
 * Exists(field)()      => { field: { $exists: true } }
 * Exists(field)(false) => { field: { $exists: false } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/exists/
 */
Filter.Exists = function ExistsFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('Exists takes a single String argument');
  }
  return function Exists(value) {
    if (typeof value === 'undefined') value = true;
    var selector = {};
    selector[field] = {
      $exists: !!value
    };
    return selector;
  };
};

/**
 * Type(field, value)()
 *
 * { field: { $type: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/type/
 */
Filter.Type = function TypeFactory(field, value) {
  if (arguments.length !== 2 || typeof field !== 'string' || typeof value !== 'number' || isNaN(value)) {
    throw new Error('Type takes a String argument followed by a number');
  }
  return function Type() {
    var selector = {};
    selector[field] = {
      $type: value
    };
    return selector;
  };
};

/**
 * Mod(field)({ divisor: 5, remainder: 1 })
 *
 * { field: { $mod: [5, 1] } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/mod/
 */
Filter.Mod = function ModFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('Mod takes a single String argument');
  }
  return function Mod(value) {
    var error = new Error('Invalid value passwd to Mod');

    if (typeof value !== 'object') throw error;

    var divisor = parseInt(value.divisor);
    var remainder = parseInt(value.remainder);

    if (typeof divisor !== 'number' || isNaN(divisor)) throw error;
    if (typeof remainder !== 'number' || isNaN(remainder)) throw error;

    var selector = {};
    selector[field] = {
      $mod: [divisor, remainder],
    };
    return selector;
  };
};

/**
 * Regex(field)(/value/)
 *     { field: /value/ } }
 *
 * Regex(field)(value)
 *     { field: /value/ } }
 *
 * Regex(field, options)(value)
 *     { field: { $regex: value, $options: options } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/regex/
 */
Filter.Regex = function RegexFactory(field, regex, options) {
  if (typeof field !== 'string'
    || (typeof regex   !== 'string'    && typeof regex !== 'number' && !(regex instanceof RegExp) )
    || (typeof options !== 'undefined' && typeof options !== 'string' && options !== null)
  ) {
    throw new Error('Regex received invalid args');
  }

  regex = fixupRegex({
    $regex:   regex,
    $options: options,
  });

  return function Regex() {
    if (arguments.length) {
      throw new Error("Regex filter does not take arguments");
    }
    var selector = {};
    selector[field] = regex;
    return selector;
  };
};

/**
 * Text(language)(value)
 *
 * { $text: { $search: value, $language: language }}
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/text/
 */
Filter.Text = function TextFactory(language) {
  if (arguments.length > 1 || (typeof language !== 'string' && typeof language !== 'undefined' && language !== null)) {
    throw new Error('Text takes a single optional String argument');
  }
  return function Text(value) {

    if (typeof value === 'number') {
      value = String(value);
    } else if (typeof value !== 'string') {
      throw new Error('Invalid value passed to Text');
    }

    var selector = {
      $text: {
        $search: value
      },
    };
    if (language) {
      selector.$text.$language = language;
    }
    return selector;
  };
};

/**
 * Where(func)(value)
 *
 * { $where: function(value) { return func.apply(this, arguments) } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/where/
 */
Filter.Where = function WhereFactory(func) {
  if (arguments.length !== 1 || (typeof func !== 'string' && typeof func !== 'function')) {
    throw new Error('Where takes a single String or Function argument');
  }

  if (typeof func === 'string') {
    func = Function('return ' + func);
  }
  return function Where(value) {

    var funcWrapper = function() {
      return func.call(this, value);
    };

    return {
      $where: funcWrapper,
    };
  };
};

/**
 * All(field)(values)
 *
 * { field: { $all: values } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/all/
 */
Filter.All = function AllFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('All takes a single String argument');
  }
  return function All(filters) {
    if (!Array.isArray(filters)) {
      throw new Error('Invalid value passed to All');
    }
    var selector = {};
    selector[field] = {
      $all: filters
    };
    return selector;
  };
};

/**
 * ElemMatch(field)({values})
 *
 * { field: { $elemMatch: {values} } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/elemMatch/
 */
Filter.ElemMatch = function ElemMatchFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('ElemMatch takes a single String argument');
  }
  return function ElemMatch(value) {
    if (typeof value !== 'object') {
      throw new Error('Invalid value passed to ElemMatch');
    }
    var selector = {};
    selector[field] = {
      $elemMatch: value
    };
    return selector;
  };
};

/**
 * Size(field)(value)
 *
 * { field: { $size: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/size/
 */
Filter.Size = function SizeFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('Size takes a single String argument');
  }
  return function Size(value) {
    value = parseInt(value);
    if (isNaN(value)) {
      throw new Error('Invalid value passed to Size');
    }
    var selector = {};
    selector[field] = {
      $size: value
    };
    return selector;
  };
};

/**
 * Compresses:
 *   { $and: [
 *   	 { field1: 1 },
 *   	 { field2: 2 },
 *   	 { field3: 3 },
 *   	 { field2: 4 },
 *   ] }
 *
 * To:
 *
 *   {
 *     field1: 1,
 *     field2: 2,
 *     field3: 3,
 *     $and: [ { field2: 4 } ],
 *   }
 */
function fixupAnd (query) {
  if (!query.$and) return query;

  var $and = [];

  query.$and.forEach(function(q){
    Object.keys(q).forEach(function(k){
      if (query.hasOwnProperty(k)) {
        $and.push(q);
      } else {
        query[ k ] = q[ k ];
      }
    })
  });

  delete query.$and;
  if ($and.length) {
    query.$and = $and;
  }

  return query;
}

/**
 * Compresses: { $or: [ { field1: 1 } ] } to: { field1: 1 }
 */
function fixupOr (query) {
  if (!query.$or) return query;
  if (query.$or.length > 1) return query;

  Object.keys(query.$or[0]).forEach(function(k){
    if (!query.hasOwnProperty(k)) {
      query[ k ] = query.$or[0][ k ];
      delete query.$or[0][ k ];
    }
  });
  if (Object.keys(query.$or[0]).length === 0) {
    delete query.$or;
  }

  return query;
}

/**
 * Compresses:
 * 	{ $regex: /foo/, $options: 'i' }
 *
 * To:
 *  /foo/i
 */
function fixupRegex (query) {
  if (!query.$regex) return query;

  /**
   * Don't compress if there is anything else in there. E.g:
   * { $regex: /^F/, $eq: 'Foo' }
   */
  var canCompress = true;
  Object.keys(query).forEach(function(k){
    if (k !== '$regex' && k !== '$options') {
      canCompress = false;
    }
  });
  if (!canCompress) return query;

  var regex   = query.$regex;
  var options = query.$options;

  if (typeof regex === 'number') {
    regex = String(regex);
  }

  if (options) {
    if (typeof regex === 'string') {
      return new RegExp(regex, options);
    } else {
      var rxs = regex.toString();
      var mat = rxs.match(/^\/([\s\S]*)\/([a-z]*)$/);
      rxs     = mat[1];
      options = mat[2] + options;
      options = Object.keys(
        options.split('').reduce(function(o, l){
          o[ l ] = 1;
          return o
        },{})
      ).sort().join('');
      return new RegExp(rxs, options);
    }
  } else if (typeof regex === 'string'){
    return new RegExp(regex);
  } else {
    return regex;
  }
}
