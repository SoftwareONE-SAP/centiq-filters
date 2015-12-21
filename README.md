# Filters

**WARNING** - This is a very new library and is currently in heavily active development and its API will definitely change in various backwards incompatible ways. I will remove this warning when it stabilises. Use at your own risk.

We need a way to let a user specify the content of a Mongo query, for filtering purposes. For example, when displaying a list of products to a user, they might want to filter by price and when the product was added:

```javascript
{
  price: { $gte: 3 },
  added: { $lt: new Date(Date.now()-86400000) },
}
```

This library allows us to specify a "filter specification" containing information on exactly what values an end-user is allowed to supply for a particular filter:

```javascript
var Filter = require('./FilterSpec');

var ProductFilter = new Filter({
  MinPrice: function (minPrice) {
    return {
      price: {
        $gte: minPrice
      }
    };
  },
  AddedBefore: function (addedBefore) {
    return {
      added: {
        $lt: addedBefore
      }
    };
  }
});

var filter = new ProductFilter();

filter.set({
  MinPrice: 3
});
filter.set({
  AddedBefore: new Date(Date.now()-86400000)
});

var mongoQuery = filter.query();
// {
//   price: { '$gte': 3 },
//   added: { '$lt': Date('Sun Dec 20 2015 12:29:19 GMT+0000 (GMT)') }
// }

var serialized = filter.save();
// {
//   MinPrice: 3,
//   AddedBefore: Date('Sun Dec 20 2015 12:29:19 GMT+0000 (GMT)')
// }
```

The `serialized` object can be used to recreate a filter with the same options:

```javascript
var filter = new ProductFilter(serialized);
```

If any of the values in the `serialized` object are invalid, then an `Error` object is thrown.

We also provide a number of "filter factory functions" so you don't need to write snippets of Mongo queries. The above `ProductFilter` could be rewritten as:

```javascript
var Filter  = require('./FilterSpec');
var Filters = require('./Filters');
var ProductFilter = new Filter({
  MinPrice:    Filters.GteFilter('price'),
  AddedBefore: Filters.LtFilter('added')
});
```

As well as being less code, these factory functions do additional validation. For example, `GteFilter` and `LtFilter` both check that the value passed in is either a Date object or a number. If not, they throw an `Error` object.

You may want to write your own such factory functions for common filter types. For example, if you need to filter based on a date being between two other dates:

```javascript
var DateBetweenFilter = function DateBetweenFilterFactory(field) {
  return function DateBetweenFilter(value) {

    if (typeof value !== 'object'
      || !(value.before instanceof Date)
      || !(value.after  instanceof Date)
    ) {
      throw new Error('Invalid value passed to DateBetweenFilter');
    }

    var query = {};
    query[field] = {
      $gt: value.after,
      $lt: value.before
    };
    return query;
  };
};

var ProductFilter = new Filter({
  MinPrice:     Filters.GteFilter('price'),
  AddedBetween: DateBetweenFilter('added'),
});

var filter = new ProductFilter();
filter.set({
  MinPrice: 3,
  AddedBetween: {
    after:  new Date(Date.now()-86400000),
    before: new Date(Date.now()+86400000)
  }
});

var mongoQuery = filter.query();
// {
//   price: { '$gte': 3 },
//   added: {
//     '$gt': Date('Sun Dec 20 2015 12:29:19 GMT+0000 (GMT)')
//     '$lt': Date('Sun Dec 22 2015 12:29:19 GMT+0000 (GMT)')
//   }
// }

var serialized = filter.save();
// {
//   MinPrice: 3,
//   AddedBetween: {
//     after:  Date('Sun Dec 20 2015 12:29:19 GMT+0000 (GMT)')
//     before: Date('Sun Dec 22 2015 12:29:19 GMT+0000 (GMT)')
//   }
// }
```

## Filter Factories

#### EqFilter

A direct "equals" comparison. [$eq](https://docs.mongodb.org/v3.0/reference/operator/query/eq/)

|               | Type                 | Description |
|---------------|----------------------|-------------|
| Factory  arg1 | `String`             | Field name  |
| Function arg1 | `String` or `Number` | Value       |

```javascript
var filter = EqFilter('price');
var result = filter(3);
result == { 'price': 3 };
```

#### GtFilter

A "greater than" comparison.
[$gt](https://docs.mongodb.org/v3.0/reference/operator/query/gt/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = GtFilter('price');
var result = filter(3);
result == { 'price': { $gt: 3 } };
```

#### GteFilter

A "greater than or equal to" comparison.
[$gte](https://docs.mongodb.org/v3.0/reference/operator/query/gte/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = GteFilter('price');
var result = filter(3);
result == { 'price': { $gte: 3 } };
```

#### LtFilter

A "less than" comparison.
[$lt](https://docs.mongodb.org/v3.0/reference/operator/query/lt/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = LtFilter('price');
var result = filter(3);
result == { 'price': { $lt: 3 } };
```

#### LtFilter

A "less than or equal to" comparison.
[$lte](https://docs.mongodb.org/v3.0/reference/operator/query/lte/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Number` | Value       |

```javascript
var filter = LteFilter('price');
var result = filter(3);
result == { 'price': { $lte: 3 } };
```

#### InFilter

A "must be one of" comparison.
[$in](https://docs.mongodb.org/v3.0/reference/operator/query/in/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Array`  | Value       |

```javascript
var filter = InFilter('price');
var result = filter([2, 3, 4]);
result == { 'price': { $in: [2, 3, 4] } };
```

#### NinFilter

A "must not be one of" comparison.
[$nin](https://docs.mongodb.org/v3.0/reference/operator/query/nin/)

|               | Type     | Description |
|---------------|----------|-------------|
| Factory  arg1 | `String` | Field name  |
| Function arg1 | `Array`  | Value       |

```javascript
var filter = InFilter('price');
var result = filter([2, 3, 4]);
result == { 'price': { $nin: [2, 3, 4] } };
```

#### OrFilter

A Boolean OR filter.
[$or](https://docs.mongodb.org/v3.0/reference/operator/query/or/)

|               | Type                | Description |
|---------------|---------------------|-------------|
| Factory  arg1 | `String`            | Field name  |
| Function arg1 | `Array` OR `Object` | Value       |

```javascript
var filter = OrFilter([
  EqFilter('price')(0),
  GtFilter('price')(4)
]);
var result = filter();
result == {
  $or: [
    { price: 0 },
    { price: { $gt: 4 } }
  ]
};
```

In the above example, we are hard coding the two values inside the factory function. This is not ideal. You can alternatively use Object notiation instead of Array notation in order to pass values through from the filter function. The following would product the exact same result as above:

```javascript
var filter = OrFilter({
  ExactPrice: EqFilter('price'),
  GtPrice:    GtFilter('price')
});
var result = filter({
  ExactPrice: 0,
  GtPrice:    4
});
```

You can create queries of arbitrary depth using this method:

```javascript
var filter = OrFilter({
  price:  OrFilter({
    exact: EqFilter('price'),
    above: GtFilter('price'),
  }),
  status: EqFilter('status'),
});

var result = filter({
  price: {
    exact: 10,
    above: 20
  },
  status: 'active'
});

result == {
  $or: [
    {
      $or: [
        {
          price: 10,
        },
        {
          price: { $gt: 20 }
        }
      ]
    },
    {
      status: 'active',
    }
  ]
};
```

It would also have been possible to shift the "active" status into the factory function above, so it doesn't need to be specified when the filter function is called:

```javascript
var filter = OrFilter({
  price:  OrFilter({
    exact: EqFilter('price'),
    above: GtFilter('price'),
  }),
  status: EqFilter('status')('active'),
});

var result = filter({
  price: {
    exact: 10,
    above: 20
  }
});
```

### Testing

```bash
npm install --only=dev
npm test
```
