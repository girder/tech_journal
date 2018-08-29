import $ from 'jquery';
import View from 'girder/views/View';
import router from 'girder/router';
// import events from 'girder/events';
import { restRequest } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import SubmitViewTemplate from './journal_submit.pug';
import SubmitAuthorEntryTemplate from './journal_author_entry.pug';
import SubmitTagEntryTemplate from './journal_tag_entry.pug';
import CategoryTemplate from '../home/home_categoryTemplate.pug';

var editView = View.extend({
    events: {
        'click .filterOption': function (event) {
            if (this.$('.filterOption:checked').length > 0) {
                this.$('.filterOption').each(function (index, val) {
                    val.required = false;
                });
            } else {
                this.$('.filterOption').each(function (index, val) {
                    val.required = true;
                });
            }
        },
        'click .issueGen': function (event) {
            this.parentID = event.currentTarget.target;
            this.render(event.currentTarget.target);
        },
        'submit #submitForm': function (event) {
            event.preventDefault();
            restRequest({
                type: 'PUT',
                url: `folder/${this.parentId}`,
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
                        type: 'PUT',
                        url: `folder/${this.itemId}`,
                        data: {
                            parentType: 'folder',
                            parentId: this.parentId,
                            name: revisionName,
                            description: revisionDescription
                        },
                        error: null
                    }).done((resp) => {
                        this._updateSubmission(this.itemId);
                        router.navigate(`#plugins/journal/submission/${this.itemId}/upload/edit`,
                            {trigger: true});
                    });
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
            url: `journal/${this.itemId}/details`
        }).done((resp) => {
            this.parentId = resp[1]._id;
            this.$el.html(SubmitViewTemplate({info: {info: resp[0], 'parInfo': resp[1], 'NR': this.newRevision}, 'titleText': 'Edit Submission'}));
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$el,
                parentView: this,
                searchBoxVal: ''
            });
            $(`.subPermission[value=${resp[0].meta.permission}]`).prop('checked', 'checked');
            $(`.CLAPermission[value=${resp[0].meta.CorpCLA}]`).prop('checked', 'checked');
            this.$('#journalLicense').hide();
            restRequest({
                type: 'GET',
                url: 'journal/categories?tag=categories'
            }).done((catResp) => {
                for (var key in catResp) {
                    this.$('#treeWrapper').html(this.$('#treeWrapper').html() + CategoryTemplate({'catName': catResp[key]['key'], 'values': catResp[key]['value']}));
                }
                for (var catIndx in resp[0].meta.categories) {
                    this.$(`.filterOption[val=${resp[0].meta.categories[catIndx]}]`).attr('checked', true);
                }
                restRequest({
                    type: 'GET',
                    url: `journal/disclaimers?tag=disclaimer`
                }).done((disclaimerResp) => {
                    for (var disc in disclaimerResp) {
                        var selected = '';
                        if (disc === resp[0].meta.disclaimer) {
                            selected = 'selected="selected"';
                        }
                        this.$('#disclaimer').append('<option ' + selected + '>' + disc + '</option>');
                    }
                    return this;
                });
            });
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
            'authors': authors,
            'tags': tags,
            'categories': categories,
            'disclaimer': this.$('#disclaimer').val().trim()
        };
        return subData;
    },
    _generateNewRevision: function () {
        var revisionName = this.$('#revisionTitle').val().trim();
        var targetUrl = '#plugins/journal/submission/';
        restRequest({
            type: 'GET',
            path: `folder/${this.parentId}/details`
        }).done((resp) => {
            if (revisionName === '') {
                revisionName = 'Revision ' + ++resp.nFolders;
            }
            restRequest({
                type: 'POST',
                url: 'folder',
                data: {
                    parentId: this.parentId,
                    parentType: 'folder',
                    name: revisionName,
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
            url: `journal/${itemID}/metadata`,
            contentType: 'application/json',
            data: JSON.stringify(this._captureSubmissionInformation()),
            error: null
        }).done((respMD) => {
        });
    }
});

export default editView;
