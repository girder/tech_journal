import View from 'girder/views/View';

import MenuBarView from './menuBar.js';
import FeedbackViewTemplate from '../templates/journal_help_feedback.jade';

var FeedbackView = View.extend({

    events: {
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
