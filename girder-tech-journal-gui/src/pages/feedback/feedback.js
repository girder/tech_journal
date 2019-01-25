import View from 'girder/views/View';
import events from 'girder/events';
import { restRequest } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import FeedbackViewTemplate from './journal_help_feedback.pug';

var FeedbackView = View.extend({

    events: {
        'submit #form1': function (event) {
            event.preventDefault();
            var feedbackInfo = {};
            feedbackInfo['title'] = this.$('#Title').val();
            feedbackInfo['where'] = this.$('#Where').val();
            feedbackInfo['summary'] = this.$('#Summary').val();

            restRequest({
                method: 'POST',
                url: `journal/feedback`,
                contentType: 'application/json',
                data: JSON.stringify(feedbackInfo),
                error: null
            }).done((resp) => {
                events.trigger('g:alert', {
                    icon: 'ok',
                    text: 'Email sent.',
                    type: 'success',
                    timeout: 4000
                });
            });
        }
    },
    initialize: function () {
        this.render();
    },
    render: function () {
        this.$el.html(FeedbackViewTemplate());
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this,
            searchBoxVal: 'Search...'
        });
        return this;
    }
});

export default FeedbackView;
