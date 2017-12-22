import _ from 'underscore';

import View from 'girder/views/View';
import { restRequest } from 'girder/rest';
import { renderMarkdown } from 'girder/misc';

import MenuBarView from './menuBar.js';
import AboutViewTemplate from '../templates/journal_help_about.jade';

var AboutView = View.extend({

    events: {
    },
    initialize: function () {
        restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify(['about'])
            }
        }).done(_.bind(function (resp) {
            this.render(resp['about']);
        }, this));
    },
    render: function (aboutText) {
        this.$el.html(AboutViewTemplate({info: aboutText, renderMarkdown: renderMarkdown}));
        new MenuBarView({ el: this.$el, parentView: this, searchBoxVal: 'Search...' });
        return this;
    }
});

export default AboutView;
