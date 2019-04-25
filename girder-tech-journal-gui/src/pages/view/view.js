import $ from 'jquery';
import socialLikes from 'social-likes-next';
import 'social-likes-next/lib/social-likes_flat.css';

import View from '@girder/core/views/View';
import router from '@girder/core/router';
import { getCurrentUser } from '@girder/core/auth';
import { restRequest, apiRoot } from '@girder/core/rest';

import MenuBarView from '../../views/menuBar.js';
import SubmissionViewTemplate from './journal_view.pug';
import PeerReviewSummary from '../Common/journal_review_summary_peer.pug';
import FinalReviewSummary from '../Common/journal_review_summary_final.pug';

var submissionView = View.extend({

    events: {
        'click #downloadLink': function (event) {
            router.navigate(`#view/${this.revisionId}/download`, {trigger: true});
        },
        'click #deleteRevision': function (event) {
            var confirmRes = confirm('There is no way to un-delete a revision.  Are you sure you want to proceed?'); // eslint-disable-line no-alert
            var displayedObj = this.revisionId;
            if (confirmRes) {
                this.otherRevisions = this.otherRevisions.filter(function (obj) {
                    return obj['_id'] !== displayedObj;
                });
                restRequest({
                    method: 'DELETE',
                    url: `journal/${this.revisionId}`
                }).done((resp) => {
                    restRequest({
                        method: 'GET',
                        url: `folder/${this.otherRevisions.slice(-1).pop()['_id']}`
                    }).done((revision) => {
                        router.navigate(`#view/${this.submission.meta.submissionNumber}/${revision.meta.revisionNumber}`, {trigger: true});
                    });
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
            this.currentComments.forEach(function (data, index) {
                if (String(data.index) === targetIndex) {
                    this.currentComments.splice(index, 1);
                }
            }, this);
            this.updateComments('no');
        },
        'click .clickable-row': function (event) {
            router.navigate(`view/${event.target.parentNode.dataset.submission}/${event.target.parentNode.dataset.href}`, {trigger: true});
        },
        'click #showHidden': function (event) {
            event.preventDefault();
            this.$('#reviewDisplay').find('.peer').show();
            this.$('#showHidden').hide();
        },
        'keyup #commentText': function (event) {
            var charsLeft = 1200 - this.$('#commentText').val().length;
            $('.commentLengthRemaining').text(`${charsLeft} characters remaining.`);
        },
        'click .exportCit': function (event) {
            this.$('.citationDisplay').text('');
            restRequest({
                method: 'GET',
                url: `journal/${this.revisionId}/citation/${this.$('.citOption:selected').val()}`
            }).done((citationText) => {
                this.$('.citationDisplay').show();
                this.$('.citationDisplay').text(citationText);
            });
        }
    },
    initialize: function (subId) {
        this.displayId = subId.id;
        this.revisionId = subId.revId;

        let revisions;

        this.currentUser = getCurrentUser();
        restRequest({
            method: 'GET',
            url: `journal/submission/${this.displayId}/revision`
        }).done((revisionsResp) => {
            revisions = revisionsResp;
            restRequest({
                method: 'GET',
                url: `journal/submission/${this.displayId}`
            }).done((submission) => {
                if (!this.revisionId) {
                    this.render(revisions[revisions.length - 1], submission, revisions);
                } else {
                    const revision = revisions.find((d) => d._id === this.revisionId);
                    this.render(revision, submission, revisions);
                }
            });
        }); // End getting of parentData
    },
    render: function (currentRev, submission, otherRevs) {
        this.submission = submission;
        this.revisionId = currentRev._id;

        restRequest({
            method: 'GET',
            url: `journal/${this.revisionId}/details`
        });
        var urlLink = `${window.location.origin}${window.location.pathname}#view/${submission.meta.submissionNumber}/${currentRev.meta.revisionNumber}`;
        submission.meta.comments.sort(function (a, b) {
            if (a.index > b.index) return -1;
            if (a.index < b.index) return 1;
            if (a.index === b.index) return 0;
        });
        this.currentComments = submission.meta.comments;

        this.parentId = submission._id;
        this.otherRevisions = otherRevs;
        this.currentRevision = currentRev;

        restRequest({
            method: 'GET',
            url: `journal/${currentRev._id}/logo`
        }).done((resp) => {
            var logoURL = '';
            if (resp.length > 0) {
                logoURL = `${apiRoot}/${resp}`;
            }
            this.$el.html(SubmissionViewTemplate({
                'urlLink': urlLink,
                user: this.currentUser,
                info: {
                    'revision': currentRev,
                    'parent': submission,
                    'otherRevisions': otherRevs
                },
                logo: logoURL
            }));

            // Import JS and CSS needed for share buttons after render
            // ******************************************************
            socialLikes(this.$('.social-likes')[0], {
                url: urlLink
            });
            // ******************************************************
            this.$('#reviewDisplay').find('.peer').empty();
            this.$('#reviewDisplay').find('.final').empty();
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$('#headerBar'),
                parentView: this
            });
            var review = {};
            this.$(`.revisionOption[value=${currentRev._id}]`).prop('selected', true);
            if (currentRev.meta.revisionPhase === 'final') {
                this.$('#reviewDisplay').find('.peer').hide();
                this.$('#reviewDisplay').append(`<a id='showHidden'> Show Hidden Reviews</a>`);
            }

            for (var index in currentRev.meta.reviews.peer.reviews) {
                review = currentRev.meta.reviews.peer.reviews[index];
                this.$('#reviewDisplay').find('.peer').append(`<a href="#review/${currentRev._id}/peer/${index}"> Peer Review by ${review.user.firstName} ${review.user.lastName}</a>`);
                this.$('#reviewDisplay').find('.peer').append(PeerReviewSummary({'review': review}));
            }
            for (index in currentRev.meta.reviews.final.reviews) {
                review = currentRev.meta.reviews.final.reviews[index];
                this.$('#reviewDisplay .final').append(`<a href="#review/${currentRev._id}/final/${index}"> Final Review by ${review.user.firstName} ${review.user.lastName}</a>`);
                this.$('#reviewDisplay .final').append(FinalReviewSummary({'review': review}));
            }
            // Replace the URL with one showing both the submission and revision
            // IDs.
            router.navigate(`view/${submission.meta.submissionNumber}/${this.currentRevision.meta.revisionNumber}`, {
                trigger: false,
                replace: true
            }, this);
            return this;
        });
    },
    updateComments: function (send) {
        restRequest({
            method: 'PUT',
            url: `journal/${this.revisionId}/comments?sendEmail=${send}`,
            contentType: 'application/json',
            data: JSON.stringify({'comments': this.currentComments}),
            error: null
        }).done((resp) => {
            window.location.reload();
        });
    },
    deleteSubmission: function () {
        restRequest({
            method: 'DELETE',
            url: `journal/${this.parentId}`
        }).done((resp) => {
            router.navigate(``, {trigger: true});
        });
    }
});

export default submissionView;
