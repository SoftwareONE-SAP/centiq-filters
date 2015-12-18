/**
 * EqFilter(field)(value)
 *
 * { field: { $eq: value } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/eq/
 */
module.exports.EqFilter = function(field) {
  return function(value) {
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
module.exports.GtFilter = function(field) {
  return function(value) {
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
module.exports.GteFilter = function(field) {
  return function(value) {
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
module.exports.LtFilter = function(field) {
  return function(value) {
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
module.exports.LteFilter = function(field) {
  return function(value) {
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
module.exports.InFilter = function(field) {
  return function(values) {
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
module.exports.NinFilter = function(field) {
  return function(values) {
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
 * OrFilter()([filters])
 *
 * { $or: [filters] }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/or/
 */
module.exports.OrFilter = function() {
  return function(filters) {
    if (!Array.isArray(filters)) {
      throw new Error('Invalid value passed to OrFilter');
    }
    return compactQuery({
      $or: filters,
    });
  };
};

/**
 * AndFilter()([filters])
 *
 * { $and: [filters] }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/and/
 */
module.exports.AndFilter = function() {
  return function(filters) {
    if (!Array.isArray(filters)) {
      throw new Error('Invalid value passed to AndFilter');
    }
    return compactQuery({
      $and: filters,
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
module.exports.NotFilter = function(func) {
  return function(value) {
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
        // Instead of: { fieldName: { $not: { $regex: RegExp } } }
        // Create    : { fieldName: { $not: RegExp } }
        if (v.$regex) {
          v = compactQuery(v);
        }
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
 * NorFilter()([filters])
 *
 * { $nor: [filters] }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/nor/
 */
module.exports.NorFilter = function() {
  return function(filters) {
    if (!Array.isArray(filters)) {
      throw new Error('Invalid value passed to NorFilter');
    }
    return compactQuery({
      $nor: filters,
    });
  };
};

/**
 * ExistsFilter(field)()      => { field: { $exists: true } }
 * ExistsFilter(field)(false) => { field: { $exists: false } }
 *
 * https://docs.mongodb.org/v3.0/reference/operator/query/exists/
 */
module.exports.ExistsFilter = function(field) {
  return function(value) {
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
module.exports.TypeFilter = function(field) {
  return function(value) {
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
module.exports.ModFilter = function(field) {
  var error = new Error('Invalid value passwd to ModFilter');
  return function(value) {

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
module.exports.RegexFilter = function(field, options) {
  return function(value) {
    var selector = {};
    selector[field] = {
      $regex: value,
    };
    if (options) {
      selector[field].$options = options;
    }
    selector[field] = compactQuery(selector[field]);
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
module.exports.TextFilter = function(language) {
  return function(value) {

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
module.exports.WhereFilter = function(func) {
  if (typeof func === 'string') {
    func = Function('return ' + func);
  }
  return function(value) {

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
module.exports.AllFilter = function(field) {
  return function(filters) {
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
module.exports.ElemMatchFilter = function(field) {
  return function(value) {
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
module.exports.SizeFilter = function(field) {
  return function(value) {
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

function compactQuery(query) {
  /**
   * Compresses:
   * 		{ $and: [ { foo:1 }, { bar:2 } ] } to { foo:1, bar:2 }
   *
   * Is intelligent enough to not compress:
   * 		{ $and: [ { foo:1 }, { foo:2 } ] } to { foo:1, foo:2 }
   */
  if (query.$and) {
    var compact = {};
    query.$and.forEach(function(item) {
      if (compact === null) return;
      Object.keys(item).forEach(function(k) {
        if (compact === null) return;
        if (compact.hasOwnProperty(k)) return compact = null;
        compact[k] = item[k];
      });
    });
    if (compact !== null) {
      query = compact;
    }
  }

  /**
   * Compresses:
   * 	{ $or: [ { foo:1 } ] } to { foo: 1 }
   */
  if (query.$or) {
    if (query.$or.length === 1) {
      query = query.$or[0];
    }
  }

  if (query.$regex) {
    if (typeof query.$regex === 'number') {
      query.$regex = String(query.$regex);
    }
    if (typeof query.$regex !== 'string' && !(query.$regex instanceof RegExp)) {
      throw new Error("Invalid value for $regex");
    }

    var canCompress = true;
    Object.keys(query).forEach(function(k){
      if (k !== '$regex' && k !== '$options') canCompress = false;
    });

    if (canCompress) {
      if (query.$options) {
        if (typeof query.$regex === 'string') {
          query = new RegExp(query.$regex, query.$options);
        } else {
          var rxs = query.$regex.toString();
          var mat = rxs.match(/^\/([\s\S]*)\/([a-z]*)$/);
          rxs     = mat[1];
          options = mat[2] + query.$options;
          options = Object.keys(
            options.split('').reduce(function(o, l){
              o[ l ] = 1;
              return o
            },{})
          ).sort().join('');
          query = new RegExp(rxs, options);
        }
      } else if (typeof query.$regex === 'string'){
        query = new RegExp(query.$regex);
      } else {
        query = query.$regex;
      }
    }
  }

  return query;
};
