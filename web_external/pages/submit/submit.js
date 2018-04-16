import View from 'girder/views/View';
import router from 'girder/router';
import events from 'girder/events';
import { getCurrentUser } from 'girder/auth';
import { restRequest } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import SubmitViewTemplate from './journal_submit.pug';
import SelectIssueTemplate from './journal_select_issue.pug';
import issueDetailsTemplate from './journal_issue_details.pug';
import SubmitAuthorEntryTemplate from './journal_author_entry.pug';
import SubmitTagEntryTemplate from './journal_tag_entry.pug';

var SubmitView = View.extend({
    events: {
        'click .issueGen': function (event) {
            this.parentID = event.currentTarget.target;
            this.render(event.currentTarget.target, 2);
        },
        'submit #submitForm': function (event) {
            event.preventDefault();
            if (this.newSub || this.newRevision) {
                this._createSubmission({
                    'subName': this.$('#titleEntry').val().trim(),
                    'subDescription': this.$('#abstractEntry').val().trim()
                });
            }
        },
        'click #authorAdd': function (event) {
            console.log(event);
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
        },
        'click #showDetails': async function (event) {
            this.targetIssueID = event.currentTarget.target;
            const resp = await restRequest({
                type: 'GET',
                path: `folder/${this.targetIssueID}`
            });
            this.$('#issueDetails').append(issueDetailsTemplate({info: resp}));
        },
        'click #closeDetails': function (event) {
            this.$(event.currentTarget.parentElement).remove();
        }
    },
    initialize: async function (id) {
        this.user = getCurrentUser();
        if (id.id === 'new') {
            this.newSub = true;
            const resp = await restRequest({
                type: 'GET',
                path: 'journal/setting',
                data: {
                    list: JSON.stringify([
                        'tech_journal.default_journal'
                    ])
                }
            });

            const jrnResp = await restRequest({
                type: 'GET',
                path: `journal/${resp['tech_journal.default_journal']}/openissues`
            });
            this.render(jrnResp, 1);
        } else {
            this.newRevision = id.NR;
            this.approval = id.approval;
            this.id = id.id;
            this.newSub = false;
            this.render(id.id, 2);
        }
    },
    render: async function (subResp, state) {
        if (Array.isArray(subResp)) {
            subResp.forEach(function (obj) {
                obj.daysLeft = obj.daysLeft = Math.round((new Date(obj.meta.paperDue).valueOf() -
                    Date.now()) / 1000 / 60 / 60 / 24);
            });
        }
        this.$el.html(SelectIssueTemplate({info: subResp}));
        var issueInfo;
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this
        });
        if (state === 1) {
            return this;
        } else {
            this.itemId = subResp;
            const resp = await restRequest({
                type: 'GET',
                path: `folder/${this.itemId}`
            });

            if (this.newSub) {
                issueInfo = {};
            } else {
                issueInfo = resp;
            }
            if (this.newRevision) {
                issueInfo.NR = this.newRevision;
                this.parentID = issueInfo.parentID;
            }
            this.$('#pageContent').html(SubmitViewTemplate({ info: { info: {}, parInfo: {} } }));
            return this;
        }
    },
    _createSubmission: async function (inData) {
        var authors = [];
        var comments = [];
        var hasPermission = $('.subPermission:checked').val();
        var corpCLAVal = $('.CLAPermission:checked').val();
        if (hasPermission === 'No') {
            events.trigger('g:alert', {
                icon: 'ok',
                text: 'You must have permission to submit files in order to proceed',
                type: 'warning',
                timeout: 4000
            });
            return;
        }
        this.$('#authors .list-item').each(function (index, val) {
            var authorName = '';
            $(val).children('input').each(function (index2, val2) {
                if (val2.value !== '') authorName += ` ${val2.value}`;
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
            'tags': tags,
            'comments': comments,
            'permission': hasPermission,
            'CorpCLA': corpCLAVal,
            'targetIssue': this.itemId
        };
        if (this.newRevision) {
            subData.revisionNotes = this.$('#revisionEntry').val().trim();
            subData.previousRevision = this.itemId;
        }
        const resp = await restRequest({
            type: 'POST',
            path: 'folder',
            data: {
                parentId: this.user.id,
                parentType: 'user',
                name: inData.subName,
                description: inData.subDescription
            },
            error: null
        });
        this._findUploadTarget(resp._id, subData);
    },
    _findUploadTarget: async function (parentId, subData) {
        var targetUrl = '#plugins/journal/submission/';
        // if new submission, generate first "revision" folder inside of generated folder
        const resp = await restRequest({
            type: 'POST',
            path: 'folder',
            data: {
                parentId: parentId,
                parentType: 'folder',
                name: 'Revision 1'
            },
            error: null
        });

        const respMD = await restRequest({
            type: 'PUT',
            path: `journal/${resp._id}/metadata`,
            contentType: 'application/json',
            data: JSON.stringify(subData),
            error: null
        });
        router.navigate(`${targetUrl}${resp._id}/upload/new`, {trigger: true});
    }
});

export default SubmitView;
