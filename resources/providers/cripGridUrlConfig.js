(function (ng, crip) {
    'use strict';

    crip.gridUrl
        .provider('cripGridUrlConfig', cripGridUrlConfig);

    cripGridUrlConfig.$inject = [];

    function cripGridUrlConfig() {
        var mappings = setMappings();

        this.getMappings = getMappings;
        this.setMappings = setMappings;

        this.$get = [$get];

        function $get() {
            return {
                getMappings: getMappings
            };
        }

        function getMappings() {
            return mappings;
        }

        function setMappings(page, perPage, total, direction, order, filters, name) {
            return mappings = {
                page: page || 'grid-page',
                perPage: perPage || 'grid-per-page',
                total: total || 'grid-total',
                direction: direction || 'grid-direction',
                order: order || 'grid-order',
                filters: filters || 'grid-filters',
                name: name || 'grid-name'
            };
        }
    }
})(angular, window.crip || (window.crip = {}));