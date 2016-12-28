import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import { restRequest } from 'girder/rest';

import SubmitViewTemplate from '../templates/journal_submit.jade';
import SubmitAuthorEntryTemplate from '../templates/journal_author_entry.jade';
import SubmitTagEntryTemplate from '../templates/journal_tag_entry.jade';


var SubmitView = View.extend({
    events: {
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
    initialize: function (subId) {
        this.parentId= subId.id.id;
        restRequest({
            type: 'GET',
            path: 'folder/'+ this.parentId
        }).done(_.bind(function (resp) {
            this.render(resp)
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subResp) {
        this.$el.html(SubmitViewTemplate({info:subResp}));
        return this;
    },
    _createSubmission: function (inData) {
            var subData = {
                'institution': this.$('#institutionEntry').val().trim(),
                'related': this.$('#relatedEntry').val().trim(),
                'type': this.$('#typeEntry').val().trim()
            };
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
               router.navigate('plugins/journal/journal/upload?id='+respMD._id,
                                      {trigger: true});
             }, this));
        }, this));
    }
});

export default SubmitView;

