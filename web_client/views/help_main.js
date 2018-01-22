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
        }).done((resp) => {
            this.render(resp.main);
        });
    },
    render: function (helpText) {
        this.$el.html(HelpViewTemplate({info: helpText, renderMarkdown: renderMarkdown}));
        new MenuBarView({ el: this.$el, parentView: this, searchBoxVal: 'Search...' });
        return this;
    }
});

export default HelpView;
