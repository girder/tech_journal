<template lang="pug">
div
  menu-bar-widget
  .Wrapper
    .Content
      div
        br
        div(align='center')
          font(size='+1')
            strong View Survey Results
        br
        pre {{ surveyDetails }}

</template>

<script>
import { restRequest } from '@girder/core/rest';

export default {
  name: 'SurveyPage',
  props: {
    journalId: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      surveyDetails: null,
    };
  },
  async created() {
    this.surveyDetails = await restRequest({
      method: 'GET',
      url: `journal/${this.journalId}/survey`,
    });
  },
};
</script>
