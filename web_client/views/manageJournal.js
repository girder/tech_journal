import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import MenuBarView from './menuBar.js';
import { getCurrentUser } from 'girder/auth'
import { restRequest } from 'girder/rest';

import ManageJournalsTemplate from '../templates/journal_manage_journals.jade';
import ManageJournalsEntryTemplate from '../templates/journal_manage_journals_entry.jade';

var manageJournalView = View.extend({

    events: {
    },
    initialize: function (subId) {
        var user = getCurrentUser()
        this.render();
        restRequest({
            type: 'GET',
            path: 'journal',
        }).done(_.bind(function (resp) {
            for(var index in resp) {
                restRequest({
                    type: 'GET',
                    path: 'journal/'+resp[index]._id+'/issues'
                }).done(_.bind(function (jrnResp) {
                     var current =this.$("#journalListing").html()
                     this.$("#journalListing").html( current +
                         ManageJournalsEntryTemplate({issueInfo:jrnResp,parentInfo:resp[index]}))
                },this));
            }
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function () {
        this.$el.html(ManageJournalsTemplate());
        new MenuBarView({ el: this.$el, parentView: this });
        return this;
    },
});

export default manageJournalView

