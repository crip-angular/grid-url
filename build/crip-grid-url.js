(function (ng, crip) {
    'use strict';

    crip.gridUrl = ng.module('crip.grid-url', [
        'crip.core',
        'crip.grid'
    ]);

})(angular, window.crip || (window.crip = {}));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImdyaWQubW9kdWxlLmpzIiwicHJvdmlkZXJzL2NyaXBHcmlkVXJsQ29uZmlnLmpzIiwiZmFjdG9yaWVzL2NyaXBHcmlkVXJsLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ1JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQ3RDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiY3JpcC1ncmlkLXVybC5qcyIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiAobmcsIGNyaXApIHtcclxuICAgICd1c2Ugc3RyaWN0JztcclxuXHJcbiAgICBjcmlwLmdyaWRVcmwgPSBuZy5tb2R1bGUoJ2NyaXAuZ3JpZC11cmwnLCBbXHJcbiAgICAgICAgJ2NyaXAuY29yZScsXHJcbiAgICAgICAgJ2NyaXAuZ3JpZCdcclxuICAgIF0pO1xyXG5cclxufSkoYW5ndWxhciwgd2luZG93LmNyaXAgfHwgKHdpbmRvdy5jcmlwID0ge30pKTsiLCIoZnVuY3Rpb24gKG5nLCBjcmlwKSB7XHJcbiAgICAndXNlIHN0cmljdCc7XHJcblxyXG4gICAgY3JpcC5ncmlkVXJsXHJcbiAgICAgICAgLnByb3ZpZGVyKCdjcmlwR3JpZFVybENvbmZpZycsIGNyaXBHcmlkVXJsQ29uZmlnKTtcclxuXHJcbiAgICBjcmlwR3JpZFVybENvbmZpZy4kaW5qZWN0ID0gW107XHJcblxyXG4gICAgZnVuY3Rpb24gY3JpcEdyaWRVcmxDb25maWcoKSB7XHJcbiAgICAgICAgdmFyIG1hcHBpbmdzID0gc2V0TWFwcGluZ3MoKTtcclxuXHJcbiAgICAgICAgdGhpcy5nZXRNYXBwaW5ncyA9IGdldE1hcHBpbmdzO1xyXG4gICAgICAgIHRoaXMuc2V0TWFwcGluZ3MgPSBzZXRNYXBwaW5ncztcclxuXHJcbiAgICAgICAgdGhpcy4kZ2V0ID0gWyRnZXRdO1xyXG5cclxuICAgICAgICBmdW5jdGlvbiAkZ2V0KCkge1xyXG4gICAgICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgICAgICAgZ2V0TWFwcGluZ3M6IGdldE1hcHBpbmdzXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG5cclxuICAgICAgICBmdW5jdGlvbiBnZXRNYXBwaW5ncygpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1hcHBpbmdzO1xyXG4gICAgICAgIH1cclxuXHJcbiAgICAgICAgZnVuY3Rpb24gc2V0TWFwcGluZ3MocGFnZSwgcGVyUGFnZSwgdG90YWwsIGRpcmVjdGlvbiwgb3JkZXIsIGZpbHRlcnMsIG5hbWUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1hcHBpbmdzID0ge1xyXG4gICAgICAgICAgICAgICAgcGFnZTogcGFnZSB8fCAnZ3JpZC1wYWdlJyxcclxuICAgICAgICAgICAgICAgIHBlclBhZ2U6IHBlclBhZ2UgfHwgJ2dyaWQtcGVyLXBhZ2UnLFxyXG4gICAgICAgICAgICAgICAgdG90YWw6IHRvdGFsIHx8ICdncmlkLXRvdGFsJyxcclxuICAgICAgICAgICAgICAgIGRpcmVjdGlvbjogZGlyZWN0aW9uIHx8ICdncmlkLWRpcmVjdGlvbicsXHJcbiAgICAgICAgICAgICAgICBvcmRlcjogb3JkZXIgfHwgJ2dyaWQtb3JkZXInLFxyXG4gICAgICAgICAgICAgICAgZmlsdGVyczogZmlsdGVycyB8fCAnZ3JpZC1maWx0ZXJzJyxcclxuICAgICAgICAgICAgICAgIG5hbWU6IG5hbWUgfHwgJ2dyaWQtbmFtZSdcclxuICAgICAgICAgICAgfTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn0pKGFuZ3VsYXIsIHdpbmRvdy5jcmlwIHx8ICh3aW5kb3cuY3JpcCA9IHt9KSk7IiwiKGZ1bmN0aW9uIChuZywgY3JpcCkge1xyXG4gICAgJ3VzZSBzdHJpY3QnO1xyXG5cclxuICAgIGNyaXAuZ3JpZFVybFxyXG4gICAgICAgIC5mYWN0b3J5KCdjcmlwR3JpZFVybCcsIGNyaXBHcmlkVXJsKTtcclxuXHJcbiAgICBjcmlwR3JpZFVybC4kaW5qZWN0ID0gWyckbG9nJywgJyRsb2NhdGlvbicsICdjcmlwR3JpZFVybENvbmZpZycsICdjcmlwR3JpZEV2ZW50cyddO1xyXG5cclxuICAgIC8vIHBsdWdpbiBmb3IgY3JpcEdyaWQgZmFjdG9yeVxyXG4gICAgLy8gZXh0ZW5kIG1ldGhvZCBjYW4gYmUgY2FsbGVkIG9ubHkgd2l0aCB7bmFtZSwgc2NvcGUsIHBhZ2luYXRlLCBwbHVnaW5zfVxyXG4gICAgZnVuY3Rpb24gY3JpcEdyaWRVcmwoJGxvZywgJGxvY2F0aW9uLCBjcmlwR3JpZFVybENvbmZpZywgZXZlbnRzKSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgZXh0ZW5kOiBleHRlbmRcclxuICAgICAgICB9O1xyXG5cclxuICAgICAgICBmdW5jdGlvbiBleHRlbmQocGFyYW1zKSB7XHJcbiAgICAgICAgICAgIHZhciBtYXBwaW5ncyA9IGNyaXBHcmlkVXJsQ29uZmlnLmdldE1hcHBpbmdzKCk7XHJcbiAgICAgICAgICAgIHBhcmFtcy5zY29wZS5ncmlkLnVybCA9IHtcclxuICAgICAgICAgICAgICAgIHBhcmFtczogW1xyXG4gICAgICAgICAgICAgICAgICAgIG1hcHBpbmdzWydwYWdlJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgbWFwcGluZ3NbJ3BlclBhZ2UnXSxcclxuICAgICAgICAgICAgICAgICAgICBtYXBwaW5nc1sndG90YWwnXSxcclxuICAgICAgICAgICAgICAgICAgICBtYXBwaW5nc1snZGlyZWN0aW9uJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgbWFwcGluZ3NbJ29yZGVyJ10sXHJcbiAgICAgICAgICAgICAgICAgICAgbWFwcGluZ3NbJ2ZpbHRlcnMnXSxcclxuICAgICAgICAgICAgICAgICAgICBtYXBwaW5nc1snbmFtZSddXHJcbiAgICAgICAgICAgICAgICBdXHJcbiAgICAgICAgICAgIH07XHJcblxyXG4gICAgICAgICAgICBpZiAoaXNUaGlzR3JpZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBzZXQgZ3JpZCBwYWdpbmF0aW9uIGZyb20gdXJsLCBvciBzZXQgZGVmYXVsdFxyXG4gICAgICAgICAgICAgICAgcGFyYW1zLnNjb3BlLmdyaWQucGFnaW5hdGlvbi5wYWdlXHJcbiAgICAgICAgICAgICAgICAgICAgPSBnZXRGcm9tVXJsT3IobWFwcGluZ3NbJ3BhZ2UnXSwgcGFyYW1zLnNjb3BlLmdyaWQucGFnaW5hdGlvbiwgJ3BhZ2UnKTtcclxuICAgICAgICAgICAgICAgIHBhcmFtcy5zY29wZS5ncmlkLnBhZ2luYXRpb24udG90YWxcclxuICAgICAgICAgICAgICAgICAgICA9IGdldEZyb21VcmxPcihtYXBwaW5nc1sndG90YWwnXSwgcGFyYW1zLnNjb3BlLmdyaWQucGFnaW5hdGlvbiwgJ3RvdGFsJyk7XHJcbiAgICAgICAgICAgICAgICBwYXJhbXMuc2NvcGUuZ3JpZC5wYWdpbmF0aW9uLnBlclBhZ2VcclxuICAgICAgICAgICAgICAgICAgICA9IGdldEZyb21VcmxPcihtYXBwaW5nc1sncGVyUGFnZSddLCBwYXJhbXMuc2NvcGUuZ3JpZC5wYWdpbmF0aW9uLCAncGVyUGFnZScpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHNldCBncmlkIHNvcnQgb3B0aW9ucyBmcm9tIHVybCwgb3Igc2V0IGRlZmF1bHRcclxuICAgICAgICAgICAgICAgIHBhcmFtcy5zY29wZS5ncmlkLnNvcnQuZGlyZWN0aW9uXHJcbiAgICAgICAgICAgICAgICAgICAgPSBnZXRGcm9tVXJsT3IobWFwcGluZ3NbJ2RpcmVjdGlvbiddLCBwYXJhbXMuc2NvcGUuZ3JpZC5zb3J0LCAnZGlyZWN0aW9uJyk7XHJcbiAgICAgICAgICAgICAgICBwYXJhbXMuc2NvcGUuZ3JpZC5zb3J0LmZpZWxkXHJcbiAgICAgICAgICAgICAgICAgICAgPSBnZXRGcm9tVXJsT3IobWFwcGluZ3NbJ29yZGVyJ10sIHBhcmFtcy5zY29wZS5ncmlkLnNvcnQsICdmaWVsZCcpO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vIHNldCBmaWx0ZXJzIGZyb20gdXJsLCBvciBzZXQgZGVmYXVsdFxyXG4gICAgICAgICAgICAgICAgcGFyYW1zLnNjb3BlLmdyaWQuZmlsdGVycyA9IGNsZWFyVXJsUGFyYW1zKCkgfHwgcGFyYW1zLnNjb3BlLmdyaWQuZmlsdGVycztcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgcGFyYW1zLnNjb3BlLiRvbihldmVudHMuZGF0YUNoYW5nZWQsIGZ1bmN0aW9uIChlLCBkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNUaGlzR3JpZCgpKVxyXG4gICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gobWFwcGluZ3NbJ3RvdGFsJ10sIGRhdGEudG90YWwpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHBhcmFtcy5zY29wZS4kb24oZXZlbnRzLmZpbHRlcnNDaGFuZ2VkLCBmdW5jdGlvbiAoZSwgZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzVGhpc0dyaWQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGxvb3BVcmwoZnVuY3Rpb24gKGtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBpZiBrZXkgZXhpc3RzIGluIHVybCwgYnV0IG5vdCBpbiBmaWx0ZXJzLCByZW1vdmUgaXQgZnJvbSB1cmxcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCFuZy5pc0RlZmluZWQoZGF0YS5maWx0ZXJzW2tleV0pKVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChrZXksIG51bGwpO1xyXG4gICAgICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIGFkZC91cGRhdGUgYWxsIGZpbHRlcnMgdG8gdXJsXHJcbiAgICAgICAgICAgICAgICAgICAgbmcuZm9yRWFjaChkYXRhLmZpbHRlcnMsIGZ1bmN0aW9uICh2YWwsIGtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKGtleSwgdmFsKTtcclxuICAgICAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgICAgIH0gZWxzZVxyXG4gICAgICAgICAgICAgICAgICAgIG9uT3RoZXJHcmlkQ2hhbmdlcygxKTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBwYXJhbXMuc2NvcGUuJG9uKGV2ZW50cy5zb3J0Q2hhbmdlZCwgZnVuY3Rpb24gKGUsIGRhdGEpIHtcclxuICAgICAgICAgICAgICAgIGlmIChpc1RoaXNHcmlkKCkpIHtcclxuICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKG1hcHBpbmdzWydkaXJlY3Rpb24nXSwgZGF0YS5kaXJlY3Rpb24pO1xyXG4gICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gobWFwcGluZ3NbJ29yZGVyJ10sIGRhdGEuZmllbGQpO1xyXG4gICAgICAgICAgICAgICAgfSBlbHNlXHJcbiAgICAgICAgICAgICAgICAgICAgb25PdGhlckdyaWRDaGFuZ2VzKDIpO1xyXG4gICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgIHBhcmFtcy5zY29wZS4kb24oZXZlbnRzLnBhZ2luYXRpb25DaGFuZ2VkLCBmdW5jdGlvbiAoZSwgZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzVGhpc0dyaWQoKSkge1xyXG4gICAgICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gobWFwcGluZ3NbJ3BhZ2UnXSwgZGF0YS5wYWdlKTtcclxuICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKG1hcHBpbmdzWydwZXJQYWdlJ10sIGRhdGEucGVyUGFnZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChtYXBwaW5nc1sndG90YWwnXSwgZGF0YS50b3RhbCk7XHJcbiAgICAgICAgICAgICAgICB9IGVsc2VcclxuICAgICAgICAgICAgICAgICAgICBvbk90aGVyR3JpZENoYW5nZXMoMyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgLy8gd2F0Y2ggdXJsIGNoYW5nZXNcclxuICAgICAgICAgICAgcGFyYW1zLnNjb3BlLiR3YXRjaChmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gJGxvY2F0aW9uLnNlYXJjaCgpXHJcbiAgICAgICAgICAgIH0sIGZ1bmN0aW9uIChuLCBvKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoaXNUaGlzR3JpZCgpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVxID0gbmcuZXF1YWxzLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBlcXVhbHMgPSAhIWVxKG4sIG8pLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICBwZXJQYWdlID0gbWFwcGluZ3NbJ3BlclBhZ2UnXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgdXJsUGVyUGFnZSA9IG5bcGVyUGFnZV07XHJcblxyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbXMuc2NvcGUuZ3JpZC5wYWdpbmF0aW9uLnBhZ2VTaXplcy5pbmRleE9mKHVybFBlclBhZ2UpID09PSAtMSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKHBlclBhZ2UsIG9bcGVyUGFnZV0pO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCFlcXVhbHMpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHBhcmFtcy5zY29wZS4kYnJvYWRjYXN0KGV2ZW50cy5leHRlcm5hbGx5Q2hhbmdlZCwge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgc29ydDoge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIGZpZWxkOiBuW21hcHBpbmdzWydvcmRlciddXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBkaXJlY3Rpb246IG5bbWFwcGluZ3NbJ2RpcmVjdGlvbiddXVxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgfSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHBhZ2luYXRpb246IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwYWdlOiBuW21hcHBpbmdzWydwYWdlJ11dLFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgIHRvdGFsOiBuW21hcHBpbmdzWyd0b3RhbCddXSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwZXJQYWdlOiBuW3BlclBhZ2VdXHJcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgZmlsdGVyczogY2xlYXJVcmxQYXJhbXMoKSxcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIG5hbWU6IG5bbWFwcGluZ3NbJ25hbWUnXV1cclxuICAgICAgICAgICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG5cclxuICAgICAgICAgICAgdmFyICRpbmplY3RvciA9IG5nLmluamVjdG9yKCk7XHJcbiAgICAgICAgICAgIG5nLmZvckVhY2gocGFyYW1zLnBsdWdpbnMsIGZ1bmN0aW9uIChwbHVnaW5fcGFyYW1zLCBwbHVnaW4pIHtcclxuICAgICAgICAgICAgICAgIHZhciBQbHVnaW5JbnN0YW5jZSA9ICRpbmplY3Rvci5nZXQocGx1Z2luKTtcclxuICAgICAgICAgICAgICAgIC8vIGVuYWJsZSBwbHVnaW5zIHtuYW1lLCBzY29wZSwgcGFnaW5hdGUsIHBsdWdpbnN9XHJcbiAgICAgICAgICAgICAgICBQbHVnaW5JbnN0YW5jZS5leHRlbmQoe1xyXG4gICAgICAgICAgICAgICAgICAgIHNjb3BlOiBwYXJhbXMuc2NvcGUsXHJcbiAgICAgICAgICAgICAgICAgICAgcGFnaW5hdGU6IHBhcmFtcy5wYWdpbmF0ZSxcclxuICAgICAgICAgICAgICAgICAgICBuYW1lOiBwYXJhbXMubmFtZSxcclxuICAgICAgICAgICAgICAgICAgICBwbHVnaW5zOiBwbHVnaW5fcGFyYW1zXHJcbiAgICAgICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgfSk7XHJcblxyXG4gICAgICAgICAgICBmdW5jdGlvbiBvbk90aGVyR3JpZENoYW5nZXMod2hlcmUpIHtcclxuICAgICAgICAgICAgICAgIC8vJGxvZy5sb2coeydvbk90aGVyR3JpZENoYW5nZXMnOiB3aGVyZX0pO1xyXG4gICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChtYXBwaW5nc1snbmFtZSddLCBwYXJhbXMubmFtZSk7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKG1hcHBpbmdzWydwYWdlJ10sIHBhcmFtcy5zY29wZS5ncmlkLnBhZ2luYXRpb24ucGFnZSk7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKG1hcHBpbmdzWyd0b3RhbCddLCBwYXJhbXMuc2NvcGUuZ3JpZC5wYWdpbmF0aW9uLnRvdGFsKTtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gobWFwcGluZ3NbJ3BlclBhZ2UnXSwgcGFyYW1zLnNjb3BlLmdyaWQucGFnaW5hdGlvbi5wZXJQYWdlKTtcclxuICAgICAgICAgICAgICAgICRsb2NhdGlvbi5zZWFyY2gobWFwcGluZ3NbJ2RpcmVjdGlvbiddLCBwYXJhbXMuc2NvcGUuZ3JpZC5zb3J0LmRpcmVjdGlvbik7XHJcbiAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKG1hcHBpbmdzWydvcmRlciddLCBwYXJhbXMuc2NvcGUuZ3JpZC5zb3J0LmZpZWxkKTtcclxuXHJcbiAgICAgICAgICAgICAgICBsb29wVXJsKGZ1bmN0aW9uIChrZXkpIHtcclxuICAgICAgICAgICAgICAgICAgICAvLyByZW1vdmUgYWxsIGZpbHRlcnMgZnJvbSB1cmwgYmVmb3JlIGFkZGluZyBmcm9tIG90aGVyIGdyaWRcclxuICAgICAgICAgICAgICAgICAgICAkbG9jYXRpb24uc2VhcmNoKGtleSwgbnVsbCk7XHJcbiAgICAgICAgICAgICAgICB9KTtcclxuXHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBwcm9wIGluIHBhcmFtcy5zY29wZS5ncmlkLmZpbHRlcnMpIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAocGFyYW1zLnNjb3BlLmdyaWQuZmlsdGVycy5oYXNPd25Qcm9wZXJ0eShwcm9wKSlcclxuICAgICAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChwcm9wLCBwYXJhbXMuc2NvcGUuZ3JpZC5maWx0ZXJzW3Byb3BdKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gbG9vcFVybChjYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgdmFyIHVybCA9ICRsb2NhdGlvbi5zZWFyY2goKTtcclxuICAgICAgICAgICAgICAgIG5nLmZvckVhY2godXJsLCBmdW5jdGlvbiAodmFsdWUsIGtleSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChwYXJhbXMuc2NvcGUuZ3JpZC51cmwucGFyYW1zLmluZGV4T2Yoa2V5KSA9PT0gLTEpXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrKGtleSwgdmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGNsZWFyVXJsUGFyYW1zKCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIHJldCA9IHt9O1xyXG4gICAgICAgICAgICAgICAgbG9vcFVybChmdW5jdGlvbiAoa2V5LCB2YWwpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXRba2V5XSA9IHZhbDtcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJldDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gZ2V0RnJvbVVybE9yKHVybE5hbWUsIHNvdXJjZSwgc291cmNlTmFtZSkge1xyXG4gICAgICAgICAgICAgICAgc291cmNlTmFtZSA9IHNvdXJjZU5hbWUgfHwgdXJsTmFtZTtcclxuICAgICAgICAgICAgICAgIHZhciByZXN1bHQgPSAkbG9jYXRpb24uc2VhcmNoKClbdXJsTmFtZV0gfHwgc291cmNlW3NvdXJjZU5hbWVdO1xyXG4gICAgICAgICAgICAgICAgLy8kbG9nLmxvZygnY3JpcEdyaWRVcmwgLT4gZ2V0RnJvbVVybE9yJywge1xyXG4gICAgICAgICAgICAgICAgLy8gICAgcmVzdWx0OiByZXN1bHQsXHJcbiAgICAgICAgICAgICAgICAvLyAgICB1cmxOYW1lOiB1cmxOYW1lLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgc291cmNlOiBzb3VyY2UsXHJcbiAgICAgICAgICAgICAgICAvLyAgICBzb3VyY2VOYW1lOiBzb3VyY2VOYW1lXHJcbiAgICAgICAgICAgICAgICAvL30pO1xyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgICAgICAgICAgfVxyXG5cclxuICAgICAgICAgICAgZnVuY3Rpb24gaXNUaGlzR3JpZCgpIHtcclxuICAgICAgICAgICAgICAgIHZhciB0aGlzTmFtZSA9IHBhcmFtcy5uYW1lLFxyXG4gICAgICAgICAgICAgICAgICAgIGdyaWROYW1lID0gJGxvY2F0aW9uLnNlYXJjaCgpW21hcHBpbmdzWyduYW1lJ11dO1xyXG5cclxuICAgICAgICAgICAgICAgIC8vJGxvZy5sb2coJ2NyaXBHcmlkVXJsIC0+IGlzVGhpc0dyaWQnLCB7XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgdGhpc05hbWU6IHRoaXNOYW1lLFxyXG4gICAgICAgICAgICAgICAgLy8gICAgIGdyaWROYW1lOiBncmlkTmFtZVxyXG4gICAgICAgICAgICAgICAgLy8gfSk7XHJcblxyXG4gICAgICAgICAgICAgICAgaWYgKGdyaWROYW1lICYmIGdyaWROYW1lID09PSB0aGlzTmFtZSlcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdHJ1ZTtcclxuXHJcbiAgICAgICAgICAgICAgICBpZiAoIWdyaWROYW1lKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgJGxvY2F0aW9uLnNlYXJjaChtYXBwaW5nc1snbmFtZSddLCB0aGlzTmFtZSk7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgICAgICAgICB9XHJcblxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59KShhbmd1bGFyLCB3aW5kb3cuY3JpcCB8fCAod2luZG93LmNyaXAgPSB7fSkpOyJdLCJzb3VyY2VSb290IjoiL3NvdXJjZS8ifQ==
