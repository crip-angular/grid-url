(function (ng, crip) {
    'use strict';

    crip.gridUrl
        .factory('cripGridUrl', cripGridUrl);

    cripGridUrl.$inject = ['$log', '$location', 'cripGridUrlConfig', 'cripGridEvents'];

    // plugin for cripGrid factory
    // extend method can be called only with {name, scope, paginate, plugins}
    function cripGridUrl($log, $location, cripGridUrlConfig, events) {
        return {
            extend: extend
        };

        function extend(params) {
            var mappings = cripGridUrlConfig.getMappings();
            params.scope.grid.url = {
                params: [
                    mappings['page'],
                    mappings['perPage'],
                    mappings['total'],
                    mappings['direction'],
                    mappings['order'],
                    mappings['filters'],
                    mappings['name']
                ]
            };

            if (isThisGrid()) {
                // set grid pagination from url, or set default
                params.scope.grid.pagination.page
                    = getFromUrlOr(mappings['page'], params.scope.grid.pagination, 'page');
                params.scope.grid.pagination.total
                    = getFromUrlOr(mappings['total'], params.scope.grid.pagination, 'total');
                params.scope.grid.pagination.perPage
                    = getFromUrlOr(mappings['perPage'], params.scope.grid.pagination, 'perPage');

                // set grid sort options from url, or set default
                params.scope.grid.sort.direction
                    = getFromUrlOr(mappings['direction'], params.scope.grid.sort, 'direction');
                params.scope.grid.sort.field
                    = getFromUrlOr(mappings['order'], params.scope.grid.sort, 'field');

                // set filters from url, or set default
                params.scope.grid.filters = clearUrlParams() || params.scope.grid.filters;
            }

            params.scope.$on(events.dataChanged, function (e, data) {
                if (isThisGrid())
                    $location.search(mappings['total'], data.total);
            });

            params.scope.$on(events.filtersChanged, function (e, data) {
                if (isThisGrid()) {
                    loopUrl(function (key) {
                        // if key exists in url, but not in filters, remove it from url
                        if (!ng.isDefined(data.filters[key]))
                            $location.search(key, null);
                    });
                    // add/update all filters to url
                    ng.forEach(data.filters, function (val, key) {
                        $location.search(key, val);
                    });
                } else
                    onOtherGridChanges(1);
            });

            params.scope.$on(events.sortChanged, function (e, data) {
                if (isThisGrid()) {
                    $location.search(mappings['direction'], data.direction);
                    $location.search(mappings['order'], data.field);
                } else
                    onOtherGridChanges(2);
            });

            params.scope.$on(events.paginationChanged, function (e, data) {
                if (isThisGrid()) {
                    $location.search(mappings['page'], data.page);
                    $location.search(mappings['perPage'], data.perPage);
                    $location.search(mappings['total'], data.total);
                } else
                    onOtherGridChanges(3);
            });

            // watch url changes
            params.scope.$watch(function () {
                return $location.search()
            }, function (n, o) {
                if (isThisGrid()) {
                    var eq = ng.equals,
                        equals = !!eq(n, o),
                        perPage = mappings['perPage'],
                        urlPerPage = n[perPage];

                    if (params.scope.grid.pagination.pageSizes.indexOf(urlPerPage) === -1) {
                        $location.search(perPage, o[perPage]);
                    }

                    if (!equals)
                        params.scope.$broadcast(events.externallyChanged, {
                            sort: {
                                field: n[mappings['order']],
                                direction: n[mappings['direction']]
                            },
                            pagination: {
                                page: n[mappings['page']],
                                total: n[mappings['total']],
                                perPage: n[perPage]
                            },
                            filters: clearUrlParams(),
                            name: n[mappings['name']]
                        });
                }
            });

            var $injector = ng.injector();
            ng.forEach(params.plugins, function (plugin_params, plugin) {
                var PluginInstance = $injector.get(plugin);
                // enable plugins {name, scope, paginate, plugins}
                PluginInstance.extend({
                    scope: params.scope,
                    paginate: params.paginate,
                    name: params.name,
                    plugins: plugin_params
                });
            });

            function onOtherGridChanges(where) {
                //$log.log({'onOtherGridChanges': where});
                $location.search(mappings['name'], params.name);
                $location.search(mappings['page'], params.scope.grid.pagination.page);
                $location.search(mappings['total'], params.scope.grid.pagination.total);
                $location.search(mappings['perPage'], params.scope.grid.pagination.perPage);
                $location.search(mappings['direction'], params.scope.grid.sort.direction);
                $location.search(mappings['order'], params.scope.grid.sort.field);

                loopUrl(function (key) {
                    // remove all filters from url before adding from other grid
                    $location.search(key, null);
                });

                for (var prop in params.scope.grid.filters) {
                    if (params.scope.grid.filters.hasOwnProperty(prop))
                        $location.search(prop, params.scope.grid.filters[prop]);
                }
            }

            function loopUrl(callback) {
                var url = $location.search();
                ng.forEach(url, function (value, key) {
                    if (params.scope.grid.url.params.indexOf(key) === -1)
                        callback(key, value);
                });
            }

            function clearUrlParams() {
                var ret = {};
                loopUrl(function (key, val) {
                    ret[key] = val;
                });
                return ret;
            }

            function getFromUrlOr(urlName, source, sourceName) {
                sourceName = sourceName || urlName;
                var result = $location.search()[urlName] || source[sourceName];
                //$log.log('cripGridUrl -> getFromUrlOr', {
                //    result: result,
                //    urlName: urlName,
                //    source: source,
                //    sourceName: sourceName
                //});
                return result;
            }

            function isThisGrid() {
                var thisName = params.name,
                    gridName = $location.search()[mappings['name']];

                //$log.log('cripGridUrl -> isThisGrid', {
                //     thisName: thisName,
                //     gridName: gridName
                // });

                if (gridName && gridName === thisName)
                    return true;

                if (!gridName) {
                    $location.search(mappings['name'], thisName);
                    return true;
                }

                return false;
            }
        }
    }
})(angular, window.crip || (window.crip = {}));