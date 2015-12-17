# Filters

**WARNING** - The code below is intended to be used as part of an internal project. This repository will probably disappear when this code is integrated into that other project. That other project may re-appear on Github.

A collection of factory functions that return functions which can take a value and spit out a mongo style query. To be used in an internal project for query format validation.

Example, the following:

```javascript
OrFilter()([
  EqFilter('name')('Foobar'),
  AndFilter()([
    GtFilter('price')(12),
    LtFilter('price')(20)
  ])
]);
```

Would return:

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
