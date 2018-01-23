import View from 'girder/views/View';
import router from 'girder/router';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import editIssueTemplate from '../templates/journal_edit_issue.pug';

var EditIssueView = View.extend({

    events: {
        'submit #issueForm': function (event) {
            event.preventDefault();
            if (event.originalEvent.explicitOriginalTarget.defaultValue === 'Create >>') {
                var values = {issueName: this.$('#issueName')[0].value,
                    issueDescription: this.$('#issueDescription')[0].value,
                    'paperDue': $('.datepicker')[0].value,
                    'decision': $('.datepicker')[1].value,
                    'publication': $('.datepicker')[2].value,
                    '__issue__': true
                };
                if (this.update) {
                    this._updateIssue(values);
                } else {
                    this._createIssue(values);
                }
            }
            router.navigate('#plugins/journal/admin', {trigger: true});
        }
    },
    initialize: function (parentId) {
        if (parentId.type === 'edit') {
            this.parentId = parentId.id;
            this.parentType = 'folder';
            this.update = true;
            this.requestType = 'PUT';
            this._getCurrentInfo(parentId);
        } else {
            this.parentId = parentId.id;
            this.parentType = 'collection';
            this.requestType = 'POST';
            this.update = false;
            this.render(parentId);
        }
    },
    render: function (parentId) {
        this.$el.html(editIssueTemplate({info: parentId}));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this
        });
        return this;
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
            var decision = new Date(issueData.decision);
            var publication = new Date(issueData.publication);
            var issueDateData = {'paperDue': paperDue,
                'decision': decision,
                'publication': publication,
                '__issue__': true
            };
            restRequest({
                type: 'PUT',
                contentType: 'application/json',
                url: `folder/${jrnResp._id}/metadata`,
                data: JSON.stringify(issueDateData)
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
            var decision = new Date(issueData.decision);
            var publication = new Date(issueData.publication);
            var issueDateData = {'paperDue': paperDue,
                'decision': decision,
                'publication': publication,
                '__issue__': true
            };
            restRequest({
                type: 'PUT',
                contentType: 'application/json',
                url: `folder/${jrnResp._id}/metadata`,
                data: JSON.stringify(issueDateData)
            }).done((metaResp) => {

            });
        });
    },
    _getCurrentInfo: function (journalData) {
        restRequest({
            type: 'GET',
            url: `folder/${journalData.id}`
        }).done((jrnInfo) => {
            var paperDueTmp = new Date(jrnInfo.meta.paperDue);
            var publicationTmp = new Date(jrnInfo.meta.publication);
            var decisionTmp = new Date(jrnInfo.meta.decision);
            jrnInfo.meta.paperDue = paperDueTmp.toJSON().slice(0, 10);
            jrnInfo.meta.publication = publicationTmp.toJSON().slice(0, 10);
            jrnInfo.meta.decision = decisionTmp.toJSON().slice(0, 10);
            this.render(jrnInfo);
        });
    }
});

export default EditIssueView;
