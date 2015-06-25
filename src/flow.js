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

Flow.prototype._getPipeWrapper = function (name) {
    var self = this;
    return function (data) {
        self.switchTo(name, data);
    }
};

// todo callback on beforeLeave state (like saving data or validation)