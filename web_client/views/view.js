import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import MenuBarView from './menuBar.js';
import { restRequest } from 'girder/rest';

import SubmissionViewTemplate from '../templates/journal_view.jade';


var submissionView = View.extend({

    events: {
       'click #downloadLink': function(event) {
           router.navigate('#plugins/journal/view/'+this.parentId+'/download',
                                      {trigger: true});
       }
    },
    initialize: function (subId) {
        this.parentId= subId.id;
        restRequest({
            type: 'GET',
            path: 'folder/'+ this.parentId
        }).done(_.bind(function (resp) {
            this.render(resp)
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subResp) {
        console.log(subResp);
        this.$el.html(SubmissionViewTemplate({info:subResp}));
        new MenuBarView({ el: this.$el, parentView: this });
        return this;
    }
});

export default submissionView

