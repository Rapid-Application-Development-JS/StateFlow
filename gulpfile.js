var gulp = require('gulp');
var concat = require('gulp-concat');
var wrap = require('gulp-wrap-umd');
var runSequence = require('run-sequence');

gulp.task('scripts', function() {
    return gulp.src(['src/flowhandler.js', 'src/pipestep.js', 'src/pipe.js', 'src/flow.js'])
        .pipe(concat('stateflow.js'))
        .pipe(wrap({
            namespace : 'Flow',
            exports : 'Flow'
        }))
        .pipe(gulp.dest('./'));
});

gulp.task('default', function() {
    runSequence(['scripts'])
});