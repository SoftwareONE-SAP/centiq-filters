var Filters;

QUnit.test('Load Filters.js', function() {
  Filters = require('../Filters.js');
  ok(typeof Filters === 'object');
});

QUnit.test('EqFilter', function() {
  deepEqual(
    Filters.EqFilter('field')(5), {
      field: 5
    }
  );
  throws(function() {
    Filters.EqFilter('field')({
      bad: 'value'
    })
  });
});

['gt', 'gte', 'lt', 'lte'].forEach(function(type) {
  var name = ucfirst(type) + 'Filter';
  QUnit.test(name, function() {
    var inner = {};
    inner['$' + type] = 5;
    deepEqual(
      Filters[name]('field')(5), {
        field: inner
      }
    );
    inner['$' + type] = new Date();
    deepEqual(
      Filters[name]('field')(inner['$' + type]), {
        field: inner
      }
    );
    throws(function() {
      Filters[name]('field')('wibble');
    });
  });
});

['in', 'nin'].forEach(function(type) {
  var name = ucfirst(type) + 'Filter';
  QUnit.test(name, function() {
    var inner = {};
    inner['$' + type] = [5, 6];
    deepEqual(
      Filters[name]('field')([5, 6]), {
        field: inner,
      }
    );
    throws(function() {
      Filters[name]('field')(666);
    });
  });
});

QUnit.test('OrFilter', function() {
  deepEqual(
    Filters.OrFilter({
      f1: EqFilter('field1'),
      f2: EqFilter('field2'),
    })({ f1: 2, f2: 3 }),
    {
      $or: [
        { field1: 2 },
        { field2: 3 }
      ]
    }
  );
  deepEqual(
    Filters.OrFilter({
      f1: EqFilter('field1')
    })({ f1: 2 }),
    {
      field1: 2,
    }
  );
  throws(function() {
    Filters.OrFilter('field')(666);
  });
});

QUnit.test('AndFilter', function() {
  deepEqual(
    Filters.AndFilter({
      f1: EqFilter('field1'),
      f2: EqFilter('field2'),
    })({ f1: 2, f2: 3 }),
    {
      field1: 2,
      field2: 3,
    }
  );
  deepEqual(
    Filters.AndFilter({
      f1: EqFilter('field1'),
      f2: EqFilter('field1'),
    })({ f1: 2, f2: 3 }),
    {
      $and: [
        { field1: 2 },
        { field1: 3 },
      ],
    }
  );
  throws(function() {
    Filters.AndFilter('field')(666);
  });
});

QUnit.test('NotFilter', function() {
  deepEqual(
    NotFilter(EqFilter('field'))(3), {
      field: {
        $not: {
          $eq: 3
        }
      }
    }
  );
  deepEqual(
    NotFilter(function() {
      return {
        field: {
          $regex: 'x',
          $options: 'i'
        }
      }
    })(), {
      field: {
        $not: /x/i
      }
    }
  );
  deepEqual(
    NotFilter(function() {
      return {
        field: {
          $regex: /x/g
        }
      }
    })(), {
      field: {
        $not: /x/g
      }
    }
  );
  deepEqual(
    NotFilter(function() {
      return {
        field: {
          $regex: /x/i,
          $options: 'g'
        }
      }
    })(), {
      field: {
        $not: /x/gi
      }
    }
  );
});

QUnit.test('NorFilter', function() {
  deepEqual(
    Filters.NorFilter({
      f1: EqFilter('field1'),
      f2: EqFilter('field2'),
    })({ f1: 2, f2: 3 }),
    {
      $nor: [{
        field1: 2
      }, {
        field2: 3
      }]
    }
  );
  throws(function() {
    Filters.NorFilter('field')(666);
  });
});

QUnit.test('ExistsFilter', function() {
  deepEqual(
    Filters.ExistsFilter('field')(), {
      field: {
        $exists: true
      }
    }
  );
  deepEqual(
    Filters.ExistsFilter('field')(false), {
      field: {
        $exists: false
      }
    }
  );
});

QUnit.test('TypeFilter', function() {
  deepEqual(
    Filters.TypeFilter('field')(3), {
      field: {
        $type: 3
      }
    }
  );
  throws(function() {
    Filters.TypeFilter('field')('wibble');
  });
});



QUnit.test('ModFilter', function() {
  deepEqual(
    Filters.ModFilter('field')({
      divisor: 5,
      remainder: 3
    }), {
      field: {
        $mod: [5, 3]
      }
    }
  );
  throws(function() {
    Filters.ModFilter('field')('wibble');
  });
  throws(function() {
    Filters.ModFilter('field')({
      divisor: 'wibble',
      remainder: 3
    });
  });
});


QUnit.test('RegexFilter', function() {
  deepEqual(
    Filters.RegexFilter('field')(/x/), {
      field: /x/,
    }
  );
  deepEqual(
    Filters.RegexFilter('field')('x'), {
      field: /x/
    }
  );
  deepEqual(
    Filters.RegexFilter('field')(3), {
      field: /3/
    }
  );
  deepEqual(
    Filters.RegexFilter('field', 'i')(/x/), {
      field: /x/i
    }
  );
  deepEqual(
    Filters.RegexFilter('field', 'i')('x'), {
      field: /x/i
    }
  );
  deepEqual(
    Filters.RegexFilter('field', 'i')(3), {
      field: /3/i
    }
  );
  throws(function() {
    Filters.RegexFilter('field')({
      bad: 'value'
    });
  });
});

QUnit.test('TextFilter', function() {
  deepEqual(
    Filters.TextFilter()('Hello World'), {
      $text: {
        $search: 'Hello World'
      }
    }
  );
  deepEqual(
    Filters.TextFilter('en')('Hello World'), {
      $text: {
        $search: 'Hello World',
        $language: 'en'
      }
    }
  );
});

QUnit.test('WhereFilter', function() {
  var filter = Filters.WhereFilter(function(value) {
    return this.field === value;
  })(10);

  ok(typeof filter === 'object');
  ok(typeof filter.$where === 'function');
  ok(filter.$where.call({
    field: 10
  }));
  equal(false, filter.$where.call({
    field: 666
  }));
});

QUnit.test('AllFilter', function() {
  deepEqual(
    Filters.AllFilter('field')([2, 4, 6]), {
      field: {
        $all: [2, 4, 6]
      }
    }
  );
  throws(function() {
    Filters.AllFilter('field')(666);
  });
});

QUnit.test('ElemMatchFilter', function() {
  deepEqual(
    Filters.ElemMatchFilter('field')({
      $gt: 2,
      $lt: 4
    }), {
      field: {
        $elemMatch: {
          $gt: 2,
          $lt: 4
        }
      }
    }
  );
  throws(function() {
    Filters.ElemMatchFilter('field')('wibble');
  });
});

QUnit.test('SizeFilter', function() {
  deepEqual(
    Filters.SizeFilter('field')(5), {
      field: {
        $size: 5
      }
    }
  );
  throws(function() {
    Filters.SizeFilter('field')('wibble');
  });
});

function ucfirst(str) {
  return str.substr(0, 1).toUpperCase() + str.slice(1);
}
