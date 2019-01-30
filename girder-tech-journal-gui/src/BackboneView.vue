<template lang="pug">
div
</template>

<script>
export default {
  name: 'BackboneView',
  props: {
    view: {
      type: Function,
      required: true,
    },
    settings: {
      type: Object,
      default() {
        return {};
      },
    },
    render: {
      type: Boolean,
      default: true,
    },
  },
  data() {
    return {
      viewInstance: null,
    };
  },
  mounted() {
    this.viewInstance = new this.view({ // eslint-disable-line new-cap
      el: this.$el,
      parentView: null,
      ...this.settings,
    });
    if (this.render) {
      this.viewInstance.render();
    }
  },
  beforeDestroy() {
    if (this.viewInstance) {
      this.viewInstance.destroy();
    }
  },
};
</script>
