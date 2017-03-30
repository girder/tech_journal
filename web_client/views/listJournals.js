import _ from 'underscore';

import View from 'girder/views/View';
import events from 'girder/events';
import MenuBarView from './menuBar.js';
import { restRequest } from 'girder/rest';
import { apiRoot } from 'girder/rest';


import JournalListTemplate from '../templates/journal_journal_list.jade';

var listView = View.extend({
    events: {
    },
    initialize: function () {
       this.render();
    },
    render: function (subData, searchVal) {
        restRequest({
            type: 'GET',
            path: 'journal'
        }).done(_.bind(function (jrnResp) {
            this.$el.html(JournalListTemplate({info:{"journals":jrnResp   }}));
            new MenuBarView({ el: this.$el, parentView: this, searchBoxVal: searchVal});
        },this));

        return this;
    }
});

export default listView;

