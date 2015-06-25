var StateFlow = (function () {
    var states = {},
        holder = {},
        activeState = null;

    function createState(name, pipeLocator) {
        var state;

        if (typeof name !== 'string') {
            throw new Error('');
        }
        state = states[name];
        if (!state) {
            state = new State(name, holder.flow._getPipeWrapper.bind(holder.flow));
            states[name] = state;
        }

        return state;
    }

    function registerFn(name, callback) {
        State.prototype[name] = function() {
            callback.apply(this, arguments);
            return this;
        };

        return holder.state;
    }

    function unregisterFn(name) {
        State.prototype[name] = null;

        return holder.state;
    }

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

    holder.create = function () {
        if(!this.flow){
            this.flow = new Flow(stateLocator);

        }
        if (!this.state) {
            // todo refactor this bind
            this.state = createState.bind(this);
            this.state.destroy = destroyStates;

            this.state.registerFn = registerFn;
            this.state.unregisterFn = unregisterFn;
        }
        return holder;
    };

    holder.destroy = function () {
        if (this.flow) {
            this.flow.destroy();
            this.flow = null;
        }
        if (this.state) {
            this.state.destroy();
            this.state = null;
        }
        return holder;
    };

    return holder;
})();