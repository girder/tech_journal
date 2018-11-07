import View from 'girder/views/View';
import router from 'girder/router';
import events from 'girder/events';
import FolderModel from 'girder/models/FolderModel';
import UploadWidget from 'girder/views/widgets/UploadWidget';
import { getCurrentUser } from 'girder/auth';
import { handleClose } from 'girder/dialog';
import { restRequest } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import UploadViewTemplate from './journal_upload.pug';
import UploadEntryTemplate from './journal_upload_entry.pug';

var uploadView = View.extend({
    events: {
        'submit #curateduploadForm': function (event) {
            event.preventDefault();
            this._appendData({
                'source-license': this.$('#hiddenSourceLicense').val().trim(),
                'source-license-text': this.$('#hiddenSourceLicenseText').val().trim(),
                'attribution-policy': this.$('#hiddenAttributionPolicy').val().trim(),
                'notification-email': this.$('#hiddenSendNotificationEmail').val().trim()
            });
        },
        'submit #approvedUploadForm': function (event) {
            event.preventDefault();
            this._approveSubmission({
                'source-license': this.$('#hiddenSourceLicense').val().trim(),
                'source-license-text': this.$('#hiddenSourceLicenseText').val().trim(),
                'attribution-policy': this.$('#hiddenAttributionPolicy').val().trim(),
                'notification-email': this.$('#hiddenSendNotificationEmail').val().trim()
            });
        },

        'change #typeFile': function (event) {
            event.preventDefault();
            if (event.target.value === 'GITHUB') {
                $('#githubContentBlock').show();
            } else {
                $('#githubContentBlock').hide();
                this._uploadFiles(event);
            }
        },
        'click .deleteLink': function (event) {
            event.preventDefault();
            var itemEntry = event.currentTarget.parentElement.parentElement;
            this._deleteFile(itemEntry);
        },
        'click #addGithub': function (event) {
            event.preventDefault();
            var subData = {'github': $('#github').val()};
            restRequest({
                type: 'PUT',
                path: `journal/${this.parentId}/metadata`,
                contentType: 'application/json',
                data: JSON.stringify(subData),
                error: null
            }).fail((respMD) => {
                events.trigger('g:alert', {
                    icon: 'ok',
                    text: 'The repository doesn\'t exist or the URL is invalid.',
                    type: 'warning',
                    timeout: 4000
                });
            }).done((respMD) => {
                this.$('#uploadTable').append(UploadEntryTemplate({info: {'name': subData.github, '_id': 'github', 'meta': {'type': 6}}}));
                this.$('#uploadQuestions').show();
            });
        },

        // Change function for updating the attribution policy value and submit status
        'change #acceptAttributionPolicy': function (event) {
            var acceptAttributionPolicyIsSelected = this.$('#acceptAttributionPolicy').is(':visible') && this.$('#acceptAttributionPolicy').is(':checked');
            this.$('#hiddenAttributionPolicy').attr('value', acceptAttributionPolicyIsSelected ? 1 : 0);
            this.submitCheck();
        },
        // Change function for updating the 'Right to distribute' and submit status
        'change #acceptRights': function (event) {
            this.submitCheck();
        },
        // Change function for updating the submissions licensing and submit status
        'change #acceptLicense': function (event) {
            var license = this.$('#licenseChoice').val();
            this.$('#hiddenSourceLicense').attr('value', this.$('#licenseChoice').is(':checked') ? license : 'Not Defined');
            this._checkForm(license);
            var acceptAttributionPolicyIsSelected = $('#acceptAttributionPolicy').is(':visible') && $('#acceptAttributionPolicy').is(':checked');
            this.$('#hiddenAttributionPolicy').attr('value', acceptAttributionPolicyIsSelected ? 1 : 0);
            this.submitCheck();
        },

        'change #licenseChoice': function (event) {
            var license = this.$('#licenseChoice').val();
            this.$('#hiddenSourceLicense').attr('value', this.$('#acceptLicense').is(':checked') ? license : 0);
            this._checkForm(license);
            var acceptAttributionPolicyIsSelected = this.$('#acceptAttributionPolicy').is(':visible') && this.$('#acceptAttributionPolicy').is(':checked');
            this.$('#hiddenAttributionPolicy').attr('value', acceptAttributionPolicyIsSelected ? 1 : 0);
            this.submitCheck();
        },

        'change #sendNotificationEmail': function (event) {
            var sendNotificationEmailIsSelected = $(this).is(':visible') && $(this).is(':checked');
            this.$('#hiddenSendNotificationEmail').attr('value', sendNotificationEmailIsSelected ? 1 : 0);
        },

        'change #otherLicenseInput': function (event) {
            var otherLicenseIsFilled = this.$('#otherLicenseInput').is(':visible') && this.$('#otherLicenseInput').val();
            this.$('#hiddenSourceLicenseText').attr('value', otherLicenseIsFilled ? this.$('#otherLicenseInput').val() : 'Other');
            this.submitCheck();
        }
    },
    initialize: function (subId) {
        this.parentId = subId.id;
        this.newRevision = subId.NR;
        restRequest({
            type: 'GET',
            path: `journal/${this.parentId}/details`
        }).done((resp) => {
            this.curRevision = resp[0];
            this.render();
            restRequest({
                type: 'GET',
                path: `item?folderId=${this.parentId}`
            }).done((itemResp) => {
                for (var index in itemResp) {
                    this.$('#uploadTable').append(UploadEntryTemplate({info: itemResp[index]}));
                    this.$('#uploadQuestions').show();
                    this.$('#acceptRights').prop('checked', 'checked');
                    this.$('#acceptLicense').prop('checked', 'checked');
                    this.$('#acceptAttributionPolicy').prop('checked', 'checked');
                    this.$('#licenseChoice').val(resp[0].meta['source-license']);
                    this.$('#otherLicenseInput').val(resp[0].meta['source-license-text']);
                }
                this._checkForm(resp[0].meta['source-license']);
                this.submitCheck();
            });
        });
    },
    render: function () {
        this.$el.html(UploadViewTemplate({user: getCurrentUser(), newRevision: this.newRevision}));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this
        });
        return this;
    },

    submitCheck: function () {
        var isDisabled = !this.$('#acceptRights').is(':checked') ||
            !this.$('#acceptLicense').is(':checked') ||
            !this.$('#licenseChoice').val() ||
            (
                this.$('#acceptAttributionPolicy').is(':visible') &&
                !this.$('#acceptAttributionPolicy').is(':checked')
            ) ||
            (
                this.$('#otherLicenseInput').is(':visible') &&
                !this.$('#otherLicenseInput').val()
            );
        this.$('input[type=submit]').attr('disabled', isDisabled);
    },
    _uploadFiles: function (data) {
        // taken from HierarchyWidget.js
        var container = $('#g-dialog-container');
        var model = new FolderModel();
        model.set({ _id: this.parentId });

        new UploadWidget({
            el: container,
            parent: model,
            parentType: this.parentType,
            parentView: this
        }).on('g:uploadFinished', function (retInfo) {
            handleClose('upload');
            // upload the information to the submission value
            // show the information in the table
            var subData = {
                'type': this.$('#typeFile').val().trim()
            };
            restRequest({
                type: 'GET',
                path: `item?folderId=${this.parentId}&name=${retInfo.files[0].name}`
            }).done((resp) => {
                restRequest({
                    type: 'PUT',
                    path: `item/${resp[0]._id}/metadata`,
                    contentType: 'application/json',
                    data: JSON.stringify(subData),
                    error: null
                }).done((respMD) => {
                    this.$('#uploadTable').append(UploadEntryTemplate({info: respMD}));
                    this.$('#uploadQuestions').show();
                });
            });
        }, this).render();
    },
    _deleteFile: function (itemEntry) {
        var objectIdentifier = itemEntry.attributes.getNamedItem('key').nodeValue;
        if (objectIdentifier === 'github') {
            var subData = {'github': ''};
            restRequest({
                type: 'PUT',
                path: `folder/${this.parentId}/metadata`,
                contentType: 'application/json',
                data: JSON.stringify(subData),
                error: null
            }).done((respMD) => {
                this.$(itemEntry).remove();
            });
        } else {
            restRequest({
                type: 'DELETE',
                path: `item/${objectIdentifier}`,
                error: null
            }).done((respMD) => {
                this.$(itemEntry).remove();
            });
        }
    },

    _approveSubmission: function (subData) {
        restRequest({
            type: 'PUT',
            path: `journal/${this.parentId}/metadata`,
            contentType: 'application/json',
            data: JSON.stringify(subData),
            error: null
        }).done((respMD) => {
            restRequest({
                type: 'PUT',
                path: `journal/${this.parentId}/approve`,
                contentType: 'application/json',
                data: JSON.stringify(subData)
            }).done((respMD) => {
                router.navigate(`#plugins/journal/view/${this.parentId}`, {trigger: true});
            });
        });
    },
    _appendData: function (subData) {
        restRequest({
            type: 'PUT',
            path: `journal/${this.parentId}/metadata`,
            contentType: 'application/json',
            data: JSON.stringify(subData),
            error: null
        }).done((respMD) => {
            restRequest({
                type: 'PUT',
                path: `journal/${this.parentId}/finalize`,
                contentType: 'application/json'
            }).done((respMD) => {
                router.navigate(`#plugins/journal/view/${this.parentId}`, {trigger: true});
            });
        });
    },
    _checkForm: function (license) {
        if (license === 'Apache 2.0' && this.$('#acceptLicense').is(':checked')) {
            this.$('#acceptAttributionPolicy').show();
            this.$('#acceptAttributionPolicyLabel').show();
        } else {
            this.$('#acceptAttributionPolicy').hide();
            this.$('#acceptAttributionPolicyLabel').hide();
        }
        if (license === 'Other' && this.$('#acceptLicense').is(':checked')) {
            this.$('#otherLicenseInput').show();
            this.$('#otherLicenseInputLabel').show();
        } else {
            this.$('#otherLicenseInput').hide();
            this.$('#otherLicenseInputLabel').hide();
        }
    }
});

export default uploadView;
