
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    define(factory);
  } else if (typeof exports === 'object') {
    module.exports = factory(require, exports, module);
  } else {
    root.Flow = factory();
  }
}(this, function(require, exports, module) {

function Flowhandler (stateCallback){
    this._locked = false;

    this.attachFunction('switchTo', this._stateCallbackStub);
    this.attachFunction('next', this._nextCallbackStub);
    this.attachFunction('error', this._errorCallbackStub);

    if ( typeof stateCallback === 'function' ) {
        this.attachFunction('switchTo', stateCallback);
    }
}

Flowhandler.prototype._callbackNames = {
    next : '_nextCallback',
    error : '_errorCallback',
    switchTo : '_stateCallback'
};

Flowhandler.prototype.next = function (data) {
    if (this._locked) return false;
    this._nextCallback(data);
    this.lock();
};

Flowhandler.prototype.error = function (data) {
    if (this._locked) return false;
    this._errorCallback(data);
    this.lock();
};

Flowhandler.prototype.switchTo = function (data) {
   // todo implement to change

    if (this._locked) return false;
    this._stateCallback(data);
    this.lock();
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


    this.handler = new Flowhandler(options.stateCallback);

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
    var self = this;
    if ( !pipeStep || this.type !== this.pipeStepTypes.PROCESS || pipeStep.type !== this.pipeStepTypes.PROCESS ) {
        return false;
    }

    this.handler.attachFunction('next', function(data){
        self.status = self.statuses.DONE;
        self.data = data;
        pipeStep.run(data);
    });
};

PipeStep.prototype.linkToErrorHandler = function (pipeStep) {
    var self = this;
    if ( !pipeStep || this.type !== this.pipeStepTypes.PROCESS || pipeStep.type !== this.pipeStepTypes.ERROR_HANDLER ) {
        return false;
    }

    this.handler.attachFunction('error', function(data){
        self.status = self.statuses.ERROR;
        self.data = data;
        pipeStep.run(data);
    });
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

    this.ready = false;

    this.entryData = null;

    // todo implement log
    this.dataLog = [];
}

Pipe.prototype.exception = {
    WRONG_STEP : 'given base step doesn\'t exist in pipe structure',
    NOT_READY : 'the pipe isn\'t ready',
    EMPTY : 'this pipe has no steps to run'
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

Pipe.prototype.error = function (fn, context) {
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
    // todo implement described step, which may change the flow's current switchTo
    //this.switchTo(function(){ });



    var step,
        closestErrorHandler,
        closestProcess,
        i;

    for (i = 0; i < this.steps.length; i++) {

        step = this.steps[i];

        closestProcess = this.closestProcess(step);
        closestErrorHandler = this.closestErrorHandler(step);

        step.linkToProcess(closestProcess);
        step.linkToErrorHandler(closestErrorHandler);
    }

    this.ready = true;

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

Pipe.prototype.run = function (data) {
    if (this.ready) {
        this._unlockAllSteps();
        // todo refactor this
        this._getFirstStep().run(data);
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
        this.steps[i].handler.unlock();
    }
};

Pipe.prototype._createStep = function(options) {
    var step = new PipeStep(options);
    this.steps.push(step);
};

Pipe.prototype._stateCallback = function () {
    // stub
};

Pipe.prototype._getFirstStep = function() {
    if ( !this.steps.length ) {
        throw new Error(this.exception.EMPTY);
    }
    return this.steps[0];
};
function Flow(){
    this.pipes = {};
    this.activePipe = null;
}

Flow.prototype.exception = {
    WRONG_NAME : 'wrong state\'s name given',
    NAME_EXISTS : 'such state name already exists',
    NAME_DOES_NOT_EXIST : 'such state name doesn\'t exists'
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
        this.pipes[pipeName]._lockAllSteps()
    }
};
return Flow;

}));
