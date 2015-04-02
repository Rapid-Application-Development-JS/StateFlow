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

            pipeStep.handler.attachFunction('next', function (lastStepData){
                self.switchStateCallback(state, lastStepData);
            });
            pipeStep.run(data);
        } else {
            self.switchStateCallback(state, data);
        }
    })
};

// to - to,