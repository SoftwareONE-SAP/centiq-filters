QUnit.test('Filters.Eq', function() {
  deepEqual(
    Filters.Eq('field')(5), {
      field: 5
    }
  );
  throws(function() {
    Filters.Eq('field')({
      bad: 'value'
    })
  });
});

['gt', 'gte', 'lt', 'lte'].forEach(function(type) {
  var name = ucfirst(type);
  QUnit.test('Filters.' + name, function() {
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
  var name = ucfirst(type);
  QUnit.test('Filters.' + name, function() {
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

QUnit.test('Filters.Or', function() {
  deepEqual(
    Filters.Or([
      Filters.Eq('field1')(2),
      Filters.Eq('field2')(3),
    ])(), {
      $or: [{
        field1: 2,
      }, {
        field2: 3
      }]
    }
  );
  deepEqual(
    Filters.Or({
      f1: Filters.Eq('field1'),
      f2: Filters.Eq('field2'),
    })({
      f1: 2,
      f2: 3
    }), {
      $or: [{
        field1: 2
      }, {
        field2: 3
      }]
    }
  );
  deepEqual(
    Filters.Or({
      f1: Filters.Eq('field1')
    })({
      f1: 2
    }), {
      field1: 2,
    }
  );
  throws(function() {
    Filters.Or('field')(666);
  });
});

QUnit.test('Filters.And', function() {
  deepEqual(
    Filters.And([
      Filters.Eq('field1')(2),
      Filters.Eq('field2')(3),
    ])(), {
      field1: 2,
      field2: 3
    }
  );
  deepEqual(
    Filters.And({
      f1: Filters.Eq('field1'),
      f2: Filters.Eq('field2'),
    })({
      f1: 2,
      f2: 3
    }), {
      field1: 2,
      field2: 3,
    }
  );
  deepEqual(
    Filters.And({
      f1: Filters.Eq('field1'),
      f2: Filters.Eq('field1'),
    })({
      f1: 2,
      f2: 3
    }), {
      field1: 2,
      $and: [{
        field1: 3
      }, ],
    }
  );
  throws(function() {
    Filters.And('field')(666);
  });
});

QUnit.test('Filters.Not', function() {
  deepEqual(
    Filters.Not(Filters.Eq('field'))(3), {
      field: {
        $not: {
          $eq: 3
        }
      }
    }
  );
  deepEqual(
    Filters.Not(function() {
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
    Filters.Not(function() {
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
    Filters.Not(function() {
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

QUnit.test('Filters.Nor', function() {
  deepEqual(
    Filters.Nor([
      Filters.Eq('field1')(2),
      Filters.Eq('field2')(3),
    ])(), {
      $nor: [{
        field1: 2,
      }, {
        field2: 3
      }]
    }
  );
  deepEqual(
    Filters.Nor({
      f1: Filters.Eq('field1'),
      f2: Filters.Eq('field2'),
    })({
      f1: 2,
      f2: 3
    }), {
      $nor: [{
        field1: 2
      }, {
        field2: 3
      }]
    }
  );
  throws(function() {
    Filters.Nor('field')(666);
  });
});

QUnit.test('Filters.Exists', function() {
  deepEqual(
    Filters.Exists('field')(), {
      field: {
        $exists: true
      }
    }
  );
  deepEqual(
    Filters.Exists('field')(false), {
      field: {
        $exists: false
      }
    }
  );
});

QUnit.test('Filters.Type', function() {
  deepEqual(
    Filters.Type('field', 3)(), {
      field: {
        $type: 3
      }
    }
  );
  throws(function() {
    Filters.Type('field')('wibble');
  });
});



QUnit.test('Filters.Mod', function() {
  deepEqual(
    Filters.Mod('field')({
      divisor: 5,
      remainder: 3
    }), {
      field: {
        $mod: [5, 3]
      }
    }
  );
  throws(function() {
    Filters.Mod('field')('wibble');
  });
  throws(function() {
    Filters.Mod('field')({
      divisor: 'wibble',
      remainder: 3
    });
  });
});


QUnit.test('Filters.Regex', function() {
  deepEqual(
    Filters.Regex('field', /x/)(), {
      field: /x/,
    }
  );
  deepEqual(
    Filters.Regex('field', 'x')(), {
      field: /x/
    }
  );
  deepEqual(
    Filters.Regex('field', 3)(), {
      field: /3/
    }
  );
  deepEqual(
    Filters.Regex('field', /x/, 'i')(), {
      field: /x/i
    }
  );
  deepEqual(
    Filters.Regex('field', 'x', 'i')(), {
      field: /x/i
    }
  );
  deepEqual(
    Filters.Regex('field', 3, 'i')(), {
      field: /3/i
    }
  );
  throws(function() {
    Filters.Regex('field', {
      bad: 'value'
    })();
  });
});

QUnit.test('Filters.Text', function() {
  deepEqual(
    Filters.Text()('Hello World'), {
      $text: {
        $search: 'Hello World'
      }
    }
  );
  deepEqual(
    Filters.Text('en')('Hello World'), {
      $text: {
        $search: 'Hello World',
        $language: 'en'
      }
    }
  );
});

QUnit.test('Filters.Where', function() {
  var filter = Filters.Where(function(value) {
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

QUnit.test('Filters.All', function() {
  deepEqual(
    Filters.All('field')([2, 4, 6]), {
      field: {
        $all: [2, 4, 6]
      }
    }
  );
  throws(function() {
    Filters.All('field')(666);
  });
});

QUnit.test('Filters.ElemMatch', function() {
  deepEqual(
    Filters.ElemMatch('field')({
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
    Filters.ElemMatch('field')('wibble');
  });
});

QUnit.test('Filters.Size', function() {
  deepEqual(
    Filters.Size('field')(5), {
      field: {
        $size: 5
      }
    }
  );
  throws(function() {
    Filters.Size('field')('wibble');
  });
});

function ucfirst(str) {
  return str.substr(0, 1).toUpperCase() + str.slice(1);
}
