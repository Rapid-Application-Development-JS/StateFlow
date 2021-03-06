var should = require("chai").should();
var StateFlow = require("../bin/stateflow.js");

var flow, state;

describe('0.1: Flow tests', function () {

    beforeEach(function () {
        flow = StateFlow.destroy().create().flow;
    });
    afterEach(function () {
        StateFlow.destroy();
        flow = null;
    });

    it('0.1.1: Flow: data transfer through async operation', function (done) {
        this.timeout(100);

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
            .process(function (data, chain) {
                // it never execute
                // otherwise the test should fail due to a timeout
            })
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
            .after(function (data, chain) {
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
                //console.log(data);
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

    it('0.1.7: Flow: switch after interrupting flow', function (done) {
        function middlewareA(data, chain) {
            setTimeout(function () {
                chain.next(data);
            }, 50);
        }

        flow.to('a')
            .process(middlewareA)
            .process(middlewareA)
            .process(middlewareA)
            .after(function (data) {
                (data).should.equal('second time');
                done();
            })
            .described();

        flow.to('b')
            .process(function () {
            })
            .described();

        flow.switchTo('a', 'first time');
        flow.switchTo('b');
        flow.switchTo('a', 'second time');
    });

    it('0.1.8: Flow: directly run flow', function (done) {
        var middlewareA = function (data, chain) {
            setTimeout(function () {
                data.counter += 1;
                chain.next(data);
            }, 50);
        };

        var flowHandler = flow.to('a')
            .process(middlewareA)
            .process(middlewareA)
            .after(function (data) {
                (data.counter).should.equal(2);
                done();
            })
            .described();



        flowHandler.run({counter: 0});
        //flow.switchTo('a', {counter: 0});
    });

    it('0.1.9: Flow: transition flow via condition', function (done) {
        var isAuthorized = false;

        var checkAuthorization = function (data, chain) {
            data.flow += '_check';
            if (!isAuthorized) {
                chain.switchTo('login', {
                    state: chain.getCurrentState(),
                    param: data
                })
            } else {
                chain.next(data);
            }
        };

        var showRequredScreen = function (data, chain) {
            if (data) {
                chain.switchTo(data.state, data.param)
            } else {
                chain.next();
            }
        };

        var middleware = function (data, chain) {
            data.flow += '_middleware';
            chain.next(data);
        };

        // describe flow for 'login' state
        flow.to('login')
            .process(function (data, chain) {
                isAuthorized = true;

                data.param.flow += '_authorization';
                chain.next(data);
            })
            .process(showRequredScreen)
            .described();

        // describe flow for 'user' state
        flow.to('user')
            .process(checkAuthorization)
            .process(middleware)
            .process(function (data, chain) {
                (data.flow).should.equal('_check_authorization_check_middleware');
                done();
            })
            .described();

        // try to switch to 'user' state with id=123, 'flow' attribute only for testing
        flow.switchTo('user', {id: 123, flow: ''})
    });

    it('0.1.10: Flow: use pipe as a single step for another pipe"', function (done) {
        function middleware(data, chain) {
            setTimeout(function () {
                data += 1;
                if (data === 1) {
                    chain.error(data);
                } else {
                    chain.next(data);
                }
            }, 50);
        }

        flow.to('a')
            .process(function (data) {
                (data).should.equal(1);
                //done();
            })
            .described();

        flow.to('b')
            .process(middleware)
            .use('a')
            .error(middleware)
            .process(function () {
                done();
            })
            .described();

        flow.switchTo('b', 0);
    });

    it('0.1.11: Flow: overhead test - 100 sync steps', function (done) {
        function middleware(data, chain) {
            data += 1;
            chain.next(data);
        }

        var pipe = flow.to('a'),
            startTime;

        for (var i = 0; i < 2000; i++) {
            pipe.process(middleware);
        }

        pipe.process(function () {
            done();
        });

        pipe.described();

        startTime = Date.now();
        flow.switchTo('a', 0);
    });

});

describe('0.2: State tests', function () {

    beforeEach(function () {
        state = StateFlow.destroy().create().state;
        flow = StateFlow.flow;
    });
    afterEach(function () {
        state = null;
        flow = null;
    });

    it('0.2.1: State: change state notification via callback', function (done) {
        function callback (data) {
            (data).should.equal(1);
            done();
        }

        state('a').attach(callback);
        state('a').run(1);
    });

    it('0.2.2: State: change state through flow', function (done) {
        var stateName = 'a';

        function callback (data) {
            (data).should.equal('1middleware');
            done();
        }

        var middleware = function (data, chain) {
            setTimeout(function(){
                data += 'middleware';
                chain.next(data);
            }, 100);
        };

        state(stateName).attach(callback);
        flow.to(stateName)
            .process(middleware)
            .described();

        state(stateName).turnOn(1);
    });

    it('0.2.3: State: change state via flow \'run\'', function (done) {
        var stateName = 'a';

        function callback (data) {
            (data).should.equal('1middleware');
            done();
        }

        var middleware = function (data, chain) {
            setTimeout(function(){
                data += 'middleware';
                chain.next(data);
            }, 100);
        };

        state(stateName).attach(callback);
        var flowToState = flow.to(stateName)
            .process(middleware)
            .described();

        flowToState.run(1);
    });

    it('0.2.4: State: register emitter', function (done) {
        var events = require('events');
        var eventEmitter = new events.EventEmitter();

        var stateName = 'a';

        function callback(data) {
            (data.counter).should.equal(2);
            done();
        }

        function syncMiddleware (data, chain) {
            data.counter += 1;
            chain.next(data);
        }

        function asyncMiddleware (data, chain) {
            setTimeout(function () {
                data.counter += 1;
                chain.next(data);
            }, 0)
        }

        state.registerFn('emitter', function (event, emitter) {
            emitter.on(event, function (e) {
                this.turnOn(e);
            }.bind(this));
        });

        state(stateName)
            .emitter('event', eventEmitter)
            .attach(callback);

        flow.to(stateName)
            .process(syncMiddleware)
            .process(asyncMiddleware)
            .described();

        eventEmitter.emit('event', {counter: 0});
    });

});
