import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import { restRequest } from 'girder/rest';

import SelectIssueViewTemplate from '../templates/journal_select_issue.jade';



var selectIssueView = View.extend({
    initialize: function (subId) {
        restRequest({
            type: 'GET',
            path: 'system/setting',
            data: {
                list: JSON.stringify([
                    'technical_journal.default_journal',
                ])
            }
        }).done(_.bind(function (resp) {
            restRequest({
                type: 'GET',
                path: 'collection',
                params: {
                    id: resp['technical_journal.default_journal']
                    }
            }).done(_.bind(function (issueResp) {
                for (var issue in issueResp) {
                    restRequest({
                        type: 'GET',
                        path: 'folder',
                        data: {
                            parentType: "collection",
                            parentId: issueResp[issue]['_id']
                        }
                    }).done(_.bind(function (subList) {
                        this.render(subList);
                    }, this));
                }
             }, this));
         }, this));
    },
    render: function (subResp) {
        this.$el.html(SelectIssueViewTemplate({info:subResp}));
        return this;
    }
});

export default selectIssueView;

