(function (ng, crip) {
    'use strict';

    crip.gridUrl = ng.module('crip.grid-url', [
        'crip.core',
        'crip.grid'
    ]);

})(angular, window.crip || (window.crip = {}));