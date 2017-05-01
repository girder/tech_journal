import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import MenuBarView from './menuBar.js';
import { restRequest } from 'girder/rest';

import SubmitViewTemplate from '../templates/journal_submit.jade';
import SubmitAuthorEntryTemplate from '../templates/journal_author_entry.jade';
import SubmitTagEntryTemplate from '../templates/journal_tag_entry.jade';


var RevisionView = View.extend({
    events: {
        'click .issueGen': function (event) {
           this.parentID=event.currentTarget.target
           this.render(event.currentTarget.target)
        },
        'submit #submitForm': function (event) {
            event.preventDefault();
                this._updateSubmission({
                    "subName":this.$('#titleEntry').val().trim(),
                    "subDescription": this.$('#abstractEntry').val().trim()
                })
        },
        'click #authorAdd': function (event) {
            event.preventDefault();
            this.$("#authors").append(SubmitAuthorEntryTemplate({info: "1"}))
        },
        'click #removeAuthor': function(event){
            this.$(event.currentTarget.parentElement).remove();
        },
        'click #tagAdd': function (event) {
            event.preventDefault();
            this.$("#tags").append(SubmitTagEntryTemplate({info: "1"}))
        },
        'click #removeTag': function(event){
            this.$(event.currentTarget.parentElement).remove();
        }
    },
    initialize: function (id) {
           this.newRevision=id.NR;
           this.newSub = false;
           this.render(id.id);
    },
    render: function (subResp) {
            this.itemId = subResp;
            restRequest({
                type: 'GET',
                path: 'folder/'+ this.itemId
            }).done(_.bind(function (resp) {
                console.log("REVISION")
                this.parentID = issueInfo.parentID
                restRequest({
                    type: 'GET',
                    path: 'folder/'+ this.itemId
                }).done(_.bind(function (resp) {
                    this.$("#pageContent").html(SubmitViewTemplate({info:resp}));
                    return this;
                }, this));  // End getting of OTJ Collection value setting
            }, this));  // End getting of OTJ Collection value setting
    },
    _updateSubmission: function (inData) {
            var authors = []
            var comments = []
            this.$("#authors .list-item").each(function(index,val) {
              var authorName = ''
              $(val).children('input').each(function(index2,val2) {
                if (val2.value !='') authorName += " " +val2.value
              })
              if (authorName.length >0) authors.push(authorName.trim())
            })
            var tags = []
            this.$("#tags input").each(function(index,val) {
              tags.push(val.value.trim())
            });
            var subData = {
                'institution': this.$('#institutionEntry').val().trim(),
                'related': this.$('#relatedEntry').val().trim(),
                'type': this.$('#typeEntry').val().trim(),
                'copyright': this.$('#copyrightEntry').val().trim(),
                'grant': this.$('#grantEntry').val().trim(),
                'authors': authors,
                'tags':tags,
                'comments':comments
            };
       restRequest({
            type: 'PUT',
            path: 'folder/'+this.itemId,
            data: {
                parentType: "folder",
                name: inData.subName,
                description: inData.subDescription
            },
            error: null
        }).done(_.bind(function (resp) {
           restRequest({
               type: 'PUT',
               path: 'folder/'+resp.parentId+'/metadata',
               contentType: 'application/json',
               data: JSON.stringify(subData),
               error:null
           }).done(_.bind(function (respMD) {
                       router.navigate('#plugins/journal/submission/' + parentId+"/upload/edit",
                                          {trigger: true});
             }, this));
        }, this));
    }
});

export default SubmitView;

