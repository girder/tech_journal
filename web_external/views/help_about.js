import View from 'girder/views/View';
import { restRequest } from 'girder/rest';
import { renderMarkdown } from 'girder/misc';

import MenuBarView from './menuBar.js';
import AboutViewTemplate from '../templates/journal_help_about.pug';

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
        }).done((resp) => {
            this.render(resp.about);
        });
    },
    render: function (aboutText) {
        this.$el.html(AboutViewTemplate({info: aboutText, renderMarkdown: renderMarkdown}));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this,
            searchBoxVal: 'Search...'
        });
        return this;
    }
});

export default AboutView;
