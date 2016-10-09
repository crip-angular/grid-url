var gulp = require('gulp');
var cripweb = require('cripweb')(gulp);

cripweb(function (crip) {
    crip.config.set('scripts', { base: 'resources', output: 'build' });

    crip.scripts('crip-grid-url', ['**/*.module.js', '**/*Config.js', '**/*.js'], true)
});