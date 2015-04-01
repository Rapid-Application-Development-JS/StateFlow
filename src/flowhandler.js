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