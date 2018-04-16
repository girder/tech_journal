import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import ManageJournalsTemplate from '../templates/journal_manage_journals.pug';
import ManageJournalsEntryTemplate from '../templates/journal_manage_journals_entry.pug';

var manageJournalView = View.extend({

    events: {
    },
    initialize: async function (subId) {
        var allIssues = [];
        this.render();
        const resp = await restRequest({
            type: 'GET',
            path: 'journal'
        });

        for (var index in resp) {
            const jrnResp = await restRequest({
                type: 'GET',
                path: `journal/${resp[index]._id}/issues`
            });

            allIssues = allIssues.concat(jrnResp);
            this.$('#journalListing').html(ManageJournalsEntryTemplate({ issueInfo: allIssues, parentInfo: resp }));
        }
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
