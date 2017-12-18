import _ from 'underscore';

import View from 'girder/views/View';
import router from 'girder/router';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import editIssueTemplate from '../templates/journal_edit_issue.jade';

var EditIssueView = View.extend({

    events: {
        'submit #issueForm': function (event) {
            event.preventDefault();
            if (event.originalEvent.explicitOriginalTarget.defaultValue === 'Create >>') {
                var values = {issueName: this.$('#issueName')[0].value,
                    issueDescription: this.$('#issueDescription')[0].value
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
        MenuBarView({ el: this.$el, parentView: this });
        return this;
    },
    _updateIssue: function (issueData) {
        restRequest({
            type: 'PUT',
            path: 'folder/' + this.parentId,
            data: {
                name: issueData.issueName,
                description: issueData.issueDescription
            }
        }).done(_.bind(function (jrnResp) {

        }, this));
    },
    _createIssue: function (issueData) {
        restRequest({
            type: 'POST',
            path: 'folder',
            data: {
                parentId: this.parentId,
                parentType: this.parentType,
                name: issueData.issueName,
                description: issueData.issueDescription
            }
        }).done(_.bind(function (jrnResp) {

        }, this));
    },
    _getCurrentInfo: function (journalData) {
        restRequest({
            type: 'GET',
            path: 'folder/' + journalData.id
        }).done(_.bind(function (jrnInfo) {
            this.render(jrnInfo);
        }, this));
    }
});

export default EditIssueView;
