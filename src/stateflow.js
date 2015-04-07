var StateFlow = {
    create: function () {
        if (!this.state || !this.flow) {
            this.state = new State();
            this.flow = new Flow();
        }

        return this;
    },
    destroy: function () {
        if (this.state) {
            this.state.destroy();
            this.state = null;
        }

        if (this.flow) {
            this.flow.destroy();
            this.flow = null;
        }
        return this;
    }
};