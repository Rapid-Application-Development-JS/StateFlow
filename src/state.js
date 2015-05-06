function State(name, pipeLocator) {
    this.callbacks = [];
    this.data = null;
    this.name = name;

    if (typeof pipeLocator === 'function') {
        this._pipeLocator = pipeLocator;
    }
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

State.prototype.turnOn = function (data) {
    var pipe = this._pipeLocator(this.name);

    if (pipe && pipe instanceof Pipe) {
        pipe.run(data);
    } else {
        this.run(data);
    }
};

State.prototype._pipeLocator = function () {
    // stub
};
