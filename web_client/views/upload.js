var fileTypes = ['','Thumbnail','Source','Paper','Data','Other','Github','Reference','Testing']
import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import FolderModel from 'girder/models/FolderModel';
import UploadWidget from 'girder/views/widgets/UploadWidget';
import { handleClose, handleOpen } from 'girder/dialog';
import { restRequest } from 'girder/rest';

import UploadViewTemplate from '../templates/journal_upload.jade';
import UploadEntryTemplate from '../templates/journal_upload_entry.jade';


var uploadView = View.extend({
    events: {
        'submit #uploadForm': function (event) {
            event.preventDefault();
            this._appendData({
                "source-license":this.$('#hiddenSourceLicense').val().trim(),
                "source-license-text":this.$('#hiddenSourceLicenseText').val().trim(),
                "attribution-policy":this.$('#hiddenAttributionPolicy').val().trim(),
                "notification-email":this.$('#hiddenSendNotificationEmail').val().trim()
        })
        },

        'change #typeFile': function (event) {
            event.preventDefault();
            this._uploadFiles(event);
        },
        'click .deleteLink': function (event) {
            event.preventDefault();
            itemEntry = event.currentTarget.parentElement.parentElement
            this._deleteFile(itemEntry);
        },

        // Change function for updating the attribution policy value and submit status
        'change #acceptAttributionPolicy': function(event) {
            var acceptAttributionPolicyIsSelected = this.$("#acceptAttributionPolicy").is(":visible") &&  this.$("#acceptAttributionPolicy").is(':checked');
            this.$('#hiddenAttributionPolicy').attr('value', acceptAttributionPolicyIsSelected ? 1 : 0);
            this.submitCheck();
        },
        // Change function for updating the "Right to distribute" and submit status
        'change #acceptRights': function(event) {
            this.submitCheck();
        },
        // Change function for updating the submissions licensing and submit status
        'change #acceptLicense': function(event) {
            var license = this.$("#licenseChoice").val();
            this.$('#hiddenSourceLicense').attr('value', this.$("#licenseChoice").is(':checked') ? license: 0);

            if(license == 1 && this.$('#acceptLicense').is(':checked'))
              {
              this.$('#acceptAttributionPolicy').show();
              this.$('#acceptAttributionPolicyLabel').show();
              }
            else
              {
              this.$('#acceptAttributionPolicy').hide();
              this.$('#acceptAttributionPolicyLabel').hide();
              }
            if(license==3 && this.$('#acceptLicense').is(':checked'))
              {
              this.$("#otherLicenseInput").show();
              this.$("#otherLicenseInputLabel").show();
              }
            else
              {
              this.$("#otherLicenseInput").hide();
              this.$("#otherLicenseInputLabel").hide();
              }
            var acceptAttributionPolicyIsSelected = $('#acceptAttributionPolicy').is(":visible") && $('#acceptAttributionPolicy').is(':checked');
            this.$('#hiddenAttributionPolicy').attr('value', acceptAttributionPolicyIsSelected ? 1 : 0);
            this.submitCheck();
        },

        'change #licenseChoice': function(event) {
            var license = this.$("#licenseChoice").val();
            this.$('#hiddenSourceLicense').attr('value', this.$('#acceptLicense').is(':checked') ? license: 0);

            if(license == 1 && this.$('#acceptLicense').is(':checked'))
              {
              this.$('#acceptAttributionPolicy').show();
              this.$('#acceptAttributionPolicyLabel').show();
              }
            else
              {
              this.$('#acceptAttributionPolicy').hide();
              this.$('#acceptAttributionPolicyLabel').hide();
              }

            if(license==3 && this.$('#acceptLicense').is(':checked'))
              {
              this.$("#otherLicenseInput").show();
              this.$("#otherLicenseInputLabel").show();
              }
            else
              {
              this.$("#otherLicenseInput").hide();
              this.$("#otherLicenseInputLabel").hide();
              }
            var acceptAttributionPolicyIsSelected = this.$('#acceptAttributionPolicy').is(":visible") && this.$('#acceptAttributionPolicy').is(':checked');
      this.$('#hiddenAttributionPolicy').attr('value', acceptAttributionPolicyIsSelected ? 1 : 0);
      this.submitCheck()
        },

        'change #sendNotificationEmail': function(event) {
            var sendNotificationEmailIsSelected = $(this).is(":visible") && $(this).is(':checked');
            this.$('#hiddenSendNotificationEmail').attr('value', sendNotificationEmailIsSelected ? 1 : 0);
        },

        'change #otherLicenseInput': function(event) {
            var otherLicenseIsFilled = this.$("#otherLicenseInput").is(":visible") && this.$("#otherLicenseInput").val();
            this.$('#hiddenSourceLicenseText').attr('value', otherLicenseIsFilled ? this.$("#otherLicenseInput").val() : "Other");
            this.submitCheck();
        },
    },
    initialize: function (subId) {
        this.parentId= subId.id.id;
        restRequest({
            type: 'GET',
            path: 'folder/'+ this.parentId
        }).done(_.bind(function (resp) {
            this.parent = resp;
            this.render();
            /*restRequest({
                type: 'GET',
                path: 'item?folderId='+ this.parentId
            }).done(_.bind(function (itemResp) {
                for(var index in itemResp) {
                  this.$('#uploadTable').append(UploadEntryTemplate({info: itemResp[index]}));
                }
            }, this));*/
        }, this));
    },
    render: function () {
        this.$el.html(UploadViewTemplate());
        console.log($("#uploadTable"));
        return this;
    },

    submitCheck: function () {
      this.$('input[type=submit]').attr('disabled',!
          this.$('#acceptRights').is(':checked') ||
          !this.$('#acceptLicense').is(':checked') ||
          (this.$('#acceptAttributionPolicy').is(":visible") &&
          !this.$('#acceptAttributionPolicy').is(':checked')) ||
          (this.$("#otherLicenseInput").is(":visible") &&
          !this.$("#otherLicenseInput").val() )
      );
    },
    _uploadFiles: function (data) {
        //taken from HierarchyWidget.js
        var container = $('#g-dialog-container');
        var model = new FolderModel()
         model.set({ _id: this.parentId})

        new UploadWidget({
            el: container,
            parent: model,
            parentType: this.parentType,
            parentView: this
        }).on('g:uploadFinished', function (retInfo) {
            handleClose('upload');
            //upload the information to the submission value
            // show the information in the table
            var subData = {
                'type': fileTypes[this.$('#typeFile').val().trim()]
            };
           restRequest({
                type: 'GET',
                path: 'item?folderId='+ this.parentId +"&name=" +retInfo.files[0].name
            }).done(_.bind(function(resp) {
                restRequest({
                    type: 'PUT',
                    path: 'item/'+resp[0]._id+'/metadata',
                    contentType: 'application/json',
                    data: JSON.stringify(subData),
                    error:null
                }).done(_.bind(function (respMD) {
                      this.$('#uploadTable').append(UploadEntryTemplate({info: respMD}));
                      this.$('#uploadQuestions').show();
               }, this));
           }, this));
        }, this).render();
    },
    _deleteFile: function(itemEntry) {
        restRequest({
            type: 'DELETE',
            path: 'item/'+itemEntry.attributes.getNamedItem("key").nodeValue,
            error:null
        }).done(_.bind(function (respMD) {
              this.$(itemEntry).remove();
        }, this));
    },

    _appendData: function(subData) {
        restRequest({
               type: 'PUT',
               path: 'folder/'+this.parentId+'/metadata',
               contentType: 'application/json',
               data: JSON.stringify(subData),
               error:null
           }).done(_.bind(function (respMD) {
               router.navigate('plugins/journal/journal/view?id='+respMD._id,
                                      {trigger: true});
             }, this));
    }
});

export default uploadView;
