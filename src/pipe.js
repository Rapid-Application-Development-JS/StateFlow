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