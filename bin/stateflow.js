
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require, exports, module);
  } else {
    root.StateFlow = factory();
  }
}(this, function(require, exports, module) {

function Flowhandler (name){
    this._locked = false;
    this.name = name;

    this._discharge();

    //if ( typeof stateCallback === 'function' ) {
    //    this.attachFunction('switchTo', stateCallback);
    //}
}

Flowhandler.prototype._callbackNames = {
    next : '_nextCallback',
    error : '_errorCallback',
    switchTo : '_stateCallback'
};

Flowhandler.prototype.getCurrentState = function() {
    return this.name;
};

Flowhandler.prototype.next = function (data) {
    if (this._locked) return false;
    this.lock();
    this._nextCallback(data);
};

Flowhandler.prototype.error = function (data) {
    if (this._locked) return false;
    this.lock();
    this._errorCallback(data);
};

Flowhandler.prototype.switchTo = function (state, data) {
    // todo implement to change

    if (this._locked) return false;
    this.lock();
    this._stateCallback(state, data);
};

Flowhandler.prototype._nextCallbackStub = function () {
    // stub
};

Flowhandler.prototype._errorCallbackStub = function () {
    // stub
};

Flowhandler.prototype._stateCallbackStub = function () {
    // stub
};

Flowhandler.prototype.attachFunction = function (name, fn) {
    if (this._locked) return false;

    if (typeof name === 'string' && typeof fn === 'function') {
        if (this._callbackNames[name]) {
            this[this._callbackNames[name]] = fn ;
        }
    }
};

Flowhandler.prototype.lock = function () {
    this._locked = true;
};

Flowhandler.prototype.unlock = function () {
    this._locked = false;
};

Flowhandler.prototype._discharge = function() {
    this.attachFunction('switchTo', this._stateCallbackStub);
    this.attachFunction('next', this._nextCallbackStub);
    this.attachFunction('error', this._errorCallbackStub);
};
function PipeStep (options){

    if ( !options ) {
        throw new Error(this.exception.NO_OPTIONS);
    }

    if (this.checkType(options.type)) {
        this.type = options.type;
    }

    this.context = this.checkContext(options.context);
    this.fn = null;


    this.handler = new Flowhandler(options.name);

    this.name = options.name;

    this.stateCallback = options.stateCallback;

    if (typeof options.fn === 'function') {
        this.fn = options.fn;
    }

    this.status = this.statuses.INITIAL;

    this.data = null;

    this.id = this.generateId();

    this._runID = null;

    this._links = {
        error : null,
        next : null,
        switchTo : null
    };
}

PipeStep.prototype.exception = {
    NO_OPTIONS : 'options required for this action',
    WRONG_TYPE : 'wrong PipeStep type was given'
};

PipeStep.prototype.statuses = {
    INITIAL : 1,
    IN_PROCESS : 2,
    DONE : 3,
    ERROR : 4,
    STATE_CHANGED : 5
};

PipeStep.prototype.pipeStepTypes = {
    PROCESS : 1,
    ERROR_HANDLER : 2,
    BEFORE : 3,
    AFTER : 4,
    STATE : 5
};

PipeStep.prototype.idBase = 0;

PipeStep.prototype.run = function(data) {
    this.fn.apply(this.context, [data, this.handler]);
};

PipeStep.prototype.generateId = function () {
    return 'id' + this.constructor.prototype.idBase++;
};

PipeStep.prototype.checkContext = function (obj) {
    var context;
    if (typeof obj != 'object') {
        context = this;
    } else {
        context = obj;
    }
    return context;
};

PipeStep.prototype.checkType = function (type) {
    var typeFound = null,
        value;

    for (var i in this.pipeStepTypes) {
        if (this.pipeStepTypes.hasOwnProperty(i)) {
            value = this.pipeStepTypes[i];
            if (value === type) {
                typeFound = true;
            }
        }
    }

    if (!typeFound) {
        throw new Error(this.exception.WRONG_TYPE);
    }

    return typeFound;
};

PipeStep.prototype._linkTo = function (pipeStep, type) {

};

PipeStep.prototype._bindNextFunction = function(fn) {
    if (typeof fn === 'function') {
        this.handler.attachFunction('next', fn)
    }
};

PipeStep.prototype.linkToProcess = function (pipeStep) {
    var self = this,
        isProcess,
        isAfterCallback;

    if ( !pipeStep ) {
        return false;
    }

    isProcess = pipeStep.type === this.pipeStepTypes.PROCESS;
    isAfterCallback = pipeStep.type === this.pipeStepTypes.AFTER;

    if (!isProcess && !isAfterCallback) {
        return false;
    }

    this._links.next = pipeStep;
};

PipeStep.prototype.linkToErrorHandler = function (pipeStep) {
    var self = this,
        isErrorHandler;

    if ( !pipeStep ) {
        return false;
    }

    isErrorHandler = pipeStep.type === this.pipeStepTypes.ERROR_HANDLER;

    if ( !isErrorHandler ) {
        return false;
    }

    this._links.error = pipeStep;
};

PipeStep.prototype.attachStateSwitchCallback = function(pipeStep) {
    var self = this;

    this._links.switchTo = pipeStep;
};

PipeStep.prototype._getActualRunID = function () {
    return this._runID;
};

PipeStep.prototype.lock = function () {
    // todo move this to separate function
    /**
     * looks strange, i know
     * trust me, i'll refactor that
     * @see _createHandler switchTo
     */
    this.handler._discharge();
    this.handler = this._createHandler();
    this.handler.lock();
};

PipeStep.prototype.unlock = function () {
    this.handler.unlock();
};

PipeStep.prototype._createHandler = function() {
	var handler = new Flowhandler(this.name),
        nextStep = this._links.next,
        errorHandlerStep = this._links.error,
        afterStep = this._links.switchTo,
        self = this;

    handler.attachFunction('next', function (data){
        self.status = self.statuses.DONE;
        self.data = data;
        if ( nextStep instanceof PipeStep ) {
            nextStep.run(data);
        }
    });

    handler.attachFunction('error', function(data){
        self.status = self.statuses.ERROR;
        self.data = data;
        if ( errorHandlerStep instanceof PipeStep ) {
            errorHandlerStep.run(data);
        }
    });

    handler.attachFunction('switchTo', function (state, data) {
        self.status = self.statuses.STATE_CHANGED;
        self.data = data;
        if ( afterStep instanceof PipeStep ) {

            afterStep._bindNextFunction(function (lastStepData){
                self.stateCallback(state, lastStepData);
            });
            afterStep.run(data);
        } else {
            self.stateCallback(state, data);
        }
    });

    return handler;
};
function Pipe(name, changeStateCallback, stateLocator, pipeLocator){

    if (typeof name !== 'string') {
        throw new Error('');
    }

    if (typeof changeStateCallback === 'function') {
        this._stateCallback = changeStateCallback;
    }

    this.name = name;

    this.data = null;
    this.dataStates = [];

    this.steps = [];

    this.isReady = false;
    this.isAfterCallbackApplied = false;

    this.entryData = null;

    // todo implement log
    this.dataLog = [];

    this.stateLocator = stateLocator;
    this.pipeLocator = pipeLocator;
}

Pipe.prototype.exception = {
    WRONG_STEP : 'given base step doesn\'t exist in pipe structure',
    NOT_READY : 'the pipe isn\'t ready',
    EMPTY : 'this pipe has no steps to run',
    AFTER_CALLBACK_EXISTS : 'you can\'t register more than one AFTER callback',
    ALREADY_DESCRIBED : 'you can\'t register any step after .described()'
};

Pipe.prototype.use = function (pipeName) {

    var usedPipe = this.pipeLocator(pipeName),
        clonedSteps = usedPipe._cloneStepsArray();

    this.steps.push.apply(this.steps, clonedSteps);

    return this;
};

Pipe.prototype.process = function (fn, context) {

    this._checkIfDescribed();

    var options = {
        fn : fn,
        context : context,
        stateCallback : this._stateCallback,
        type : PipeStep.prototype.pipeStepTypes.PROCESS
    };

    this._createStep(options);

    return this;
};

// alias
Pipe.prototype.do = Pipe.prototype.process;

Pipe.prototype.after = function (fn, context) {

    if (this.isAfterCallbackApplied) {
        throw new Error(this.exception.AFTER_CALLBACK_EXISTS);
    }

    this._checkIfDescribed();

    this.isAfterCallbackApplied = true;

    var options = {
        fn : fn,
        context : context,
        stateCallback : this._stateCallback,
        type : PipeStep.prototype.pipeStepTypes.AFTER
    };

    this._createStep(options);

    return this;
};

Pipe.prototype.error = function (fn, context) {

    this._checkIfDescribed();

    var options = {
        fn : fn,
        context : context,
        stateCallback : this._stateCallback,
        type : PipeStep.prototype.pipeStepTypes.ERROR_HANDLER
    };

    this._createStep(options);

    return this;
};

Pipe.prototype.described = function () {

    this._checkIfDescribed();

    // todo implement described step, which may change the flow's current state

    // todo if "state" is a string - add switching to that state at the end of the pipe

    var step,
        closestErrorHandler,
        closestProcess,
        afterStep,
        i,
        pipe = this;
    

    // todo check if it's correct
    //var finalStateCallack = this.state.run.bind(this.state);
    var finalStateCallack = function (data, chain) {
        var state = pipe.stateLocator(pipe.name);
        if (state && (typeof state.run === 'function')) {
            state.run(data);
        } else {
            chain.next(data);
        }
    };

    if ( this.isAfterCallbackApplied ) {
        this._getAfterStep()._bindNextFunction(finalStateCallack);
    } else {
        this.after(finalStateCallack);
    }

    if ( this.isAfterCallbackApplied ) {
        afterStep = this._getAfterStep();
    }


    for (i = 0; i < this.steps.length; i++) {

        step = this.steps[i];

        if ( step === afterStep) continue;

        closestProcess = this._closestProcess(step);
        closestErrorHandler = this._closestErrorHandler(step);

        // todo if there is no closest error handler - link step to ?
        // todo if there is no closest process - link step to finish step

        step.linkToProcess(closestProcess);
        step.linkToErrorHandler(closestErrorHandler);
        //step.attachStateSwitchCallback();

        if ( this.isAfterCallbackApplied ) {
            if ( !closestProcess ) {
                step.linkToProcess(afterStep);
            }
        }
        step.attachStateSwitchCallback(afterStep);
    }

    this._lockAllSteps();

    this.isReady = true;

    return this;
};

Pipe.prototype.run = function (data) {
    if (this.isReady) {

        this._unlockAllSteps();
        //this.isReady = false;
        //this.described();
        // todo refactor this
        this._findStepByType(PipeStep.prototype.pipeStepTypes.PROCESS)
            .run(data);
    } else {
        throw new Error(this.exception.NOT_READY);
    }
};

Pipe.prototype._closestStep = function (base, type) {
    var index = this.steps.indexOf(base),
        currentStep,
        neededStep,
        i;

    if ( index < 0 ) {
        throw new Error(this.exception.WRONG_STEP);
    }

    //if ( this.steps.length - index < 2 ) {
    // todo finalize this
    //}

    i = index + 1;

    while ( !neededStep && (i < this.steps.length) ) {

        currentStep = this.steps[i];
        if (currentStep.type === type) {
            neededStep = currentStep;
        }
        i++;

    }

    return neededStep;
};

Pipe.prototype._closestProcess = function (base) {
    return this._closestStep(base, PipeStep.prototype.pipeStepTypes.PROCESS);
};

Pipe.prototype._closestErrorHandler = function (base) {
    return this._closestStep(base, PipeStep.prototype.pipeStepTypes.ERROR_HANDLER);
};

Pipe.prototype._getAfterStep = function () {
    var after = null;
    if ( this.isAfterCallbackApplied ) {
        after = this._findStepByType(PipeStep.prototype.pipeStepTypes.AFTER);
    }
    return after;
};

Pipe.prototype._log = function(options) {
    return this.steps.map(function (item) {
        return {
            type : item.type,
            data : item.data,
            status : item.status
        }
    });
};

Pipe.prototype._unlockAllSteps = function () {
    for (var i = 0; i < this.steps.length; i++) {
        // todo refactor this
        this.steps[i].unlock();
    }
};

Pipe.prototype._lockAllSteps = function () {
    for (var i = 0; i < this.steps.length; i++) {
        // todo refactor this
        this.steps[i].lock();
    }
};

Pipe.prototype._createStep = function(options) {
    // todo refactor this to _extend
    options.name = this.name;
    var step = new PipeStep(options);
    this.steps.push(step);
};

Pipe.prototype._stateCallbackWrapper = function () {
    // stub
    this.stateCallback();
};

Pipe.prototype._stateCallback = function () {
    // stub
};

//Pipe.prototype._getFirstStep = function () {
//    if ( !this.steps.length ) {
//        throw new Error(this.exception.EMPTY);
//    }
//    return this.steps[0];
//};

Pipe.prototype._checkIfDescribed = function() {
    if (this.isReady) {
        throw new Error(this.exception.ALREADY_DESCRIBED)
    }
};

Pipe.prototype._findStepByType = function (type, backwardSearch, start) {
    if ( !this.steps.length ) {
        throw new Error(this.exception.EMPTY);
    }
    var step = null,
        searchStart = start || 0,
        increment = backwardSearch ? -1 : 1,
        i = searchStart;

    while ( !step && i >= 0 && i < this.steps.length ) {
        if (this.steps[i].type === type) {
            step = this.steps[i]
        }
        i += increment;
    }

    return step;
};

Pipe.prototype._cloneStepsArray = function () {
    var cloned = [];
    for (var i = 0; i < this.steps.length; i++) {
        var step = new PipeStep(this.steps[i]);
        if (step.type !== PipeStep.prototype.pipeStepTypes.AFTER) {
            cloned.push(step);
        }
    }

    return cloned;
};
function Flow(stateLocator){
    this.pipes = {};
    //this.states = {};
    this.activePipe = null;
    this.stateLocator = stateLocator
}

Flow.prototype.exception = {
    WRONG_NAME : 'wrong state\'s name given',
    NAME_EXISTS : 'such state name already exists',
    NAME_DOES_NOT_EXIST : 'such state name doesn\'t exist'
};

Flow.prototype.to = function (name) {
    this._checkNameAcceptable(name);
    this._checkNameExists(name);

    this.pipes[name] = new Pipe(name, this.switchTo.bind(this), this.stateLocator, this._getPipeByName.bind(this));

    return this.pipes[name];
};

Flow.prototype.switchTo = function (name, data) {

    if (!this.pipes.hasOwnProperty(name) ) {
        throw new Error(this.exception.NAME_DOES_NOT_EXIST);
    }

    this.activePipe = this.pipes[name];

    this._lockAll();

    this.activePipe.run(data);
};


Flow.prototype.destroy = function () {
    this.stateLocator = null;
    // todo implement it
};

//Flow.prototype.state = function (name) {
//    this._checkNameAcceptable(name);
//    this._checkNameExists(name);
//
//    this.states[name] = new State(name);
//
//    return this.pipes[name];
//};

Flow.prototype._checkNameExists = function (name) {
    if ( this.pipes.hasOwnProperty(name) ) {
        throw new Error(this.exception.NAME_EXISTS);
    }
};

Flow.prototype._checkNameAcceptable = function (name) {
    if ( typeof name !== 'string' || !name.length ) {
        throw new Error(this.exception.WRONG_NAME);
    }
};

Flow.prototype._lockAll = function () {
    for (var pipeName in this.pipes) {
        if (this.pipes.hasOwnProperty(pipeName) && this.pipes[pipeName] !== this.activePipe) {
            this.pipes[pipeName]._lockAllSteps();
        }
    }
};

Flow.prototype._getPipeByName = function (name) {
    if (!this.pipes.hasOwnProperty(name) ) {
        throw new Error(this.exception.NAME_DOES_NOT_EXIST);
    }
    return this.pipes[name];
};

function State(name) {
    this.callbacks = [];
    this.data = null;
    this.name = name;
}

State.prototype.exception = {
    NOT_A_FUNCTION : 'You need to pass an argument of type \'function\''
};

State.prototype.destroy = function () {
    this.callbacks = [];
};

State.prototype.attach = function (cb, context) {

    var ctx = context;

    if (typeof cb !== 'function') {
        throw new Error(this.exception.NOT_A_FUNCTION);
    }

    if (typeof context !== 'object') {
        ctx = {};
    }

    this.callbacks.push({
        fn : cb,
        context : ctx
    });

    return this;
};

State.prototype.run = function (data) {
    this.data = data;
    for (var i = 0; i < this.callbacks.length; i++) {
        var cb = this.callbacks[i];
        cb.fn.apply(cb.context, [this.data, this.name]);
    }
};

State.prototype.turn = State.prototype.run;
var StateFlow = (function () {
    var states = {};

    function createState(name) {
        var state;

        if (typeof name !== 'string') {
            throw new Error('');
        }
        state = states[name];
        if (!state) {
            state = new State(name);
            states[name] = state;
        }

        return state;
    }

    createState.registerFn = function (name, callback) {
        State.prototype[name] = function() {
            callback.apply(this, arguments);
            return this;
        };

        return this;
    };

    createState.unregisterFn = function (name) {
        State.prototype[name] = null;
        return this;
    };

    function destroyStates () {
        //todo destroy by state name
        for (var state in states) {
            if (states.hasOwnProperty(state)) {
                states[state].destroy();
            }
        }
        states = {};
    }

    function stateLocator(name) {
        return states[name];
    }

    return {
        create: function () {
            if(!this.flow){
                this.flow = new Flow(stateLocator);
            }
            if (!this.state) {
                this.state = createState;
                this.state.destroy = destroyStates;
            }
            return this;
        },
        destroy: function () {
            if (this.flow) {
                this.flow.destroy();
                this.flow = null;
            }
            if (this.state) {
                this.state.destroy();
                this.state = null;
            }
            return this;
        }
    };
})();
return StateFlow;

}));
