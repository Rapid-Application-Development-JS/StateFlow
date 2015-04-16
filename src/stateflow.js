var StateFlow = (function () {
    var states = {};

    function createState(name) {
        var state;

        if (typeof name !== 'string') {
            throw new Error('');
        }
        state = states[name];
        if (!state) {
            state = new State(name);
            states[name] = state;
        }

        return state;
    }

    function destroyStates () {
        //todo destroy by state name
        for (var state in states) {
            if (states.hasOwnProperty(state)) {
                state.destroy();
            }
        }
        states = {};
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