import $ from 'jquery';
import Accordion from 'accordion';
import View from '@girder/core/views/View';
import router from '@girder/core/router';
import events from '@girder/core/events';
import { restRequest } from '@girder/core/rest';

import MenuBarView from '../../views/menuBar.js';
import SubmitViewTemplate from './journal_submit.pug';
import SubmitAuthorEntryTemplate from './journal_author_entry.pug';
import SubmitTagEntryTemplate from './journal_tag_entry.pug';
import CategoryTemplate from '../home/home_categoryTemplate.pug';

var editView = View.extend({
    events: {
        'click .issueGen': function (event) {
            this.parentID = event.currentTarget.target;
            this.render(event.currentTarget.target);
        },
        'submit #submitForm': function (event) {
            event.preventDefault();
            var catCheck = this._checkCategories();
            if (catCheck) {
                restRequest({
                    method: 'PUT',
                    url: `folder/${this.parent._id}`,
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
                        if (this.$('#revisionTitle').length > 0) {
                            var revisionName = this.$('#revisionTitle').val().trim();
                        }
                        var revisionDescription = '';
                        if (this.$('#revisionEntry').length > 0) {
                            revisionDescription = this.$('#revisionEntry').val().trim();
                        }
                        restRequest({
                            method: 'PUT',
                            url: `folder/${this.itemId}`,
                            data: {
                                parentType: 'folder',
                                parentId: this.parent._id,
                                name: revisionName,
                                description: revisionDescription
                            },
                            error: null
                        }).done((resp) => {
                            this._updateSubmission(this.itemId);
                            router.navigate(`#submission/${this.itemId}/upload/edit`,
                                {trigger: true});
                        });
                    }
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
        }
    },
    initialize: function (id) {
        this.newRevision = id.NR;
        this.newSub = false;
        this.approve = id.approve;
        this.render(id.id);
    },
    render: function (subResp) {
        this.itemId = subResp;
        restRequest({
            method: 'GET',
            url: `journal/${this.itemId}/details`
        }).done((resp) => {
            this.parent = resp[1];
            var titleText = 'Edit current revision';
            if (this.newRevision) {
                titleText = 'Create revision';
            }
            if (this.approve) {
                titleText = 'Approve Submission';
            }
            this.$el.html(SubmitViewTemplate({info: {info: resp[0], 'parInfo': resp[1], 'NR': this.newRevision}, 'titleText': titleText}));
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$('#headerBar'),
                parentView: this
            });
            $(`.subPermission[value=${resp[0].meta.permission}]`).prop('checked', 'checked');
            $(`.CLAPermission[value=${resp[0].meta.CorpCLA}]`).prop('checked', 'checked');
            this.$('#journalLicense').hide();
            restRequest({
                method: 'GET',
                url: 'journal/categories?tag=categories'
            }).done((catResp) => {
                for (var key in catResp) {
                    this.$('#treeWrapper').html(this.$('#treeWrapper').html() + CategoryTemplate({'catName': catResp[key]['key'], 'values': catResp[key]['value']}));
                }
                for (var catIndx in resp[0].meta.categories) {
                    this.$(`.filterOption[val='${resp[0].meta.categories[catIndx]}']`).attr('checked', true);
                }
                this.$(`.typeOption[value=${resp[0].meta.type}]`).attr('selected', true);
                this._checkCategories();
                restRequest({
                    method: 'GET',
                    url: `journal/disclaimers?tag=disclaimer`
                }).done((disclaimerResp) => {
                    for (var disc in disclaimerResp) {
                        var selected = '';
                        if (disc === resp[0].meta.disclaimer) {
                            selected = 'selected="selected"';
                        }
                        this.$('#disclaimer').append('<option ' + selected + '>' + disc + '</option>');
                    }
                    var el = document.querySelector('#treeWrapper');
                    // eslint-disable-next-line no-new
                    new Accordion.Accordion(el, {'noTransforms': true});
                    this.$('.treeEntry').attr('style', 'height:34px;');
                    return this;
                });
            });
        }); // End getting of OTJ Collection value setting
    },
    _checkCategories() {
        if (this.$('.filterOption:checked').length === 0) {
            events.trigger('g:alert', {
                icon: 'fail',
                text: 'Please select one or more category',
                type: 'danger',
                timeout: 4000
            });
            return false;
        }
        return true;
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
        var categories = [];
        this.$('.filterOption').each(function (index, val) {
            if (val.checked) {
                categories.push(val.attributes['val'].value);
            }
        });
        var subData = {
            'institution': this.$('#institutionEntry').val().trim(),
            'related': this.$('#relatedEntry').val().trim(),
            'type': this.$('#typeEntry').val().trim(),
            'copyright': this.$('#copyrightEntry').val().trim(),
            'grant': this.$('#grantEntry').val().trim(),
            'permission': this.$('.subPermission:checked').val(),
            'CorpCLA': this.$('.CLAPermission:checked').val(),
            'authors': authors,
            'tags': tags,
            'categories': categories,
            'disclaimer': this.$('#disclaimer').val().trim()
        };
        return subData;
    },
    _generateNewRevision: function () {
        var revisionName = this.$('#revisionTitle').val().trim();
        var targetUrl = '#submission/';
        restRequest({
            method: 'GET',
            url: `folder/${this.parent._id}/details`
        }).done((resp) => {
            if (revisionName === '') {
                revisionName = 'Revision ' + ++resp.nFolders;
            }

            restRequest({
                method: 'POST',
                url: `journal/submission/${this.parent.meta.submissionNumber}/number`
            }).done((newRevisionNum) => {
                restRequest({
                    method: 'POST',
                    url: 'folder',
                    data: {
                        parentId: this.parent._id,
                        parentType: 'folder',
                        name: revisionName,
                        description: this.$('#revisionEntry').val().trim()
                    },
                    error: null
                }).done((resp) => {
                    let submissionInfo = this._captureSubmissionInformation();
                    submissionInfo.revisionNumber = JSON.stringify(newRevisionNum);

                    this._updateSubmission(resp._id, submissionInfo);
                    router.navigate(`${targetUrl}${resp._id}/upload/revision`, {trigger: true});
                });
            });
        });
    },
    _updateSubmission: function (itemID, submissionInfo) {
        restRequest({
            method: 'PUT',
            url: `journal/${itemID}/metadata`,
            contentType: 'application/json',
            data: JSON.stringify(submissionInfo),
            error: null
        }).done((respMD) => {
        });
    }
});

export default editView;
