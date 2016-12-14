import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import { restRequest } from 'girder/rest';

import SubmissionViewTemplate from '../templates/journal_view.jade';


var submissionView = View.extend({

    events: {
       'click #downloadLink': function(event) {
           router.navigate('plugins/journal/journal/download?id='+this.parentId,
                                      {trigger: true});
       }
    },
    initialize: function (subId) {
        this.parentId= subId.id.id;
        restRequest({
            type: 'GET',
            path: 'folder/'+ subId.id.id
        }).done(_.bind(function (resp) {
            console.log(resp)
            this.render(resp)
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subResp) {
        this.$el.html(SubmissionViewTemplate({info:subResp}));
        return this;
    }
});

export default submissionView

