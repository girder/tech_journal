import $ from 'jquery';
import View from 'girder/views/View';
import router from 'girder/router';
import events from 'girder/events';
import { getCurrentUser } from 'girder/auth';
import { restRequest, apiRoot } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import SubmissionViewTemplate from './journal_view.pug';

var submissionView = View.extend({

    events: {
        'click #downloadLink': function (event) {
            router.navigate(`#plugins/journal/view/${this.displayId}/download`, {trigger: true});
        },
        'click #manageReviews': function (event) {
            events.trigger('g:alert', {
                icon: 'ok',
                text: 'Reviews are not available yet.',
                type: 'warning',
                timeout: 4000
            });
        },
        'click #deleteRevision': function (event) {
            var confirmRes = confirm('There is no way to un-delete a revision.  Are you sure you want to proceed?'); // eslint-disable-line no-alert
            var displayedObj = this.displayId;
            if (confirmRes) {
                this.otherRevisions = this.otherRevisions.filter(function (obj) {
                    return obj['_id'] !== displayedObj;
                });
                restRequest({
                    type: 'DELETE',
                    url: `journal/${this.displayId}`
                }).done((resp) => {
                    router.navigate(`#plugins/journal/view/${this.otherRevisions.slice(-1).pop()['_id']}`, {trigger: true});
                });
            }
        },
        'click #deleteSubmission': function (event) {
            var confirmRes = confirm('There is no way to un-delete a submission.  Are you sure you want to proceed?'); // eslint-disable-line no-alert
            if (confirmRes) {
                this.deleteSubmission();
            }
        },
        'click #addCommentButton': function (event) {
            event.preventDefault();
            var commentInfo = {
                'name': this.currentUser.name(),
                'text': this.$('#commentText').val().trim(),
                'index': String(this.currentComments.length)
            };
            this.currentComments.push(commentInfo);
            this.updateComments('send');
        },
        'click .deleteCommentLink': function (event) {
            event.preventDefault();
            var targetIndex = this.$(event.target).attr('val');
            this.currentComments.forEach(function (d) {
                if (String(d.index) === targetIndex) {
                    d.name = '';
                    d.text = '';
                }
            });
            this.updateComments('no');
        },
        'click .clickable-row': function (event) {
            router.navigate(`plugins/journal/view/${event.target.parentNode.dataset.href}`, {trigger: true});
        },
        'keyup #commentText': function (event) {
            var charsLeft = 1200 - this.$('#commentText').val().length;
            $('.commentLengthRemaining').text(`${charsLeft} characters remaining.`);
        },

        'change #revisionSelector': function (event) {
            router.navigate(`#plugins/journal/view/${this.$('.revisionOption:selected').val()}`,
                {trigger: true});
        },
        'click .exportCit': function (event) {
            this.$('.citationDisplay').text('');
            restRequest({
                type: 'GET',
                url: `journal/${this.displayId}/citation/${this.$('.citOption:selected').val()}`
            }).done((citationText) => {
                this.$('.citationDisplay').show();
                this.$('.citationDisplay').text(citationText);
            });
        }
    },
    initialize: function (subId) {
        this.displayId = subId.id;
        this.currentUser = getCurrentUser();
        restRequest({
            type: 'GET',
            url: `journal/${this.displayId}/details`
        }).done((totalDetails) => {
            this.render(totalDetails);
        }); // End getting of parentData
    },
    render: function (totalDetails) {
        totalDetails[1].meta.comments.sort(function (a, b) {
            if (a.index > b.index) return -1;
            if (a.index < b.index) return 1;
            if (a.index === b.index) return 0;
        });
        this.currentComments = totalDetails[1].meta.comments;
        this.parentId = totalDetails[1]._id;
        this.otherRevisions = totalDetails[2];
        this.currentRevision = totalDetails[0];
        restRequest({
            type: 'GET',
            url: `journal/${totalDetails[0]._id}/logo`
        }).done((resp) => {
            var logoURL = '';
            if (resp.length > 0) {
                logoURL = `${apiRoot}/${resp}`;
            }
            this.$el.html(SubmissionViewTemplate({ user: this.currentUser, info: { 'revision': totalDetails[0], 'parent': totalDetails[1], 'otherRevisions': totalDetails[2] }, logo: logoURL }));
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$el,
                parentView: this
            });
            this.$(`.revisionOption[value=${totalDetails[0]._id}]`).prop('selected', true);
            return this;
        });
    },
    updateComments: function (send) {
        restRequest({
            type: 'PUT',
            url: `journal/${this.displayId}/comments?sendEmail=${send}`,
            contentType: 'application/json',
            data: JSON.stringify({'comments': this.currentComments}),
            error: null
        }).done((resp) => {
            window.location.reload();
        });
    },
    deleteSubmission: function () {
        restRequest({
            type: 'DELETE',
            url: `journal/${this.parentId}`
        }).done((resp) => {
            router.navigate(``, {trigger: true});
        });
    }
});

export default submissionView;
