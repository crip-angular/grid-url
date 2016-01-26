# Crip Angular grid url plugin

For more details [see demo repository](https://github.com/crip-angular/demo)

## Dependencies

1. Crip Angular core module ([crip.core](https://github.com/crip-angular/core))
1. Crip Angular grid module ([crip.grid](https://github.com/crip-angular/grid))

## Configuration

```js
angular.module('app')
    .config(AppConfig);
    
AppConfig.$inject = ['cripGridConfigProvider', 'cripGridUrlConfigProvider'];

function AppConfig(cripGridConfigProvider, cripGridUrlConfigProvider) {

   // enable cripGridUrl for grid without dependencies
   cripGridConfigProvider.setPlugins({'cripGridUrl': {}});
   
   // set cripGridUrl plugin configurations
   cripGridUrlConfigProvider.setMappings('page', 'per-page', 'total', 'direction', 'order', 'filters', 'name');
}
```

## Explanation

This plugin add functionality to [grid module](https://github.com/crip-angular/grid) and when you add new filter or 
change page in grid, all changes immediately appears in browser address bar. If you use back button in browser, it will
bring you to previous state of grid. This plugin allows easily share url without loosing data from filters and pagination.