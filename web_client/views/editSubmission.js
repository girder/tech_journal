import View from 'girder/views/View';
import router from 'girder/router';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import SubmitViewTemplate from '../templates/journal_submit.jade';
import SubmitAuthorEntryTemplate from '../templates/journal_author_entry.pug';
import SubmitTagEntryTemplate from '../templates/journal_tag_entry.pug';

var editView = View.extend({
    events: {
        'click .issueGen': function (event) {
            this.parentID = event.currentTarget.target;
            this.render(event.currentTarget.target);
        },
        'submit #submitForm': function (event) {
            event.preventDefault();
            restRequest({
                type: 'PUT',
                path: `folder/${this.parentId}`,
                data: {
                    parentType: 'folder',
                    name: this.$('#titleEntry').val().trim(),
                    description: this.$('#abstractEntry').val().trim()
                },
                error: null
            }).done((resp) => {
                if (this.newRevision) {
                    this._generateNewRevision();
                } else {
                    this._updateSubmission(this.itemId);
                    router.navigate(`#plugins/journal/submission/${this.itemId}/upload/edit`,
                        {trigger: true});
                }
            });
        },
        'click #authorAdd': function (event) {
            event.preventDefault();
            this.$('#authors').append(SubmitAuthorEntryTemplate({info: {info: '1'}}));
        },
        'click #removeAuthor': function (event) {
            this.$(event.currentTarget.parentElement).remove();
        },
        'click #tagAdd': function (event) {
            event.preventDefault();
            this.$('#tags').append(SubmitTagEntryTemplate({info: {info: '1'}}));
        },
        'click #removeTag': function (event) {
            this.$(event.currentTarget.parentElement).remove();
        }
    },
    initialize: function (id) {
        this.newRevision = id.NR;
        this.newSub = false;
        this.render(id.id);
    },
    render: function (subResp) {
        this.itemId = subResp;
        restRequest({
            type: 'GET',
            path: `journal/${this.itemId}/details`
        }).done((resp) => {
            this.parentId = resp[1]._id;
            this.$el.html(SubmitViewTemplate({info: {info: resp[0], 'parInfo': resp[1], 'NR': this.newRevision}}));
            new MenuBarView({ el: this.$el, parentView: this, searchBoxVal: '' });
            $(`.subPermission[value=${resp[0].meta.permission}]`).prop('checked', 'checked');
            $(`.CLAPermission[value=${resp[0].meta.CorpCLA}]`).prop('checked', 'checked');
            return this;
        }); // End getting of OTJ Collection value setting
    },
    _captureSubmissionInformation() {
        var authors = [];
        this.$('#authors .list-item').each(function (index, val) {
            var authorName = '';
            $(val).children('input').each(function (index2, val2) {
                if (val2.value !== '') authorName += ' ' + val2.value;
            });
            if (authorName.length > 0) authors.push(authorName.trim());
        });
        var tags = [];
        this.$('#tags input').each(function (index, val) {
            tags.push(val.value.trim());
        });
        var subData = {
            'institution': this.$('#institutionEntry').val().trim(),
            'related': this.$('#relatedEntry').val().trim(),
            'type': this.$('#typeEntry').val().trim(),
            'copyright': this.$('#copyrightEntry').val().trim(),
            'grant': this.$('#grantEntry').val().trim(),
            'authors': authors,
            'tags': tags
        };
        return subData;
    },
    _generateNewRevision: function () {
        var targetUrl = '#plugins/journal/submission/';
        // if new submission, generate first "revision" folder inside of generated folder
        restRequest({
            type: 'GET',
            path: `folder/${this.parentId}/details`
        }).done((resp) => {
            restRequest({
                type: 'POST',
                path: 'folder',
                data: {
                    parentId: this.parentId,
                    parentType: 'folder',
                    name: 'Revision ' + ++resp.nFolders,
                    description: this.$('#revisionEntry').val().trim()
                },
                error: null
            }).done((resp) => {
                this._updateSubmission(resp._id);
                router.navigate(`${targetUrl}${resp._id}/upload/revision`, {trigger: true});
            });
        });
    },
    _updateSubmission: function (itemID) {
        restRequest({
            type: 'PUT',
            path: `journal/${itemID}/metadata`,
            contentType: 'application/json',
            data: JSON.stringify(this._captureSubmissionInformation()),
            error: null
        }).done((respMD) => {
        });
    }
});

export default editView;
