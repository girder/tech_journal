import $ from 'jquery';
import View from '@girder/core/views/View';
import router from '@girder/core/router';
import events from '@girder/core/events';
import { getCurrentUser } from '@girder/core/auth';
import { restRequest } from '@girder/core/rest';

import MenuBarView from '../../views/menuBar.js';
import SubmitViewTemplate from './journal_submit.pug';
import SelectIssueTemplate from './journal_select_issue.pug';
import issueDetailsTemplate from './journal_issue_details.pug';
import SubmitAuthorEntryTemplate from './journal_author_entry.pug';
import SubmitTagEntryTemplate from './journal_tag_entry.pug';
import CategoryTemplate from '../home/home_categoryTemplate.pug';

var SubmitView = View.extend({
    events: {
        'click .disclaimerRad': function (event) {
            this.$('.viewMain').hide();
            var disclaimerAgree = $('.disclaimerRad:checked').val();
            if (disclaimerAgree === 'agree') {
                this.$('.viewMain').show();
            }
        },
        'click .issueGen': function (event) {
            this.parentID = event.currentTarget.target;
            this.render(event.currentTarget.target, 2);
        },
        'submit #submitForm': function (event) {
            event.preventDefault();
            var catCheck = this._checkCategories();
            if ((this.newSub || this.newRevision) && catCheck) {
                this._createSubmission({
                    'subName': this.$('#titleEntry').val().trim(),
                    'subDescription': this.$('#abstractEntry').val().trim()
                });
            }
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
        },
        'click #showDetails': function (event) {
            this.targetIssueID = event.currentTarget.target;
            restRequest({
                method: 'GET',
                url: `folder/${this.targetIssueID}`
            }).done((resp) => {
                this.$('#issueDetails').append(issueDetailsTemplate({info: resp}));
            });
        },
        'click #closeDetails': function (event) {
            this.$(event.currentTarget.parentElement).remove();
        }
    },
    initialize: function (id) {
        this.user = getCurrentUser();
        if (id.id === 'new') {
            this.newSub = true;
            restRequest({
                method: 'GET',
                url: 'journal/setting',
                data: {
                    list: JSON.stringify([
                        'tech_journal.default_journal'
                    ])
                }
            }).done((resp) => {
                restRequest({
                    method: 'GET',
                    url: `collection/${resp['tech_journal.default_journal']}`
                }).done((parResp) => {
                    restRequest({
                        method: 'GET',
                        url: `journal/${resp['tech_journal.default_journal']}/openissues`
                    }).done((jrnResp) => {
                        jrnResp['parentName'] = parResp['name'];
                        this.render(jrnResp, 1);
                    });
                });
            }); // End getting of OTJ Collection value setting
        } else {
            this.newRevision = id.NR;
            this.approval = id.approval;
            this.id = id.id;
            this.newSub = false;
            this.render(id.id, 2);
        }
    },
    render: function (subResp, state) {
        if (Array.isArray(subResp)) {
            subResp.forEach(function (obj) {
                obj.daysLeft = Math.round((new Date(obj.meta.paperDue).valueOf() -
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
            restRequest({
                method: 'GET',
                url: `folder/${this.itemId}`
            }).done((resp) => {
                if (this.newSub) {
                    issueInfo = {};
                } else {
                    issueInfo = resp;
                }
                if (this.newRevision) {
                    issueInfo.NR = this.newRevision;
                    this.parentID = issueInfo.parentID;
                }
                this.$('#pageContent').html(SubmitViewTemplate({ 'info': { info: {}, parInfo: {} },
                    'disclaimer': 'You are licensing your work to OSEHRA Inc. under the Creative Commons Attribution License Version 3.0.',
                    'titleText': 'Create Publication'
                }));
                this.$('.viewMain').hide();
                restRequest({
                    method: 'GET',
                    url: 'journal/categories?tag=categories'
                }).done((resp) => {
                    for (var key in resp) {
                        this.$('#treeWrapper').html(this.$('#treeWrapper').html() + CategoryTemplate({'catName': resp[key]['key'], 'values': resp[key]['value']}));
                    }
                    restRequest({
                        method: 'GET',
                        url: `journal/disclaimers?tag=disclaimer`
                    }).done((disclaimerResp) => {
                        for (var disc in disclaimerResp) {
                            this.$('#disclaimer').append('<option>' + disc + '</option>');
                        }
                        return this;
                    });
                }); // End getting of OTJ Collection value setting
            }); // End getting of OTJ Collection value setting
        }
    },
    _createSubmission: function (inData) {
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
        var categories = [];
        this.$('.filterOption').each(function (index, val) {
            if (val.checked) {
                categories.push(val.attributes['val'].value);
            }
        });

        let newSubmissionNum;
        restRequest({
            method: 'POST',
            url: 'journal/submission/number'
        }).done((num) => {
            newSubmissionNum = num;

            restRequest({
                method: 'POST',
                url: `journal/submission/${newSubmissionNum}/number`
            }).done((newRevisionNum) => {
                var subData = {
                    'institution': this.$('#institutionEntry').val().trim(),
                    'related': this.$('#relatedEntry').val().trim(),
                    'type': this.$('#typeEntry').val().trim(),
                    'copyright': this.$('#copyrightEntry').val().trim(),
                    'grant': this.$('#grantEntry').val().trim(),
                    'authors': authors,
                    'tags': tags,
                    'categories': categories,
                    'comments': comments,
                    'permission': hasPermission,
                    'CorpCLA': corpCLAVal,
                    'targetIssue': this.itemId,
                    'disclaimer': this.$('#disclaimer').val().trim(),
                    'submissionNumber': `${newSubmissionNum}`,
                    'revisionNumber': `${newRevisionNum}`
                };
                if (this.newRevision) {
                    subData.revisionNotes = this.$('#revisionEntry').val().trim();
                    subData.previousRevision = this.itemId;
                }
                restRequest({
                    method: 'POST',
                    url: 'folder',
                    data: {
                        parentId: this.user.id,
                        parentType: 'user',
                        name: inData.subName,
                        description: inData.subDescription
                    },
                    error: null
                }).done((resp) => {
                    this._findUploadTarget(resp._id, subData);
                });
            });
        });
    },
    _checkCategories() {
        if (this.$('.filterOption:checked').length === 0) {
            events.trigger('g:alert', {
                icon: 'fail',
                text: 'Please select one or more categories',
                type: 'danger',
                timeout: 4000
            });
            return false;
        }
        return true;
    },
    _findUploadTarget: function (parentId, subData) {
        var targetUrl = '#plugins/journal/submission/';
        var revisionName = $('#revisionTitle').val().trim();
        if (revisionName === '') {
            revisionName = 'Revision 1';
        }
        // if new submission, generate first "revision" folder inside of generated folder
        restRequest({
            method: 'POST',
            url: 'folder',
            data: {
                parentId: parentId,
                parentType: 'folder',
                name: revisionName
            },
            error: null
        }).done((resp) => {
            restRequest({
                method: 'PUT',
                url: `journal/${resp._id}/metadata`,
                contentType: 'application/json',
                data: JSON.stringify(subData),
                error: null
            }).done((respMD) => {
                router.navigate(`${targetUrl}${resp._id}/upload/new`, {trigger: true});
            });
        });
    }
});

export default SubmitView;
