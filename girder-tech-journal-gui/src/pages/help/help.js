import View from '@girder/core/views/View';
import { restRequest } from '@girder/core/rest';
import { renderMarkdown } from '@girder/core/misc';

import MenuBarView from '../../views/menuBar.js';
import HelpTemplate from './help.pug';

const HelpPage = View.extend({
    initialize: function (settings) {
        this.title = settings.title;
        this.helpText = '';
        const settingKey = settings.settingKey;

        restRequest({
            method: 'GET',
            url: 'journal/setting',
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
