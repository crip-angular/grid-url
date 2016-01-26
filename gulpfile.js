var gulp = require('gulp'),
    crip = require('cripweb');

crip.scripts([
        '**/*.module.js',
        '**/*Config.js',
        '**/*.js'
    ],
    'crip-grid-url',
    'scripts',
    'resources',
    'build');

gulp.task('default', function () {
    crip.gulp.start('crip-default');
    crip.watch();
});