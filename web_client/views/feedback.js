import _ from 'underscore';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import MenuBarView from './menuBar.js';
import { getCurrentUser } from 'girder/auth'
import { restRequest } from 'girder/rest';

import FeedbackViewTemplate from '../templates/journal_help_feedback.jade';

var FeedbackView = View.extend({

    events: {
    },
    initialize: function() {
        this.render()
    },
    render: function() {
            this.$el.html(FeedbackViewTemplate());
            new MenuBarView({ el: this.$el, parentView: this, searchBoxVal: "Search..."});
        return this;
    }
});

export default FeedbackView
