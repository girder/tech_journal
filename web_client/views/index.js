import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import MenuBarView from './menuBar.js';
import { restRequest } from 'girder/rest';
import { apiRoot } from 'girder/rest';

// Import all stylesheets
import '../stylesheets/main.styl';
import '../stylesheets/index.index.styl';
import '../stylesheets/submit.index.styl';
import '../stylesheets/submit.upload.styl';
import '../stylesheets/view.index.styl';

import IndexViewTemplate from '../templates/journal_index.jade';


var indexView = View.extend({
    initialize: function () {
        var totalData=[]
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
                path: 'journal/'+resp['technical_journal.default_journal']+'/submissions'
            }).done(_.bind(function (jrnResp) {
                this.render(jrnResp);
            },this));
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subData) {
        this.$el.html(IndexViewTemplate({info:subData}));
        new MenuBarView({ el: this.$el, parentView: this });
        return this;
    }
});

export default indexView;

