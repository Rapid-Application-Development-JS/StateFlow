var StateFlow = (function () {
    var states = {};
    var singletonInstance = null;

    function createState(name, pipeLocator) {
        var state;

        if (typeof name !== 'string') {
            throw new Error('');
        }
        state = states[name];
        if (!state) {
            state = new State(name, singletonInstance.flow._getPipeWrapper.bind(singletonInstance.flow));
            states[name] = state;
        }

        return state;
    }

    createState.registerFn = function (name, callback) {
        State.prototype[name] = function() {
            callback.apply(this, arguments);
            return this;
        };

        return this;
    };

    createState.unregisterFn = function (name) {
        State.prototype[name] = null;
        return this;
    };

    function destroyStates (name) {
        if (typeof name === 'string') {
            if (states.hasOwnProperty(name)) {
                states[name].destroy();
            }
            delete states[name];
        } else if (name === undefined){
            for (var state in states) {
                if (states.hasOwnProperty(state)) {
                    states[state].destroy();
                }
            }
            states = {};
        }
    }

    function stateLocator(name) {
        return states[name];
    }

    return {
        create: function () {
            if(!this.flow){
                this.flow = new Flow(stateLocator);
            }
            if (!this.state) {
                this.state = createState;

                this.state.destroy = destroyStates;
            }
            singletonInstance = this;
            return this;
        },
        destroy: function () {
            if (this.flow) {
                this.flow.destroy();
                this.flow = null;
            }
            if (this.state) {
                this.state.destroy();
                this.state = null;
            }
            return this;
        }
    };
})();