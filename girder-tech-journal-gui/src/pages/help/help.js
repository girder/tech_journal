import View from 'girder/views/View';
import { restRequest } from 'girder/rest';
import { renderMarkdown } from 'girder/misc';

import MenuBarView from '../../views/menuBar.js';
import HelpTemplate from './help.pug';

const HelpPage = View.extend({
    initialize: function (settings) {
        this.title = settings.title;
        this.helpText = '';
        const settingKey = settings.settingKey;

        restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify([settingKey])
            }
        }).done((resp) => {
            this.helpText = resp[settingKey];
            this.render();
        });
    },
    render: function () {
        this.$el.html(HelpTemplate({
            title: this.title,
            helpText: this.helpText,
            renderMarkdown: renderMarkdown
        }));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this,
            searchBoxVal: 'Search...'
        });
        return this;
    }
});

export default HelpPage;
