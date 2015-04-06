var StateFlow = {
    create: function () {
        this.destroy();
        this.flow = new Flow();
        return this;
    },
    destroy: function () {
        if (this.flow) {
            this.flow = null;
        }
        return this;
    }
};