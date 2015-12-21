/**
 * EqFilter(field)(value)
 *
 * { field: { $eq: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/eq/
 */
module.exports.EqFilter = function EqFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('EqFilter takes a single String argument');
  }
  return function EqFilter(value) {
    if (value !== null && typeof value !== 'string' && typeof value !==
      'number') {
      throw new Error('Invalid value passed to EqFilter for ' + field);
    }
    var selector = {};
    selector[field] = value;
    return selector;
  };
};

/**
 * GtFilter(field)(value)
 *
 * { field: { $gt: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/gt/
 */
module.exports.GtFilter = function GtFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('GtFilter takes a single String argument');
  }
  return function GtFilter(value) {
    if (typeof value !== 'number' && !(value instanceof Date)) {
      value = parseFloat(value);
      if (isNaN(value)) {
        throw new Error('Invalid value passed to GtFilter for ' + field);
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
 * GteFilter(field)(value)
 *
 * { field: { $gte: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/gte/
 */
module.exports.GteFilter = function GteFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('GteFilter takes a single String argument');
  }
  return function GteFilter(value) {
    if (typeof value !== 'number' && !(value instanceof Date)) {
      value = parseFloat(value);
      if (isNaN(value)) {
        throw new Error('Invalid value passed to GteFilter for ' + field);
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
 * LtFilter(field)(value)
 *
 * { field: { $lt: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/lt/
 */
module.exports.LtFilter = function LtFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('LtFilter takes a single String argument');
  }
  return function LtFilter(value) {
    if (typeof value !== 'number' && !(value instanceof Date)) {
      value = parseFloat(value);
      if (isNaN(value)) {
        throw new Error('Invalid value passed to LtFilter for ' + field);
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
 * LteFilter(field)(value)
 *
 * { field: { $lte: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/lte/
 */
module.exports.LteFilter = function LteFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('LteFilter takes a single String argument');
  }
  return function LteFilter(value) {
    if (typeof value !== 'number' && !(value instanceof Date)) {
      value = parseFloat(value);
      if (isNaN(value)) {
        throw new Error('Invalid value passed to LteFilter for ' + field);
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
 * InFilter(field)([values])
 *
 * { field: { $in: [values] } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/in/
 */
module.exports.InFilter = function InFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('InFilter takes a single String argument');
  }
  return function InFilter(values) {
    if (!Array.isArray(values)) {
      throw new Error('Invalid value passed to InFilter');
    }
    var selector = {};
    selector[field] = {
      $in: values,
    };
    return selector;
  };
};

/**
 * NinFilter(field)([values])
 *
 * { field: { $nin: [values] } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/nin/
 */
module.exports.NinFilter = function NinFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('NinFilter takes a single String argument');
  }
  return function NinFilter(values) {
    if (!Array.isArray(values)) {
      throw new Error('Invalid value passed to NinFilter');
    }
    var selector = {};
    selector[field] = {
      $nin: values,
    };
    return selector;
  };
};

/**
 * OrFilter({
 * 	k1: filter1
 * 	k2: filter2,
 * 	k3: filter3(10),
 * })({ k1: 2, k2: 4 })
 *
 * { $or: [ filter1(2), filter2(4), filter3(10) ] }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/or/
 */
module.exports.OrFilter = function OrFilterFactory(filters) {
  if (arguments.length !== 1 || typeof filters !== 'object') {
    throw new Error('OrFilter takes a single Object argument');
  }
  return function OrFilter(values) {
    if (typeof values === 'undefined') {
      values = {};
    }
    if (typeof values !== 'object') {
      throw new Error('Invalid value passed to OrFilter');
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
 * AndFilter({
 * 	k1: filter1
 * 	k2: filter2,
 * 	k3: filter3(10),
 * })({ k1: 2, k2: 4 })
 *
 * { $and: [ filter1(2), filter2(4), filter3(10) ] }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/and/
 */
module.exports.AndFilter = function AndFilterFactory(filters) {
  if (arguments.length !== 1 || typeof filters !== 'object') {
    throw new Error('AndFilter takes a single Object argument');
  }
  return function AndFilter(values) {
    if (typeof values === 'undefined') {
      values = {};
    }
    if (typeof values !== 'object') {
      throw new Error('Invalid value passed to AndFilter');
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
 * NotFilter(GtFilter(field))(3)
 *
 * { field: { $not: { $gt: 3 } } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/not/
 */
module.exports.NotFilter = function NotFilterFactory(func) {
  if (arguments.length !== 1 || typeof func !== 'function') {
    throw new Error('EqFilter takes a single Function argument');
  }
  return function NotFilter(value) {
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
 * NorFilter({
 * 	k1: filter1
 * 	k2: filter2,
 * 	k3: filter3(10),
 * })({ k1: 2, k2: 4 })
 *
 * { $nor: [ filter1(2), filter2(4), filter3(10) ] }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/nor/
 */
module.exports.NorFilter = function NorFilterFactory(filters) {
  if (arguments.length !== 1 || typeof filters !== 'object') {
    throw new Error('NorFilter takes a single Object argument');
  }
  return function NorFilter(values) {
    if (typeof values === 'undefined') {
      values = {};
    }
    if (typeof values !== 'object') {
      throw new Error('Invalid value passed to NorFilter');
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
 * ExistsFilter(field)()      => { field: { $exists: true } }
 * ExistsFilter(field)(false) => { field: { $exists: false } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/exists/
 */
module.exports.ExistsFilter = function ExistsFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('ExistsFilter takes a single String argument');
  }
  return function ExistsFilter(value) {
    if (typeof value === 'undefined') value = true;
    var selector = {};
    selector[field] = {
      $exists: !!value
    };
    return selector;
  };
};

/**
 * TypeFilter(field)(value)
 *
 * { field: { $type: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/type/
 */
module.exports.TypeFilter = function TypeFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('TypeFilter takes a single String argument');
  }
  return function TypeFilter(value) {
    value = parseInt(value);
    if (isNaN(value)) {
      throw new Error('Invalid value passed to TypeFilter');
    }
    var selector = {};
    selector[field] = {
      $type: value
    };
    return selector;
  };
};

/**
 * ModFilter(field)({ divisor: 5, remainder: 1 })
 *
 * { field: { $mod: [5, 1] } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/mod/
 */
module.exports.ModFilter = function ModFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('ModFilter takes a single String argument');
  }
  return function ModFilter(value) {
    var error = new Error('Invalid value passwd to ModFilter');

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
 * RegexFilter(field)(/value/)
 *     { field: /value/ } }
 *
 * RegexFilter(field)(value)
 *     { field: /value/ } }
 *
 * RegexFilter(field, options)(value)
 *     { field: { $regex: value, $options: options } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/regex/
 */
module.exports.RegexFilter = function RegexFilterFactory(field, regex, options) {
  if (typeof field !== 'string'
    || (typeof regex   !== 'string'    && typeof regex !== 'number' && !(regex instanceof RegExp) )
    || (typeof options !== 'undefined' && typeof options !== 'string' && options !== null)
  ) {
    throw new Error('RegexFilter received invalid args');
  }

  regex = fixupRegex({
    $regex:   regex,
    $options: options,
  });

  return function RegexFilter(value) {
    var selector = {};
    selector[field] = regex;
    return selector;
  };
};

/**
 * TextFilter(language)(value)
 *
 * { $text: { $search: value, $language: language }}
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/text/
 */
module.exports.TextFilter = function TextFilterFactory(language) {
  if (arguments.length > 1 || (typeof language !== 'string' && typeof language !== 'undefined' && language !== null)) {
    throw new Error('TextFilter takes a single optional String argument');
  }
  return function TextFilter(value) {

    if (typeof value === 'number') {
      value = String(value);
    } else if (typeof value !== 'string') {
      throw new Error('Invalid value passed to TextFilter');
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
 * WhereFilter(func)(value)
 *
 * { $where: function(value) { return func.apply(this, arguments) } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/where/
 */
module.exports.WhereFilter = function WhereFilterFactory(func) {
  if (arguments.length !== 1 || (typeof func !== 'string' && typeof func !== 'function')) {
    throw new Error('WhereFilter takes a single String or Function argument');
  }

  if (typeof func === 'string') {
    func = Function('return ' + func);
  }
  return function WhereFilter(value) {

    var funcWrapper = function() {
      return func.call(this, value);
    };

    return {
      $where: funcWrapper,
    };
  };
};

/**
 * AllFilter(field)(values)
 *
 * { field: { $all: values } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/all/
 */
module.exports.AllFilter = function AllFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('AllFilter takes a single String argument');
  }
  return function AllFilter(filters) {
    if (!Array.isArray(filters)) {
      throw new Error('Invalid value passed to AllFilter');
    }
    var selector = {};
    selector[field] = {
      $all: filters
    };
    return selector;
  };
};

/**
 * ElemMatchFilter(field)({values})
 *
 * { field: { $elemMatch: {values} } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/elemMatch/
 */
module.exports.ElemMatchFilter = function ElemMatchFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('ElemMatchFilter takes a single String argument');
  }
  return function ElemMatchFilter(value) {
    if (typeof value !== 'object') {
      throw new Error('Invalid value passed to ElemMatchFilter');
    }
    var selector = {};
    selector[field] = {
      $elemMatch: value
    };
    return selector;
  };
};

/**
 * SizeFilter(field)(value)
 *
 * { field: { $size: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/size/
 */
module.exports.SizeFilter = function SizeFilterFactory(field) {
  if (arguments.length !== 1 || typeof field !== 'string') {
    throw new Error('SizeFilter takes a single String argument');
  }
  return function SizeFilter(value) {
    value = parseInt(value);
    if (isNaN(value)) {
      throw new Error('Invalid value passed to SizeFilter');
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
