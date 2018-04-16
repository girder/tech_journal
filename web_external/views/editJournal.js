import View from 'girder/views/View';
import router from 'girder/router';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import editJournalTemplate from '../templates/journal_edit_journal.pug';

var EditJournalView = View.extend({

    events: {
        'submit #createJournalForm': function (event) {
            event.preventDefault();
            var values = {issueName: this.$('#name')[0].value,
                issueDescription: this.$('#description')[0].value
            };
            this._createJournal(values);
            router.navigate('#plugins/journal/admin', {trigger: true});
        }
    },
    initialize: function (id) {
        var journalInfo = {info: {}};
        if (id.id !== 'new') {
            journalInfo = this._getCurrentInfo(id);
        } else {
            this.render(journalInfo);
        }
    },
    render: function (journalInfo) {
        this.$el.html(editJournalTemplate(journalInfo));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this
        });
        return this;
    },
    _createJournal: function (journalData) {
        var publicJournal = true;
        // Privacy-1 radio button indicates that the Journal should be private
        if ($('input[name=privacy]:checked').val() === 1) {
            publicJournal = false;
        }
        // Adds the string which the API looks for when capturing all
        // collections that are also Journals
        if (journalData.issueDescription.indexOf('__journal__') === -1) {
            journalData.issueDescription = journalData.issueDescription + '\n\r__journal__';
        }
        restRequest({
            type: 'POST',
            path: 'collection',
            data: {
                name: journalData.issueName,
                description: journalData.issueDescription,
                public: publicJournal
            }
        });
    },
    _getCurrentInfo: async function (journalData) {
        const jrnInfo = await restRequest({
            type: 'GET',
            path: `collection/${journalData.id}`
        });
        this.render({info: jrnInfo});
    }
});

export default EditJournalView;
