var should = require("chai").should();
var Flow = require("../stateflow.js");

var flow;

describe('0.1: Base tests', function () {

    beforeEach(function () {
        flow = new Flow();
    });
    afterEach(function () {
        flow = null;
    });

    it('0.1.1: Flow: data transfer through async operation', function (done) {
        this.timeout(60);

        function middleware1(data, chain) {
            data += '1';
            chain.next(data);
        }

        function middleware2(data, chain) {
            data += '2';

            // async data flow
            setTimeout(function () {
                chain.next(data);
            }, 50);
        }

        function middleware3(data) {
            data += '3';
            (data).should.equal('0123');
            done();
        }

        flow.to('a')
            .process(middleware1)
            .process(middleware2)
            .process(middleware3)
            .described();

        flow.switchTo('a', '0');
    });

    it('0.1.2: Flow: operation context', function (done) {
        var context = {
            attr: 1
        };

        function middleware() {
            (this.attr).should.equal(1);
            done();
        }

        flow.to('a')
            .process(middleware, context)
            .described();

        flow.switchTo('a');
    });

    it('0.1.3: Flow: error handlers & state switching', function (done) {

        function middleware1(data, chain) {
            data += '1';
            chain.error(data);
        }

        function middleware2(data, chain) {
            data += '2';

            // async data flow
            setTimeout(function () {
                chain.next(data);
            }, 50);
        }

        function middleware3(data, chain) {
            data += '3';
            chain.switchTo('b', data);
        }

        function errorHandler1(data, chain) {
            data += 'e';
            chain.error(data);
        }

        function errorHandler2(data, chain) {
            data += 'E';
            chain.next(data);
        }

        flow.to('a')
            .process(middleware1)
            .process(middleware2)
            .error(errorHandler1)
            .error(errorHandler2)
            .process(middleware3)
            .described();

        flow.to('b')
            .process(function (data) {
                (data).should.equal('01eE3');
                done();
            })
            .described();

        flow.switchTo('a', '0');
    });

    it('0.1.4: Flow: "after" as last operation for transaction', function (done) {
        function middleware(data, chain) {
            data.counter += 1;
            data.flow += data.counter;
            chain.next(data);
        }

        flow.to('a')
            .process(middleware)
            .after(function (data) {
                (data.flow).should.equal('123');
                done();
            })
            .process(middleware)
            .process(middleware)
            .described();

        flow.switchTo('a', {counter: 0, flow: ''});
    });

    it('0.1.5: Flow: "after" as last operation for transaction via state changing', function (done) {
        function middleware(data, chain) {
            data.counter += 1;
            data.flow += data.counter;
            if (data.counter === 2) {
                chain.switchTo('b', data);
            } else {
                chain.next(data);
            }
        }

        flow.to('a')
            .process(middleware)
            .after(function (data, chain) {
                data.flow += 'after';
                chain.next(data);
            })
            .process(middleware)
            .process(middleware)
            .described();

        flow.to('b')
            .process(function (data) {
                console.log(data);
                done();
            })
            .described();


        flow.switchTo('a', {counter: 0, flow: ''});
    });

    it('0.1.6: Flow: interrupt flow via state changing', function (done) {
        var stepCounter = 0;

        this.timeout(300);

        function middleware(data, chain) {
            stepCounter += 1;
            setTimeout(function () {
                chain.next(data);
            }, 50);
        }

        flow.to('a')
            .process(middleware)
            .process(middleware)
            .process(middleware)
            .described();

        flow.to('b')
            .process(function () {
            })
            .described();

        setTimeout(function () {
            (stepCounter).should.equal(1);
            done();
        }, 200);

        flow.switchTo('a');
        flow.switchTo('b');
    });

    //it('0.1.3: Flow: switch after interrupting flow', function (done) {
    //
    //    function callAsync(chain, data) {
    //        console.log('2 middleware2: ', data);
    //        setTimeout(function () {
    //            console.log('async middleware2: ', data);
    //            chain.next(data);
    //        }, 1500);
    //    }
    //
    //    function middleware1(data, chain) {
    //        console.log('middleware1: ', data);
    //        chain.next(data);
    //    }
    //
    //    function middleware2(data, chain) {
    //        console.log('1 middleware2: ', data);
    //        callAsync(chain, data);
    //    }
    //
    //    function middleware3(data, chain) {
    //        console.log('middleware3: ', data);
    //        chain.next();
    //        done();
    //    }
    //
    //    function middleware4(data, chain) {
    //        console.log('!!!!!!!!!!!!!!!!!!!!');
    //        chain.next();
    //    }
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
    //    console.log('===== switch to "a" =====');
    //    flow.switchTo('a', {start: new Date().getTime()});
    //    console.log('===== switch to "b" =====');
    //    flow.switchTo('b');
    //    console.log('===== switch to "a" =====');
    //    flow.switchTo('a', {start: new Date().getTime()});
    //});

});
