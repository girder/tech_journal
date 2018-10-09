import View from 'girder/views/View';
import router from 'girder/router';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import editIssueTemplate from '../templates/journal_edit_issue.pug';

var EditIssueView = View.extend({

    events: {
        'submit #issueForm': function (event) {
            event.preventDefault();
            if ((event.originalEvent.explicitOriginalTarget.defaultValue === 'Create >>') ||
               (event.originalEvent.explicitOriginalTarget.defaultValue === 'Update >>')) {
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
            }
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
            type: 'GET',
            url: 'journal/licenses'
        }).done((licenseInfo) => {
            this.$el.html(editIssueTemplate({info: parentId, licenses: licenseInfo}));
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$el,
                parentView: this
            });
            return this;
        });
    },
    _updateIssue: function (issueData) {
        restRequest({
            type: 'PUT',
            url: `folder/${this.parentId}`,
            data: {
                name: issueData.issueName,
                description: issueData.issueDescription
            }
        }).done((jrnResp) => {
            var paperDue = new Date(issueData.paperDue);
            issueData.paperDue = paperDue;
            restRequest({
                type: 'PUT',
                contentType: 'application/json',
                url: `folder/${jrnResp._id}/metadata`,
                data: JSON.stringify(issueData)
            }).done((metaResp) => {
            });
        });
    },
    _createIssue: function (issueData) {
        restRequest({
            type: 'POST',
            url: 'folder',
            data: {
                parentId: this.parentId,
                parentType: this.parentType,
                name: issueData.issueName,
                description: issueData.issueDescription
            }
        }).done((jrnResp) => {
            var paperDue = new Date(issueData.paperDue);
            issueData.paperDue = paperDue;
            restRequest({
                type: 'PUT',
                contentType: 'application/json',
                url: `folder/${jrnResp._id}/metadata`,
                data: JSON.stringify(issueData)
            }).done((metaResp) => {
                restRequest({
                    type: 'POST',
                    url: `group/`,
                    data: {
                        'name': `${issueData.issueName}_editors`,
                        'description': `Editors for the issue with id of ${jrnResp._id}`,
                        'public': false
                    }
                }).done((grpRep) => {
                });
            });
        });
    },
    _getCurrentInfo: function (journalData) {
        restRequest({
            type: 'GET',
            url: `folder/${journalData.id}`
        }).done((jrnInfo) => {
            var paperDueTmp = new Date(jrnInfo.meta.paperDue);
            jrnInfo.meta.paperDue = paperDueTmp.toJSON().slice(0, 10);
            this.render(jrnInfo);
        });
    }
});

export default EditIssueView;
