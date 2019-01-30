import Vue from 'vue';

import View from '@girder/core/views/View';

/**
 * Backbone view that wraps a Vue component
 *
 * @param {Object} settings
 * @param {Object} settings.component A VueJS single file component, from an import.
 * @param {Object} [settings.props] An optional set of props to pass to the new component.
 */
const VueComponentView = View.extend({
    initialize: function (settings) {
        this.ComponentType = Vue.extend(settings.component);
        this.props = settings.props || {};
        this.component = null;
        this.render();
    },

    render: function () {
        // this.el is often set to an existing element if this View is created by 'g:navigateTo',
        // so a new clean element should be created as the Vue component base
        this.$el.append('<div class="g-vue-component">');
        const vueContainerDom = this.$('.g-vue-component').get(0);

        this.component = new this.ComponentType({
            el: vueContainerDom,
            propsData: this.props
        });
        return this;
    },

    destroy: function () {
        if (this.component) {
            this.component.$destroy();
        }
        View.prototype.destroy.call(this);
    }
});

export default VueComponentView;
