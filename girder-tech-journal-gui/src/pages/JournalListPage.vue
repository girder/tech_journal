<template lang="pug">
div
  MenuBarWidget
  .Wrapper
    .Content
      div
        br
        div(align='center')
          font(size='+1')
            strong Journals
        h3(v-for='journal in journals', :key='journal._id')
          a(:href='`#?query="collection":${journal._id}`') {{ journal.name }}
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
