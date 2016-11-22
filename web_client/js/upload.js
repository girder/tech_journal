
function submitCheck()
  {
  this.$('input[type=submit]').attr('disabled',!this.$('#acceptRights').is(':checked') || !this.$('#acceptLicense').is(':checked') ||
  ( this.$('#acceptAttributionPolicy').is(":visible") && !this.$('#acceptAttributionPolicy').is(':checked')) ||
   (this.$("#otherLicenseInput").is(":visible") && !this.$("#otherLicenseInput").val() ));
  }

var fileTypes = ['','Thumbnail','Source','Paper','Data','Other','Github','Reference','Testing']
girder.views.journal_upload = girder.View.extend({
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
            submitCheck();
        },
        // Change function for updating the "Right to distribute" and submit status
        'change #acceptRights': function(event) {
            submitCheck();
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
            submitCheck();
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
      submitCheck()
        },

        'change #sendNotificationEmail': function(event) {
            var sendNotificationEmailIsSelected = $(this).is(":visible") && $(this).is(':checked');
            this.$('#hiddenSendNotificationEmail').attr('value', sendNotificationEmailIsSelected ? 1 : 0);
        },

        'change #otherLicenseInput': function(event) {
            var otherLicenseIsFilled = this.$("#otherLicenseInput").is(":visible") && this.$("#otherLicenseInput").val();
            this.$('#hiddenSourceLicenseText').attr('value', otherLicenseIsFilled ? this.$("#otherLicenseInput").val() : "Other");
            submitCheck();
        },
    },
    initialize: function (subId) {
        this.parentId= subId.id.id;
        girder.restRequest({
            type: 'GET',
            path: 'folder/'+ this.parentId
        }).done(_.bind(function (resp) {
            this.parent = resp;
            girder.restRequest({
                type: 'GET',
                path: 'item?folderId='+ this.parentId
            }).done(_.bind(function (itemResp) {
                this.render();
                for(index in itemResp) {
                  this.$('#uploadTable').append(girder.templates.journal_upload_entry({info: itemResp[index]}));
                }
            }, this));
        }, this));
    },
    render: function () {
        this.$el.html(girder.templates.journal_upload());
        return this;
    },
    _uploadFiles: function (data) {
        //taken from HierarchyWidget.js
        var container = $('#g-dialog-container');
        var model = new girder.models.FolderModel()
         model.set({ _id: this.parentId})

        new girder.views.UploadWidget({
            el: container,
            parent: model,
            parentType: this.parentType,
            parentView: this
        }).on('g:uploadFinished', function (retInfo) {
            girder.dialogs.handleClose('upload');
            //upload the information to the submission value
            // show the information in the table
            var subData = {
                'type': fileTypes[this.$('#typeFile').val().trim()]
            };
            girder.restRequest({
                type: 'GET',
                path: 'item?folderId='+ this.parentId +"&name=" +retInfo.files[0].name
            }).done(_.bind(function(resp) {
                girder.restRequest({
                    type: 'PUT',
                    path: 'item/'+resp[0]._id+'/metadata',
                    contentType: 'application/json',
                    data: JSON.stringify(subData),
                    error:null
                }).done(_.bind(function (respMD) {
                      this.$('#uploadTable').append(girder.templates.journal_upload_entry({info: respMD}));
               }, this));
           }, this));
        }, this).render();
    },
    _deleteFile: function(itemEntry) {
        girder.restRequest({
            type: 'DELETE',
            path: 'item/'+itemEntry.attributes.getNamedItem("key").nodeValue,
            error:null
        }).done(_.bind(function (respMD) {
              this.$(itemEntry).remove();
        }, this));
    },

    _appendData: function(subData) {
        girder.restRequest({
               type: 'PUT',
               path: 'folder/'+this.parentId+'/metadata',
               contentType: 'application/json',
               data: JSON.stringify(subData),
               error:null
           }).done(_.bind(function (respMD) {
               girder.router.navigate('plugins/journal/journal/view?id='+respMD._id,
                                      {trigger: true});
             }, this));
    }
});
girder.router.route('plugins/journal/journal/upload', 'journalUpload', function(id) {
    girder.events.trigger('g:navigateTo', girder.views.journal_upload,{id: id},{layout: girder.Layout.EMPTY});
});
