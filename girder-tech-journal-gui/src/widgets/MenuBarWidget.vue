<template lang="pug">
BackboneView#headerBar(:view='MenuBarView', :render='false')
</template>

<script>
import BackboneView from '@/BackboneView.vue';
import MenuBarView from '@/views/menuBar';

export default {
  name: 'MenuBarWidget',
  components: {
    BackboneView,
  },
  data() {
    return {
      MenuBarView,
    };
  },
};
</script>
