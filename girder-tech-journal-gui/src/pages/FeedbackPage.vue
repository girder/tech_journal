<template lang="pug">
div
  menu-bar-widget
  .Wrapper
    .Content
      .viewMain
        h2 Send Feedback
        form#form1(@submit.prevent='submit')
          table(width='70%', border='0')
            tbody
              tr
                td
                  .submission
                    .title
                      span.style1 *
                      | Your e-mail address
                    .caption
              tr
                td
                  input#Title.textbox(
                    v-model.trim='feedback.title',
                    required, size='65')
              tr
                td
                  .submission
                    .title
                      | Location of the problem
                    .caption
                      | Give an address (URL) if possible
              tr
                td
                  input#Where.textbox(
                    v-model.trim='feedback.where',
                    size='65')
              tr
                td
                  .submission
                    .title
                      span.style1 *
                      | What is the problem?
                    .caption
                      | Please be as specific as possible in your report
              tr
                td
                  textarea#Summary.textbox(
                    v-model.trim='feedback.summary',
                    required)
              tr
                td
                  div(align='right')
                    input#submit(type='submit', value='Send Feedback >>>')
</template>

<script>
import { restRequest } from '@girder/core/rest';
import events from '@girder/core/events';

export default {
  name: 'FeedbackPage',
  data() {
    return {
      feedback: {
        title: '',
        where: '',
        summary: '',
      },
    };
  },
  methods: {
    async submit() {
      await restRequest({
        method: 'POST',
        url: 'journal/feedback',
        contentType: 'application/json',
        data: JSON.stringify(this.feedback),
        error: null,
      });
      events.trigger('g:alert', {
        icon: 'ok',
        text: 'Email sent.',
        type: 'success',
        timeout: 4000,
      });
    },
  },
};
</script>

<style lang="stylus" scoped>
#Summary
  width 280px

.submission
  .caption
    width 100%
</style>
