# Filters

**WARNING** - The code below is intended to be used as part of an internal project. This repository will probably disappear when this code is integrated into that other project. That other project may re-appear on Github.

A collection of factory functions that return functions which can take a value and spit out a mongo style query. To be used in an internal project for query format validation. Example:

```javascript
var filter = OrFilter({
  name: EqFilter('name'),
  price: AndFilter({
    low:  GtFilter('price'),
    high: LtFilter('price')
  })
});

var result = filter({
  name: 'Foobar',
  price: {
    low:  12,
    high: 20,
  },
});
```

"result would contain:

```javascript
{
  '$or':
  [
    {
      name: 'Foobar'
    },
    {
      '$and':
      [
        { price: { '$gt': 12 } },
        { price: { '$lt': 20 } }
      ]
    }
  ]
}
```

### Testing

```bash
npm install --only=dev
npm test
```
