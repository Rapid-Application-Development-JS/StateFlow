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

    this._parentPipeName = options.name;

    this.switchStateCallback = options.stateCallback;

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
	var handler = new Flowhandler(this._parentPipeName),
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
        //console.log('pipestep switch to', state, data, afterStep instanceof PipeStep);
        self.status = self.statuses.STATE_CHANGED;
        self.data = data;
        if ( afterStep instanceof PipeStep ) {

            afterStep.handler.attachFunction('next', function (lastStepData){
                //console.log('running after switchStateCallback');
                self.switchStateCallback(state, lastStepData);
            });
            //console.log('run after step');
            afterStep.run(data);
        } else {
            //console.log('direct call switchStateCallback');
            self.switchStateCallback(state, data);
        }
    });

    return handler;
};