var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var wrap = require('gulp-wrap-umd');
var runSequence = require('run-sequence');

gulp.task('scripts', function () {
    return gulp.src(['src/flowhandler.js', 'src/pipestep.js', 'src/pipe.js', 'src/flow.js', 'src/sate.js', 'src/stateflow.js'])
        .pipe(concat('stateflow.js'))
        .pipe(wrap({namespace: 'StateFlow', exports: 'StateFlow'}))
        .pipe(gulp.dest('./bin'));
});

gulp.task('compress', function () {
    return gulp.src('./bin/stateflow.js')
        .pipe(concat('stateflow.min.js'))
        .pipe(uglify())
        .pipe(gulp.dest('./bin'));
});

gulp.task('default', function () {
    runSequence('scripts', 'compress');
});