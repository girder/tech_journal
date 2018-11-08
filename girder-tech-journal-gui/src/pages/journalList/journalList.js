import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

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
            type: 'GET',
            path: 'journal'
        }).done((jrnResp) => {
            this.$el.html(JournalListTemplate({
                info: { 'journals': jrnResp }
            }));
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$el,
                parentView: this,
                searchBoxVal: searchVal
            });
        });

        return this;
    }
});

export default JournalListPage;
