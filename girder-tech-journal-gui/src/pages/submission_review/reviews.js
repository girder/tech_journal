import View from '@girder/core/views/View';
import { restRequest } from '@girder/core/rest';
import events from '@girder/core/events';

import MenuBarView from '../../views/menuBar.js';
import ReviewsTemplate from './reviews.pug';
import RevisionPhaseTemplate from './revisionPhaseTemplate.pug';
import PeerReviewSummary from '../Common/journal_review_summary_peer.pug';
import FinalReviewSummary from '../Common/journal_review_summary_final.pug';

var SubmissionManageReviewsView = View.extend({
    events: {
        'change #revisionSelector': function (event) {
            this.revData = this.revisions[this.$('#revisionSelector option:selected').attr('value')];
            this.submissionId = this.revData._id;
            this._showReviews(this.revData);
        },
        'click #articleUpdate': function (event) {
            event.preventDefault();
            var subData = {
                'certification_level': this.$('#certificationLevel option:selected').attr('value'),
                'osehra_core': this.$('#submissionType option:selected').attr('value')
            };
            restRequest({
                type: 'PUT',
                url: `journal/${this.submissionId}/metadata`,
                contentType: 'application/json',
                data: JSON.stringify(subData),
                error: null
            }).done((respMD) => {
                events.trigger('g:alert', {
                    icon: 'ok',
                    text: 'Certification Level Updated.',
                    type: 'success',
                    timeout: 4000
                });
            });
        },
        'click #savePhase': function (event) {
            var subData = {'revisionPhase': this.$('#reviewPhase option:selected').attr('val')};
            restRequest({
                type: 'PUT',
                url: `journal/${this.submissionId}/metadata`,
                contentType: 'application/json',
                data: JSON.stringify(subData),
                error: null
            }).done((respMD) => {
                this.$('#reviewDisplay').empty();
                this.$('#reviewDisplay').append(RevisionPhaseTemplate({'revisionPhase': subData['revisionPhase']}));
                events.trigger('g:alert', {
                    icon: 'ok',
                    text: 'Phase Updated.',
                    type: 'success',
                    timeout: 4000
                });
            });
        }
    },
    initialize: function (options) {
        this.submissionId = options['id'];
        this.render(options);
    },
    render: function (options) {
        restRequest({
            type: 'GET',
            url: `journal/${options['id']}/details`
        }).done((totalDetails) => {
            this.revisions = totalDetails[2];
            this.revData = totalDetails[0];
            var url = `#view/${totalDetails[1].meta.submissionNumber}/${this.revData.meta.revisionNumber}`;
            this.$el.html(ReviewsTemplate({'revisions': this.revisions, 'backURL': url}));
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$('#headerBar'),
                parentView: this,
                searchBoxVal: '',
                appCount: 0
            });
            this._showReviews(this.revData);
        });
        return this;
    },
    _showReviews: function (revision) {
        this.$('#reviewDisplay').empty();
        this.$('#reviewDisplay').append(RevisionPhaseTemplate({'revisionPhase': revision.meta.revisionPhase}));
        var review = {};
        for (var index in revision.meta.reviews.peer.reviews) {
            review = revision.meta.reviews.peer.reviews[index];
            this.$('#reviewDisplay').append(`<a href='#review/${revision._id}/peer/${index}'> Peer Review by ${review.user.firstName} ${review.user.lastName}</a>`);
            this.$('#reviewDisplay').append(PeerReviewSummary({'review': review}));
        }
        for (index in revision.meta.reviews.final.reviews) {
            review = revision.meta.reviews.final.reviews[index];
            this.$('#reviewDisplay').append(`<a href="#review/${revision._id}/final/${index}"> Final Review by ${review.user.firstName} ${review.user.lastName}</a>`);
            this.$('#reviewDisplay').append(FinalReviewSummary({'review': review}));
        }
    }
});

export default SubmissionManageReviewsView;
