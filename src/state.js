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