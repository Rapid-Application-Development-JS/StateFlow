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