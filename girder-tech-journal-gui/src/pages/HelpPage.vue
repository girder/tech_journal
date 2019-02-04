<template lang="pug">
div
  menu-bar-widget
  .Wrapper
    .Content
      .viewMain
        h2 {{ title }}
        p
          .g-help-description(v-html='renderedHelpText')
</template>

<script>
import { restRequest } from '@girder/core/rest';
import { renderMarkdown } from '@girder/core/misc';

export default {
  name: 'HelpPage',
  props: {
    title: {
      type: String,
      required: true,
    },
    settingKey: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      helpText: '',
    };
  },
  computed: {
    renderedHelpText() {
      return renderMarkdown(this.helpText);
    },
  },
  async created() {
    const settings = await restRequest({
      method: 'GET',
      url: 'journal/setting',
      data: {
        list: JSON.stringify([this.settingKey]),
      },
    });
    this.helpText = settings[this.settingKey];
  },
};
</script>
