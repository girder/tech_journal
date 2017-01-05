import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import MenuBarView from './menuBar.js';
import { getCurrentUser } from 'girder/auth'
import { restRequest } from 'girder/rest';

import ManageJournalsTemplate from '../templates/journal_manage_journals.jade';

var manageJournalView = View.extend({

    events: {
    },
    initialize: function (subId) {
        var user = getCurrentUser()
        if (user.attributes.admin) {
            restRequest({
                type: 'GET',
                path: 'journal/setting',
                data: {
                    list: JSON.stringify([
                        'technical_journal.default_journal',
                    ])
                }
            }).done(_.bind(function (resp) {
                restRequest({
                    type: 'GET',
                    path: 'journal/'+resp['technical_journal.default_journal']+'/issues'
                }).done(_.bind(function (jrnResp) {
                    this.render(jrnResp, resp['technical_journal.default_journal']);
                },this));
            }, this));  // End getting of OTJ Collection value setting
        }
    },
    render: function (subResp, parentId) {
        this.$el.html(ManageJournalsTemplate({issueInfo:subResp,parentInfo:parentId}));
        new MenuBarView({ el: this.$el, parentView: this });
        return this;
    },
    _createJournal: function(journalData) {
        restRequest({
          type: 'POST',
          path: 'collection',
          data: {
              name: journalData.issueName,
              description: journalData.issueDescription
          },
        }).done(_.bind(function (jrnResp) {

        },this));
    },
});

export default manageJournalView

