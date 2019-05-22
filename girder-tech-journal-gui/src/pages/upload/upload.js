import View from '@girder/core/views/View';
import router from '@girder/core/router';
import events from '@girder/core/events';
import FolderModel from '@girder/core/models/FolderModel';
import UploadWidget from '@girder/core/views/widgets/UploadWidget';
import { getCurrentUser } from '@girder/core/auth';
import { handleClose } from '@girder/core/dialog';
import { restRequest, apiRoot } from '@girder/core/rest';

import MenuBarView from '../../views/menuBar.js';
import UploadViewTemplate from './journal_upload.pug';
import UploadEntryTemplate from './journal_upload_entry.pug';

var uploadView = View.extend({
    events: {
        'submit #curateduploadForm': function (event) {
            event.preventDefault();
            var testingCode = this.$('td:contains("TESTING_")').length;
            var sourceCode = (this.$('td:contains("SOURCECODE")').length - testingCode) + this.$('td:contains("GITHUB")').length;

            this._appendData({
                'has_test_code': testingCode > 0,
                'has_code': sourceCode > 0,
                'source-license': this.$('#hiddenSourceLicense').val().trim(),
                'source-license-text': this.$('#hiddenSourceLicenseText').val().trim(),
                'attribution-policy': this.$('#hiddenAttributionPolicy').val().trim(),
                'notification-email': this.$('#hiddenSendNotificationEmail').val().trim() === '1'
            });
        },
        'submit #approvedUploadForm': function (event) {
            event.preventDefault();
            var testingCode = this.$('td:contains("TESTING_")').length;
            var sourceCode = (this.$('td:contains("SOURCECODE")').length - testingCode) + this.$('td:contains("GITHUB")').length;
            this._approveSubmission({
                'has_test_code': testingCode > 0,
                'has_code': sourceCode > 0,
                'source-license': this.$('#hiddenSourceLicense').val().trim(),
                'source-license-text': this.$('#hiddenSourceLicenseText').val().trim(),
                'attribution-policy': this.$('#hiddenAttributionPolicy').val().trim(),
                'notification-email': this.$('#hiddenSendNotificationEmail').val().trim() === '1',
                'revisionPhase': 'peer'
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
                method: 'PUT',
                url: `journal/${this.parentId}/metadata`,
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
                this.$('#uploadTable').append(UploadEntryTemplate({info: {'name': subData.github, '_id': 'github', 'meta': {'type': 'GITHUB'}}}));
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
            this._checkForm(license);
            var acceptAttributionPolicyIsSelected = $('#acceptAttributionPolicy').is(':visible') && $('#acceptAttributionPolicy').is(':checked');
            this.$('#hiddenAttributionPolicy').attr('value', acceptAttributionPolicyIsSelected ? 1 : 0);
            this.submitCheck();
        },

        'change #licenseChoice': function (event) {
            var license = this.$('#licenseChoice').val();
            this.$('#hiddenSourceLicense').attr('value', license);
            this._checkForm(license);
            var acceptAttributionPolicyIsSelected = this.$('#acceptAttributionPolicy').is(':visible') && this.$('#acceptAttributionPolicy').is(':checked');
            this.$('#hiddenAttributionPolicy').attr('value', acceptAttributionPolicyIsSelected ? 1 : 0);
            this.submitCheck();
        },

        'change #sendNotificationEmail': function (event) {
            var sendNotificationEmailIsSelected = $('#sendNotificationEmail').is(':visible') && $('#sendNotificationEmail').is(':checked');
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
            method: 'GET',
            url: `journal/${this.parentId}/details`
        }).done((resp) => {
            this.curRevision = resp[0];
            var handleText = `${window.location.origin}${window.location.pathname}#view/${resp[1].meta.submissionNumber}/${resp[0].meta.revisionNumber}`;
            this.render(handleText);
            restRequest({
                method: 'GET',
                url: `item?folderId=${this.parentId}`
            }).done((itemResp) => {
                for (var index in itemResp) {
                    this.$('#uploadTable').append(UploadEntryTemplate({info: itemResp[index], 'root': apiRoot}));
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
    render: function (handleText) {
        this.$el.html(UploadViewTemplate({handleText: handleText, user: getCurrentUser(), newRevision: this.newRevision}));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$('#headerBar'),
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
            ) ||
            !this.$('#uploadTable tr').length;

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
            var fileID = retInfo.files[0].id;
            restRequest({
                method: 'GET',
                url: `file/${fileID}`
            }).done((fileInfo) => {
                restRequest({
                    method: 'PUT',
                    url: `item/${fileInfo['itemId']}/metadata`,
                    contentType: 'application/json',
                    data: JSON.stringify(subData),
                    error: null
                }).done((respMD) => {
                    this.$('#uploadTable').append(UploadEntryTemplate({info: respMD, 'root': apiRoot}));
                    this.$('#uploadQuestions').show();
                    this.submitCheck();
                });
            });
        }, this).render();
    },
    _deleteFile: function (itemEntry) {
        var objectIdentifier = itemEntry.attributes.getNamedItem('key').nodeValue;
        if (objectIdentifier === 'github') {
            var subData = {'github': ''};
            restRequest({
                method: 'PUT',
                url: `folder/${this.parentId}/metadata`,
                contentType: 'application/json',
                data: JSON.stringify(subData),
                error: null
            }).done((respMD) => {
                this.$(itemEntry).remove();
            });
        } else {
            restRequest({
                method: 'DELETE',
                url: `item/${objectIdentifier}`,
                error: null
            }).done((respMD) => {
                this.$(itemEntry).remove();
                this.submitCheck();
            });
        }
    },

    _sendSubmission: function (subData, mode) {
        restRequest({
            method: 'PUT',
            url: `journal/${this.parentId}/metadata`,
            contentType: 'application/json',
            data: JSON.stringify(subData),
            error: null
        }).done((respMD) => {
            restRequest({
                method: 'PUT',
                url: `journal/${this.parentId}/${mode}`,
                contentType: 'application/json',
                data: JSON.stringify(subData)
            }).done((respMD) => {
                restRequest({
                    method: 'GET',
                    url: `folder/${this.parentId}`
                }).done((folder) => {
                    restRequest({
                        method: 'GET',
                        url: `folder/${folder.parentId}`
                    }).done((parentFolder) => {
                        router.navigate(`#view/${parentFolder.meta.submissionNumber}/${folder.meta.revisionNumber}`, {trigger: true});
                    });
                });
            });
        });
    },

    _approveSubmission: function (subData) {
        this._sendSubmission(subData, 'approve');
    },
    _appendData: function (subData) {
        this._sendSubmission(subData, 'finalize');
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
