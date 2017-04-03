import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import MenuBarView from './menuBar.js';
import { getCurrentUser } from 'girder/auth'
import { restRequest } from 'girder/rest';

import editJournalTemplate from '../templates/journal_edit_journal.jade';

var EditJournalView = View.extend({

    events: {
      'submit #createJournalForm': function (event) {
          event.preventDefault();
          var values = {issueName: this.$("#name")[0].value,
                        issueDescription: this.$("#description")[0].value
                       };
          this._createJournal(values);
          router.navigate('#plugins/journal/admin', {trigger: true});
      }
    },
    initialize: function (id) {
        if(id.id != 'new') {
            journalInfo = this._getCurrentInfo(id);
        }
        else {
            var journalInfo = {info:{}}
            this.render(journalInfo)
       }
    },
    render: function (journalInfo) {
        this.$el.html(editJournalTemplate(journalInfo));
        new MenuBarView({ el: this.$el, parentView: this });
        return this;
    },
    _createJournal: function(journalData) {
        var publicJournal = true;
        // Privacy-1 radio button indicates that the Journal should be private
        if ($("input[name=privacy]:checked").val()==1) {
           publicJournal = false;
        }
        // Adds the string which the API looks for when capturing all
        // collections that are also Journals
        if (journalData.issueDescription.indexOf("__journal__") == -1) {
          journalData.issueDescription = journalData.issueDescription + "\n\r__journal__"
        }
        restRequest({
          type: 'POST',
          path: 'collection',
          data: {
              name: journalData.issueName,
              description: journalData.issueDescription,
              public : publicJournal
          },
        }).done(_.bind(function (jrnResp) {
        },this));
    },
    _getCurrentInfo: function(journalData) {
        restRequest({
          type: 'GET',
          path: 'collection/'+journalData.id,
        }).done(_.bind(function (jrnInfo) {
            this.render({info: jrnInfo});
        },this));
    },
});

export default EditJournalView

