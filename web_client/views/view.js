import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import MenuBarView from './menuBar.js';
import { getCurrentUser } from 'girder/auth'
import { restRequest } from 'girder/rest';

import SubmissionViewTemplate from '../templates/journal_view.jade';


var submissionView = View.extend({

    events: {
        'click #downloadLink': function(event) {
            router.navigate('#plugins/journal/view/'+this.parentId+'/download',
                                       {trigger: true});
        },
        'click #addCommentButton': function(event) {
            event.preventDefault()
            var commentInfo={
               "name": this.currentUser.name(),
               "text": this.$("#commentText").val().trim(),
               "index": this.currentComments.length
            }
            this.currentComments.push(commentInfo);
            this.updateComments();
        },
        'click .deleteCommentLink': function(event) {
          event.preventDefault();
          var targetIndex = this.$(event.target).attr("val")
          this.currentComments.forEach(function (d) {
            if(d["index"] == targetIndex) {
              d.name="";
              d.text="";
            }
          })
          this.updateComments();
        },
        'keyup #commentText': function(event) {
           var charsLeft = 1200 -this.$("#commentText").val().length
           $(".commentLengthRemaining").text(charsLeft + " characters remaining.")
         }
    },
    initialize: function (subId) {
        this.parentId= subId.id;
        this.currentUser = getCurrentUser()
        restRequest({
            type: 'GET',
            path: 'folder/'+ this.parentId
        }).done(_.bind(function (resp) {
            this.render(resp)
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subResp) {
        subResp.meta.comments.sort(function(a,b) {
          if( a["index"] > b["index"]) return -1
          if( a["index"] < b["index"]) return 1
          if( a["index"] = b["index"]) return 0
        })
        this.currentComments = subResp.meta.comments
        this.$el.html(SubmissionViewTemplate({user:this.currentUser,info:subResp}));
        new MenuBarView({ el: this.$el, parentView: this });
        return this;
    },
    updateComments: function() {
      restRequest({
                    type: 'PUT',
                    path: 'folder/'+ this.parentId   +'/metadata',
                    contentType: 'application/json',
                    data: JSON.stringify({"comments":this.currentComments}),
                    error:null
                }).done(_.bind(function (resp) {
                    window.location.reload();
                }, this));

    }
});

export default submissionView

