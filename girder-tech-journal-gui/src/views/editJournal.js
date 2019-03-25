import View from '@girder/core/views/View';
import router from '@girder/core/router';
import { restRequest } from '@girder/core/rest';

import MenuBarView from './menuBar.js';
import editJournalTemplate from '../templates/journal_edit_journal.pug';

var EditJournalView = View.extend({

    events: {
        'submit #createJournalForm': function (event) {
            event.preventDefault();
            var values = {issueName: this.$('#name')[0].value,
                issueDescription: this.$('#description')[0].value
            };
            if (this.restType === 'PUT') {
                this._updateJournal(values);
            } else {
                this._createJournal(values);
            }
            router.navigate('#plugins/journal/admin', {trigger: true});
        }
    },
    initialize: function (id) {
        var journalInfo = {info: {}};
        if (id.id !== 'new') {
            this.restType = 'PUT';
            this.restUrl = `collection/${id.id}`;
            journalInfo = this._getCurrentInfo(id);
        } else {
            this.restType = 'POST';
            this.restUrl = 'collection';
            this.render(journalInfo);
        }
    },
    render: function (journalInfo) {
        this.$el.html(editJournalTemplate(journalInfo));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$('#headerBar'),
            parentView: this
        });
        return this;
    },
    _createJournal: function (journalData) {
        var publicJournal = true;
        // Privacy-1 radio button indicates that the Journal should be private
        if ($('input[name=privacy]:checked').attr('value') === '1') {
            publicJournal = false;
        }
        // Adds the string which the API looks for when capturing all
        // collections that are also Journals
        if (journalData.issueDescription.indexOf('__journal__') === -1) {
            journalData.issueDescription = journalData.issueDescription + '\n\r__journal__';
        }
        restRequest({
            method: this.restType,
            url: this.restUrl,
            data: {
                name: journalData.issueName,
                description: journalData.issueDescription,
                public: publicJournal
            }
        }).done((jrnResp) => {
            ['editors', 'members'].forEach(function (val) {
                restRequest({
                    method: 'POST',
                    url: 'group',
                    data: {
                        name: `${journalData.issueName}_${val}`,
                        description: '',
                        public: false
                    }
                });
            });
        });
    },
    _updateJournal: function (journalData) {
        var publicJournal = true;
        // Privacy-1 radio button indicates that the Journal should be private

        if ($('input[name=privacy]:checked').attr('value') === '1') {
            publicJournal = false;
        }
        restRequest({
            method: this.restType,
            url: this.restUrl,
            data: {
                name: journalData.issueName,
                description: journalData.issueDescription
            }
        }).done((jrnResp) => {
            restRequest({
                method: this.restType,
                url: `${this.restUrl}/access`,
                data: {
                    access: JSON.stringify(this.accessInfo),
                    public: publicJournal
                }
            });
        });
    },
    _getCurrentInfo: function (journalData) {
        restRequest({
            method: 'GET',
            url: `collection/${journalData.id}`
        }).done((jrnInfo) => {
            restRequest({
                method: 'GET',
                url: `collection/${journalData.id}/access`
            }).done((jrnAccInfo) => {
                this.accessInfo = jrnAccInfo;
                this.render({info: jrnInfo});
            });
        });
    }
});

export default EditJournalView;
