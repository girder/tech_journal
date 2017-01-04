import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import MenuBarView from './menuBar.js';
import { restRequest } from 'girder/rest';

import SelectIssueViewTemplate from '../templates/journal_select_issue.jade';

var selectIssueView = View.extend({
    initialize: function () {
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
                this.render(jrnResp);
            },this));
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subResp) {
        this.$el.html(SelectIssueViewTemplate({info:subResp}));
        new MenuBarView({ el: this.$el, parentView: this });
        return this;
    }
});

export default selectIssueView;

