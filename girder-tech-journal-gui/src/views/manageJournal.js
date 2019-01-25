import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import ManageJournalsTemplate from '../templates/journal_manage_journals.pug';
import ManageJournalsEntryTemplate from '../templates/journal_manage_journals_entry.pug';

var manageJournalView = View.extend({

    events: {
    },
    initialize: function (subId) {
        var allIssues = [];
        this.render();
        restRequest({
            method: 'GET',
            url: 'journal'
        }).done((resp) => {
            for (var index in resp) {
                restRequest({
                    method: 'GET',
                    url: `journal/${resp[index]._id}/issues`
                }).done((jrnResp) => {
                    allIssues = allIssues.concat(jrnResp);
                    this.$('#journalListing').html(ManageJournalsEntryTemplate({ issueInfo: allIssues, parentInfo: resp }));
                });
            }
        }); // End getting of OTJ Collection value setting
    },
    render: function () {
        this.$el.html(ManageJournalsTemplate());
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this
        });
        return this;
    }
});

export default manageJournalView;
