import View from '@girder/core/views/View';
import router from '@girder/core/router';
import { restRequest } from '@girder/core/rest';

import MenuBarView from './menuBar.js';
import editIssueTemplate from '../templates/journal_edit_issue.pug';

var EditIssueView = View.extend({

    events: {
        'click #dataFormSubmit': function (event) {
            this.publicIssue = this.$('#privateIssue').is(':checked') !== true;
            var values = {issueName: this.$('#issueName')[0].value,
                issueDescription: this.$('#issueDescription')[0].value,
                'paperDue': $('.datepicker')[0].value,
                'publisherLicense': this.$('#publishLicense').val(),
                'authorLicense': this.$('#authorLicense').val()
            };
            if (this.update) {
                this._updateIssue(values);
            } else {
                this._createIssue(values);
            }
            router.navigate('#plugins/journal/admin', {trigger: true});
        },
        'click #dataFormCancel': function (event) {
            router.navigate('#plugins/journal/admin', {trigger: true});
        },
        'change #licensemenu': function (event) {
            this.$('#publishLicense').val(event.currentTarget[event.currentTarget.selectedIndex].value);
        },
        'change #copyrightmenu': function (event) {
            this.$('#authorLicense').val(event.currentTarget[event.currentTarget.selectedIndex].value);
        }
    },
    initialize: function (parentId) {
        this.parentId = parentId.id;
        if (parentId.type === 'edit') {
            this.parentType = 'folder';
            this.update = true;
            this.requestType = 'PUT';
            this._getCurrentInfo(parentId);
        } else {
            this.parentType = 'collection';
            this.requestType = 'POST';
            this.update = false;
            this.render(parentId);
        }
    },
    render: function (parentId) {
        restRequest({
            method: 'GET',
            url: 'journal/licenses'
        }).done((licenseInfo) => {
            this.$el.html(editIssueTemplate({info: parentId, licenses: licenseInfo}));
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$('#headerBar'),
                parentView: this
            });
            this.$('#privateIssue').prop('checked', !parentId.public);
            return this;
        });
    },
    _updateIssue: function (issueData) {
        restRequest({
            method: 'PUT',
            url: `folder/${this.parentId}`,
            data: {
                name: issueData.issueName,
                description: issueData.issueDescription
            }
        }).done((jrnResp) => {
            var paperDue = new Date(issueData.paperDue);
            issueData.paperDue = paperDue;
            restRequest({
                method: 'PUT',
                contentType: 'application/json',
                url: `folder/${jrnResp._id}/metadata`,
                data: JSON.stringify(issueData)
            }).done((metaResp) => {
                this.checkPrivacy();
            });
        });
    },
    _createIssue: function (issueData) {
        restRequest({
            method: 'POST',
            url: 'folder',
            data: {
                parentId: this.parentId,
                parentType: this.parentType,
                name: issueData.issueName,
                description: issueData.issueDescription,
                public: this.publicIssue
            }
        }).done((jrnResp) => {
            this.parentId = jrnResp._id;
            restRequest({
                method: 'POST',
                url: 'folder',
                data: {
                    parentId: this.parentId,
                    parentType: 'folder',
                    name: 'Review Files',
                    description: 'A Folder to contain uploaded files which are added during reviews'
                }
            }).done((reviewUploadResp) => {
                var paperDue = new Date(issueData.paperDue);
                issueData.paperDue = paperDue;
                issueData.reviewUploadDir = reviewUploadResp['_id'];
                issueData['__issue__'] = true;
                restRequest({
                    method: 'PUT',
                    contentType: 'application/json',
                    url: `folder/${this.parentId}/metadata`,
                    data: JSON.stringify(issueData)
                }).done((metaResp) => {
                    restRequest({
                        method: 'POST',
                        url: `group/`,
                        data: {
                            'name': `${issueData.issueName}_editors`,
                            'description': `Editors for the issue with id of ${jrnResp._id}`,
                            'public': false
                        }
                    });
                });
            });
        });
    },
    checkPrivacy: function () {
        restRequest({
            method: 'PUT',
            url: `folder/${this.parentId}/access`,
            data: {
                access: JSON.stringify(this.accessInfo),
                public: this.publicIssue
            }
        });
    },
    _getCurrentInfo: function (journalData) {
        restRequest({
            method: 'GET',
            url: `folder/${journalData.id}`
        }).done((jrnInfo) => {
            restRequest({
                method: 'GET',
                url: `folder/${journalData.id}/access`
            }).done((jrnAccInfo) => {
                this.accessInfo = jrnAccInfo;
                var paperDueTmp = new Date(jrnInfo.meta.paperDue);
                jrnInfo.meta.paperDue = paperDueTmp.toJSON().slice(0, 10);
                this.render(jrnInfo);
            });
        });
    }
});

export default EditIssueView;
