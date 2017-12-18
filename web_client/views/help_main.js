import _ from 'underscore';

import View from 'girder/views/View';
import { restRequest } from 'girder/rest';
import { renderMarkdown } from 'girder/misc';

import MenuBarView from './menuBar.js';
import HelpViewTemplate from '../templates/journal_help.jade';

var HelpView = View.extend({

    events: {
    },
    initialize: function () {
        restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify(['main'])
            }
        }).done(_.bind(function (resp) {
            this.render(resp['main']);
        }, this));
    },
    render: function (helpText) {
        this.$el.html(HelpViewTemplate({info: helpText, renderMarkdown: renderMarkdown}));
        MenuBarView({ el: this.$el, parentView: this, searchBoxVal: 'Search...' });
        return this;
    }
});

export default HelpView;
