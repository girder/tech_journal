import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import MenuBarView from './menuBar.js';
import { restRequest } from 'girder/rest';

import SubmitViewTemplate from '../templates/journal_submit.jade';
import SelectIssueTemplate from '../templates/journal_select_issue.jade';
import SubmitAuthorEntryTemplate from '../templates/journal_author_entry.jade';
import SubmitTagEntryTemplate from '../templates/journal_tag_entry.jade';


var SubmitView = View.extend({
    events: {
        'click .issueGen': function (event) {
           this.render(event.currentTarget.target,2)
        },
        'submit #submitForm': function (event) {
            event.preventDefault();
            this._createSubmission({
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
                    this.render(jrnResp,1);
                },this));
            }, this));  // End getting of OTJ Collection value setting

    },
    render: function (subResp, state) {
        if(state==1) {
            this.$el.html(SelectIssueTemplate({info:subResp}));
            new MenuBarView({ el: this.$el, parentView: this });
            return this;
        }
        else {
            this.parentId = subResp;
            restRequest({
                type: 'GET',
                path: 'folder/'+ this.parentId
            }).done(_.bind(function (resp) {
                this.$("#pageContent").html(SubmitViewTemplate({info:resp}));
                return this;
            }, this));  // End getting of OTJ Collection value setting
        }
    },
    _createSubmission: function (inData) {
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
            console.log(subData);
       restRequest({
            type: 'POST',
            path: 'folder',
            data: {
                parentId: this.parentId,
                parentType: "folder",
                name: inData.subName,
                description: inData.subDescription
            },
            error: null
        }).done(_.bind(function (resp) {
           restRequest({
               type: 'PUT',
               path: 'folder/'+resp._id+'/metadata',
               contentType: 'application/json',
               data: JSON.stringify(subData),
               error:null
           }).done(_.bind(function (respMD) {
               router.navigate('#plugins/journal/submission/'+respMD._id+"/upload",
                                      {trigger: true});
             }, this));
        }, this));
    }
});

export default SubmitView;

