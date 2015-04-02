
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require, exports, module);
  } else {
    root.Flow = factory();
  }
}(this, function(require, exports, module) {

function Flowhandler (name){
    this._locked = false;
    this._parentPipeName = name;

    this.attachFunction('switchTo', this._stateCallbackStub);
    this.attachFunction('next', this._nextCallbackStub);
    this.attachFunction('error', this._errorCallbackStub);

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
    return this._parentPipeName;
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

    this.switchStateCallback = options.stateCallback;

    if (typeof options.fn === 'function') {
        this.fn = options.fn;
    }

    this.status = this.statuses.INITIAL;

    this.data = null;

    this.id = this.generateId();
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

    this.handler.attachFunction('next', function(data){
        self.status = self.statuses.DONE;
        self.data = data;
        pipeStep.run(data);
    });
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

    this.handler.attachFunction('error', function(data){
        self.status = self.statuses.ERROR;
        self.data = data;
        pipeStep.run(data);
    });
};

PipeStep.prototype.attachStateSwitchCallback = function(pipeStep) {
    var self = this;

    this.handler.attachFunction('switchTo', function (state, data) {
        self.status = self.statuses.STATE_CHANGED;
        self.data = data;
        if ( pipeStep instanceof PipeStep ) {
            pipeStep.handler.attachFunction('next', function (){
                self.switchStateCallback(state, data);
            });
            pipeStep.run();
        } else {
            self.switchStateCallback(state, data);
        }
    })
};

// to - to,
function Pipe(stateName, changeStateCallback){

    if (typeof stateName !== 'string') {
        throw new Error('');
    }

    if (typeof changeStateCallback === 'function') {
        this._stateCallback = changeStateCallback;
    }

    this.name = stateName;

    this.data = null;
    this.dataStates = [];

    this.steps = [];

    this.isReady = false;
    this.isAfterCallbackApplied = false;

    this.entryData = null;

    // todo implement log
    this.dataLog = [];
}

Pipe.prototype.exception = {
    WRONG_STEP : 'given base step doesn\'t exist in pipe structure',
    NOT_READY : 'the pipe isn\'t ready',
    EMPTY : 'this pipe has no steps to run',
    AFTER_CALLBACK_EXISTS : 'you can\'t register more than one AFTER callback',
    ALREADY_DESCRIBED : 'you can\'t register any step after .described()'
};

Pipe.prototype.switchTo = function (fn, context) {

    var options = {
        fn : fn,
        context : context,
        stateCallback : this._stateCallback,
        type : PipeStep.prototype.pipeStepTypes.STATE
    };

    this._createStep(options);

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

Pipe.prototype.described = function (state) {

    this._checkIfDescribed();

    // todo implement described step, which may change the flow's current state
    //this.switchTo(function(){ });

    // todo if "state" is a string - add switching to that state at the end of the pipe

    var step,
        closestErrorHandler,
        closestProcess,
        afterStep,
        i;

    if ( this.isAfterCallbackApplied ) {
        afterStep = this.getAfterStep();
    }

    for (i = 0; i < this.steps.length; i++) {

        step = this.steps[i];

        if ( step === afterStep) continue;

        closestProcess = this.closestProcess(step);
        closestErrorHandler = this.closestErrorHandler(step);

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

    this.isReady = true;

    return this;
};

Pipe.prototype.closestStep = function (base, type) {
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

Pipe.prototype.closestProcess = function (base) {
    return this.closestStep(base, PipeStep.prototype.pipeStepTypes.PROCESS);
};

Pipe.prototype.closestErrorHandler = function (base) {
    return this.closestStep(base, PipeStep.prototype.pipeStepTypes.ERROR_HANDLER);
};

Pipe.prototype.getAfterStep = function () {
    var after = null;
    if ( this.isAfterCallbackApplied ) {
        after = this._findStepByType(PipeStep.prototype.pipeStepTypes.AFTER);
    }
    return after;
};

Pipe.prototype.run = function (data) {
    if (this.isReady) {
        this._unlockAllSteps();
        this.isReady = false;
        this.described();
        // todo refactor this
        this._findStepByType(PipeStep.prototype.pipeStepTypes.PROCESS)
            .run(data);
    } else {
        throw new Error(this.exception.NOT_READY);
    }
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
        this.steps[i].handler.unlock();
    }
};

Pipe.prototype._lockAllSteps = function () {
    for (var i = 0; i < this.steps.length; i++) {
        // todo refactor this
        this.steps[i].handler.lock();
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
function Flow(){
    this.pipes = {};
    this.activePipe = null;
}

Flow.prototype.exception = {
    WRONG_NAME : 'wrong state\'s name given',
    NAME_EXISTS : 'such state name already exists',
    NAME_DOES_NOT_EXIST : 'such state name doesn\'t exist'
};

Flow.prototype.to = function (name) {
    if ( typeof name !== 'string' || !name.length ) {
        throw new Error(this.exception.WRONG_NAME);
    }

    if ( this.pipes.hasOwnProperty(name) ) {
        throw new Error(this.exception.NAME_EXISTS);
    }

    this.pipes[name] = new Pipe(name, this.switchTo.bind(this));

    return this.pipes[name];
};

Flow.prototype.switchTo = function (name, data) {

    if (!this.pipes.hasOwnProperty(name) ) {
        throw new Error(this.exception.NAME_DOES_NOT_EXIST);
    }

    this._lockAll();

    this.activePipe = this.pipes[name];

    this.activePipe.run(data);
};

Flow.prototype._lockAll = function () {
    for (var pipeName in this.pipes) {
        if (this.pipes.hasOwnProperty(pipeName)) {
            this.pipes[pipeName]._lockAllSteps();
        }
    }
};
return Flow;

}));
