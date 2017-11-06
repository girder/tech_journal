import _ from 'underscore';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import MenuBarView from './menuBar.js';
import { getCurrentUser } from 'girder/auth'
import { restRequest } from 'girder/rest';
import { renderMarkdown } from 'girder/misc';

import FAQViewTemplate from '../templates/journal_help_faq.jade';

var FAQView = View.extend({

    events: {
    },
    initialize: function() {
        restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify(['faq'])
            }
        }).done(_.bind(function (resp) {
            this.render(resp['faq']);
        }, this));
        
    },
    render: function(faqText) {
            this.$el.html(FAQViewTemplate({info:faqText,renderMarkdown: renderMarkdown}));
            new MenuBarView({ el: this.$el, parentView: this, searchBoxVal: "Search..."});
        return this;
    }
});

export default FAQView
