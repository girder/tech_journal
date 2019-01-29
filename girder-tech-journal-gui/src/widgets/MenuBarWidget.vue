<template lang="pug">
BackboneView#headerBar(:view='MenuBarView', :render='false')
</template>

<script>
import Vue from 'vue';

import BackboneView from '@/BackboneView.vue';
import MenuBarView from '@/views/menuBar';

// @vue/component
const MenuBarWidget = {
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

// Register as a global component
Vue.component(MenuBarWidget.name, MenuBarWidget);

export default MenuBarWidget;
</script>
