import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import { restRequest } from 'girder/rest';
import { apiRoot } from 'girder/rest';

import IndexViewTemplate from '../templates/journal_index.jade';


var indexView = View.extend({
    initialize: function () {
        var totalData=[]
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
                path: 'journal/'+resp['technical_journal.default_journal']+'/submissions'
            }).done(_.bind(function (jrnResp) {
                this.render(jrnResp);
            },this));
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subData) {
        this.$el.html(IndexViewTemplate({info:subData}));
        return this;
    }
});

export default indexView;

