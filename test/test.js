var should = require("chai").should();
var Flow = require("../stateflow.js");

var flow;

describe('0.1: Base tests', function () {

    beforeEach(function() {
        flow = new Flow();
    });
    afterEach(function(){
        flow = null;
    });

    //it('0.1.1: Flow: middleware1 -> middleware2 -> middleware3', function (done) {
    //
    //    function middleware1(data, chain) {
    //        var newData = {
    //            firstName: 'John',
    //            secondName: 'Doe',
    //            id: '1',
    //            data: data
    //        };
    //        console.log(data);
    //
    //        chain.next(newData);
    //    }
    //
    //    function middleware2(data, chain) {
    //        var newData = {
    //            user: data,
    //            posts: [
    //                'post1',
    //                'post2'
    //            ]
    //        };
    //
    //        // async data flow
    //        setTimeout(function () {
    //            console.log(data);
    //            chain.next(newData);
    //        }, 100);
    //    }
    //
    //    function middleware3(data, chain) {
    //        console.log(data);
    //        chain.next();
    //        done();
    //    }
    //
    //    flow.to('a')
    //        .process(middleware1)
    //        .process(middleware2)
    //        .process(middleware3)
    //        .described();
    //
    //    flow.switchTo('a', {start: 'a'});
    //});
    //
    //it('0.1.2: Flow: interrupt flow', function (done) {
    //
    //    function middleware1(data, chain) {
    //        var newData = {
    //            firstName: 'John',
    //            secondName: 'Doe',
    //            id: '1',
    //            data: data
    //        };
    //        console.log(data);
    //
    //        chain.next(newData);
    //    }
    //
    //    function middleware2(data, chain) {
    //        var newData = {
    //            user: data,
    //            posts: [
    //                'post1',
    //                'post2'
    //            ]
    //        };
    //
    //        // async data flow
    //        setTimeout(function () {
    //            console.log(data);
    //            chain.next(newData);
    //        }, 1000);
    //    }
    //
    //    function middleware3(data, chain) {
    //        console.log(data);
    //        chain.next();
    //        done();
    //    }
    //
    //    function middleware4(data, chain) {
    //        console.log('!!!!!!!!!!!!!!!!!!!!');
    //        chain.next();
    //        done();
    //    }
    //
    //
    //    flow.to('a')
    //        .process(middleware1)
    //        .process(middleware2)
    //        .process(middleware3)
    //        .described();
    //
    //    flow.to('b')
    //        .process(middleware4)
    //        .described();
    //
    //
    //    flow.switchTo('a', {start: 'a'});
    //    flow.switchTo('b');
    //});

    it('0.1.3: Flow: switch after interrupting flow', function (done) {

         function callAsync(chain, data) {
             console.log('2 middleware2: ', data);
             setTimeout(function () {
                 console.log('async middleware2: ', data);
                 chain.next(data);
             }, 1500);
         }

        function middleware1(data, chain) {
            console.log('middleware1: ', data);
            chain.next(data);
        }

        function middleware2(data, chain) {
            console.log('1 middleware2: ', data);
            callAsync(chain, data);
        }

        function middleware3(data, chain) {
            console.log('middleware3: ', data);
            chain.next();
            done();
        }

        function middleware4(data, chain) {
            console.log('!!!!!!!!!!!!!!!!!!!!');
            chain.next();
        }

        flow.to('a')
            .process(middleware1)
            .process(middleware2)
            .process(middleware3)
            .described();

        flow.to('b')
            .process(middleware4)
            .described();


        console.log('===== switch to "a" =====');
        flow.switchTo('a', {start: new Date().getTime()});
        console.log('===== switch to "b" =====');
        flow.switchTo('b');
        console.log('===== switch to "a" =====');
        flow.switchTo('a', {start: new Date().getTime()});
    });

});
