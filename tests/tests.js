QUnit.test('Filter.Eq', function() {
  deepEqual(
    Filter.Eq('field')(5), {
      field: 5
    }
  );
  throws(function() {
    Filter.Eq('field')({
      bad: 'value'
    })
  });
});

QUnit.test('Filter.Ne', function() {
  deepEqual(
    Filter.Ne('field')(5), {
      field: { $ne: 5 }
    }
  );
  throws(function() {
    Filter.Ne('field')({
      bad: 'value'
    })
  });
});

['gt', 'gte', 'lt', 'lte'].forEach(function(type) {
  var name = ucfirst(type);
  QUnit.test('Filter.' + name, function() {
    var inner = {};
    inner['$' + type] = 5;
    deepEqual(
      Filter[name]('field')(5), {
        field: inner
      }
    );
    inner['$' + type] = new Date();
    deepEqual(
      Filter[name]('field')(inner['$' + type]), {
        field: inner
      }
    );
    throws(function() {
      Filter[name]('field')('wibble');
    });
  });
});

['in', 'nin'].forEach(function(type) {
  var name = ucfirst(type);
  QUnit.test('Filter.' + name, function() {
    var inner = {};
    inner['$' + type] = [5, 6];
    deepEqual(
      Filter[name]('field')([5, 6]), {
        field: inner,
      }
    );
    throws(function() {
      Filter[name]('field')(666);
    });
  });
});

QUnit.test('Filter.Or', function() {
  deepEqual(
    Filter.Or([
      Filter.Eq('field1')(2),
      Filter.Eq('field2')(3),
    ])(), {
      $or: [{
        field1: 2,
      }, {
        field2: 3
      }]
    }
  );
  deepEqual(
    Filter.Or({
      f1: Filter.Eq('field1'),
      f2: Filter.Eq('field2'),
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
    Filter.Or({
      f1: Filter.Eq('field1')
    })({
      f1: 2
    }), {
      field1: 2,
    }
  );
  throws(function() {
    Filter.Or('field')(666);
  });
});

QUnit.test('Filter.And', function() {
  deepEqual(
    Filter.And([
      Filter.Eq('field1')(2),
      Filter.Eq('field2')(3),
    ])(), {
      field1: 2,
      field2: 3
    }
  );
  deepEqual(
    Filter.And({
      f1: Filter.Eq('field1'),
      f2: Filter.Eq('field2'),
    })({
      f1: 2,
      f2: 3
    }), {
      field1: 2,
      field2: 3,
    }
  );
  deepEqual(
    Filter.And({
      f1: Filter.Eq('field1'),
      f2: Filter.Eq('field1'),
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
    Filter.And('field')(666);
  });
});

QUnit.test('Filter.Not', function() {
  deepEqual(
    Filter.Not(Filter.Eq('field'))(3), {
      field: {
        $not: {
          $eq: 3
        }
      }
    }
  );
  deepEqual(
    Filter.Not(function() {
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
    Filter.Not(function() {
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
    Filter.Not(function() {
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

QUnit.test('Filter.Nor', function() {
  deepEqual(
    Filter.Nor([
      Filter.Eq('field1')(2),
      Filter.Eq('field2')(3),
    ])(), {
      $nor: [{
        field1: 2,
      }, {
        field2: 3
      }]
    }
  );
  deepEqual(
    Filter.Nor({
      f1: Filter.Eq('field1'),
      f2: Filter.Eq('field2'),
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
    Filter.Nor('field')(666);
  });
});

QUnit.test('Filter.Exists', function() {
  deepEqual(
    Filter.Exists('field')(), {
      field: {
        $exists: true
      }
    }
  );
  deepEqual(
    Filter.Exists('field')(false), {
      field: {
        $exists: false
      }
    }
  );
});

QUnit.test('Filter.Type', function() {
  deepEqual(
    Filter.Type('field', 3)(), {
      field: {
        $type: 3
      }
    }
  );
  throws(function() {
    Filter.Type('field')('wibble');
  });
});



QUnit.test('Filter.Mod', function() {
  deepEqual(
    Filter.Mod('field')({
      divisor: 5,
      remainder: 3
    }), {
      field: {
        $mod: [5, 3]
      }
    }
  );
  throws(function() {
    Filter.Mod('field')('wibble');
  });
  throws(function() {
    Filter.Mod('field')({
      divisor: 'wibble',
      remainder: 3
    });
  });
});


QUnit.test('Filter.Regex', function() {
  deepEqual(
    Filter.Regex('field', /x/)(), {
      field: /x/,
    }
  );
  deepEqual(
    Filter.Regex('field', 'x')(), {
      field: /x/
    }
  );
  deepEqual(
    Filter.Regex('field', 3)(), {
      field: /3/
    }
  );
  deepEqual(
    Filter.Regex('field', /x/, 'i')(), {
      field: /x/i
    }
  );
  deepEqual(
    Filter.Regex('field', 'x', 'i')(), {
      field: /x/i
    }
  );
  deepEqual(
    Filter.Regex('field', 3, 'i')(), {
      field: /3/i
    }
  );
  throws(function() {
    Filter.Regex('field', {
      bad: 'value'
    })();
  });
});

QUnit.test('Filter.Text', function() {
  deepEqual(
    Filter.Text()('Hello World'), {
      $text: {
        $search: 'Hello World'
      }
    }
  );
  deepEqual(
    Filter.Text('en')('Hello World'), {
      $text: {
        $search: 'Hello World',
        $language: 'en'
      }
    }
  );
});

QUnit.test('Filter.Where', function() {
  var filter = Filter.Where(function(value) {
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

QUnit.test('Filter.All', function() {
  deepEqual(
    Filter.All('field')([2, 4, 6]), {
      field: {
        $all: [2, 4, 6]
      }
    }
  );
  throws(function() {
    Filter.All('field')(666);
  });
});

QUnit.test('Filter.ElemMatch', function() {
  deepEqual(
    Filter.ElemMatch('field')({
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
    Filter.ElemMatch('field')('wibble');
  });
});

QUnit.test('Filter.Size', function() {
  deepEqual(
    Filter.Size('field')(5), {
      field: {
        $size: 5
      }
    }
  );
  throws(function() {
    Filter.Size('field')('wibble');
  });
});

function ucfirst(str) {
  return str.substr(0, 1).toUpperCase() + str.slice(1);
}
