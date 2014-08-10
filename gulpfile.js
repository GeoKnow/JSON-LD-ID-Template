var gulp = require('./gulp')([
'jshint',
'mocha',
'coverage'
]);
gulp.task('test', ['jshint', 'mocha']);
gulp.task('default', ['test']);

