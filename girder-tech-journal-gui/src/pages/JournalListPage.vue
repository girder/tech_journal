<template lang="pug">
div
  menu-bar-widget
  .Wrapper
    .Content
      .viewMain
        h2 Journals
        ul
          li(v-for='journal in journals', :key='journal._id')
            a(:href='`#?query="collection":${journal._id}`') {{ journal.name }}
            ul
              li {{journal.description}}
</template>

<script>
import { restRequest } from '@girder/core/rest';

export default {
  name: 'JournalListPage',
  data() {
    return {
      journals: [],
    };
  },
  async created() {
    this.journals = await restRequest({
      method: 'GET',
      url: 'journal',
    });
  },
};
</script>

<style lang="stylus" scoped>
h3
  margin-bottom 3px
</style>
