<template lang="pug">
div
  menu-bar-widget
  .Wrapper
      .Content
        .viewMain
          h3 Statistics({{targetYear}})
          a(@click="targetYear-=1") Previous Year
          |,
          a(@click="targetYear+=1") Next Year
          img#loadingWheel(src='@/assets/loading-small.gif')
          h4 Overall Statistics
          table
            thead
              tr
                th Month
                th Revisions - Code
                th Revisions - Non-code
                th Submitters
                th Downloads
            tbody
              tr( v-for="item in monthly" :key="item._id")
                td {{months[item._id]}}
                td {{item.has_code}}
                td {{item.total - item.has_code}}
                td
                  span(v-for="name in item.names" :key="name") {{name}}
                    br

                td {{item.downloads}}
          h4 Quarterly Download Statistics
          h5 Quarter 1
          table
            thead
              tr
                th Title
                th Downloads
            tbody
              tr(v-for="item in submissions")
                template(v-if="[0,1,2].includes(new Date(item.updated).getMonth())")
                  td
                    a(:href="getHref(item.meta.submissionNumber)") {{item.name}}
                  td {{item.downloads}}
          h5 Quarter 2
          table
            thead
              tr
                th Title
                th Downloads
              tr(v-for="item in submissions")
                template(v-if="[3,4,5].includes(new Date(item.updated).getMonth())")
                  td
                    a(:href="getHref(item.meta.submissionNumber)") {{item.name}}
                  td {{item.downloads}}
          h5 Quarter 3
          table
            thead
              tr
                th Title
                th Downloads
              tr(v-for="item in submissions")
                template(v-if="[6,7,8].includes(new Date(item.updated).getMonth())")
                  td
                    a(:href="getHref(item.meta.submissionNumber)") {{item.name}}
                  td {{item.downloads}}
          h5 Quarter 4
          table
            thead
              tr
                th Title
                th Downloads
              tr(v-for="item in submissions")
                template(v-if="[9,10,11].includes(new Date(item.updated).getMonth())")
                  td
                    a(:href="getHref(item.meta.submissionNumber)") {{item.name}}
                  td {{item.downloads}}
          h4 SubmissionStatistics
          table
            thead
              tr
                th Title
                th License
                th Attribution Policy
                th Date
                th Total Views
                th Total Downloads
            tbody
              tr( v-for="item in submissions")
                td
                  a(:href="getHref(item.meta.submissionNumber)") {{item.name}}
                td {{item.license}}
                td {{item.meta.attributionPolicy}}
                td {{item.updated}}
                td {{item.views}}
                td {{item.downloads}}

</template>
<script>
import { restRequest } from '@girder/core/rest';

export default {
  name: 'StatisticsPage',
  data() {
    return {
      months: ['', 'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'],
      submissions: [],
      targetYear: '',
      monthly: [],
    };
  },
  watch: {
    targetYear() {
      this.findSubmissions(this.journalID['tech_journal.default_journal']);
    },
  },
  async created() {
    this.journalID = await restRequest({
      method: 'GET',
      url: 'journal/setting',
      data: {
        list: JSON.stringify([
          'tech_journal.default_journal',
        ]),
      },
    });
    $('#loadingWheel').hide(); // eslint-disable-line no-undef
    if (this.$options.propsData.year) {
      this.targetYear = this.$options.propsData.year;
    } else {
      this.targetYear = new Date().getFullYear();
    }
  },
  methods: {
    getHref(number) {
      return `#view/${number}`;
    },
    async findSubmissions(id) {
      $('#loadingWheel').show(); // eslint-disable-line no-undef
      this.statisticsData = await restRequest({
        method: 'GET',
        url: `journal/${id}/statistics?year=${this.targetYear}`,
      });
      this.submissions = this.statisticsData.total;
      this.monthly = this.statisticsData.monthly;
      $('#loadingWheel').hide(); // eslint-disable-line no-undef
    },
  },
};
</script>

<style lang="stylus" scoped>

table
  width 100%

caption
  padding 0 0 5px 0
  width 700px
  font italic 11px "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif
  text-align right


th
  font bold 11px "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif
  border-right 1px solid #C1DAD7
  border-bottom 1px solid #C1DAD7
  border-top 1px solid #C1DAD7
  letter-spacing 2px
  text-transform uppercase
  text-align left
  padding 6px 6px 6px 12px

th.nobg
  border-top 0
  border-left 0
  border-right 1px solid #C1DAD7
  background none


td
  border-right 1px solid #C1DAD7
  border-bottom 1px solid #C1DAD7
  background #fff
  padding 6px 6px 6px 12px
  color #4f6b72

td.alt
  background #F5FAFA
  color #797268


th.spec
  border-left 1px solid #C1DAD7
  border-top 0
  font bold 10px "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif


th.specalt
  border-left 1px solid #C1DAD7
  border-top 0
  font bold 10px "Trebuchet MS", Verdana, Arial, Helvetica, sans-serif
  color #797268

</style>
