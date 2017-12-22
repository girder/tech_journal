import _ from 'underscore';

import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import ManageJournalsTemplate from '../templates/journal_manage_journals.jade';
import ManageJournalsEntryTemplate from '../templates/journal_manage_journals_entry.jade';

var manageJournalView = View.extend({

    events: {
    },
    initialize: function (subId) {
        var allIssues = [];
        this.render();
        restRequest({
            type: 'GET',
            path: 'journal'
        }).done(_.bind(function (resp) {
            for (var index in resp) {
                restRequest({
                    type: 'GET',
                    path: 'journal/' + resp[index]._id + '/issues'
                }).done(_.bind(function (jrnResp) {
                    allIssues = allIssues.concat(jrnResp);
                    this.$('#journalListing').html(ManageJournalsEntryTemplate({ issueInfo: allIssues, parentInfo: resp }));
                }, this));
            }
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function () {
        this.$el.html(ManageJournalsTemplate());
        new MenuBarView({ el: this.$el, parentView: this });
        return this;
    }
});

export default manageJournalView;
