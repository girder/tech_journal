import View from '@girder/core/views/View';
import { restRequest } from '@girder/core/rest';

import MenuBarView from '../../views/menuBar.js';
import JournalListTemplate from './journalList.pug';

const JournalListPage = View.extend({
    events: {
    },
    initialize: function () {
        this.render();
    },
    render: function (subData, searchVal) {
        restRequest({
            method: 'GET',
            url: 'journal'
        }).done((jrnResp) => {
            this.$el.html(JournalListTemplate({
                info: { 'journals': jrnResp }
            }));
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$el,
                parentView: this
            });
        });

        return this;
    }
});

export default JournalListPage;
