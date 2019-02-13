import View from '@girder/core/views/View';
import { restRequest } from '@girder/core/rest';
import router from '@girder/core/router';
import { getCurrentUser } from '@girder/core/auth';

import MenuBarView from '../../views/menuBar.js';
import PeerReviewTemplate from './review_peer.pug';
import FinalReviewTemplate from './review_final.pug';
import QuestionTemplate from './review_questionEntry.pug';
import PeerReviewSummary from '../Common/journal_review_summary_peer.pug';
import FinalReviewSummary from '../Common/journal_review_summary_final.pug';

var reviewView = View.extend({
    events: {
        'click .topicEntry': function (event) {
            event.preventDefault();
            this.$('#listTopics').val(event.currentTarget.text).trigger('change');
        },
        'change #listTopics': function (event) {
            event.preventDefault();
            var topics = this.reviewData.questions.topics;
            var questionList = {};
            Object.keys(this.reviewData.questions.topics).forEach(function (val, index) {
                if (topics[val].name === this.$('#listTopics option:selected').val()) {
                    questionList = topics[val].questions;
                }
            }, this);
            this.$('#templateQuestions').empty();
            this.$('#templateQuestions').append(
                QuestionTemplate({'questionList': questionList, 'type': this.type})
            );
        },
        'change .questionVal': function (event) {
            this._updateReview();
        },
        'change .questionComment': function (event) {
            this._updateReview();
        },
        'click #saveReview': function (event) {
            this._saveReview();
        }
    },
    initialize: function (options) {
        this.render(options);
    },
    render: function (options) {
        this.type = options['type'];
        this.reviewIndex = options['index'];
        restRequest({
            type: 'GET',
            url: `journal/${options['id']}/details`
        }).done((totalDetails) => {
            this.revData = totalDetails[0];
            this.returnURL = `#view/${totalDetails[1].meta.submissionNumber}/${this.revData.meta.revisionNumber}`;

            var templateData = {
                'name': totalDetails[1]['name'],
                'user': getCurrentUser(),
                'description': totalDetails[1]['description'],
                'currentUser': getCurrentUser()
            };
            if (this.type === 'peer') {
                if (this.reviewIndex === 'new') {
                    this.reviewData = JSON.parse(JSON.stringify(this.revData.meta.reviews[this.type]['template']));
                    this.reviewData.user = getCurrentUser();
                } else {
                    this.reviewData = this.revData.meta.reviews[this.type].reviews[this.reviewIndex];
                }
                templateData['review'] = this.reviewData;
                this.$el.html(PeerReviewTemplate(templateData));
                this.processReviewFunc = this._processPeerReview;
            } else {
                if (this.reviewIndex === 'new') {
                    this.reviewData = JSON.parse(JSON.stringify(this.revData.meta.reviews[this.type]['template']));
                    this.reviewData.user = getCurrentUser();
                } else {
                    this.reviewData = this.revData.meta.reviews[this.type].reviews[this.reviewIndex];
                }
                templateData['review'] = this.reviewData;
                this.$el.html(FinalReviewTemplate(templateData));
                this.processReviewFunc = this._processFinalReview;
            }
            this.processReviewFunc(this.reviewData);
            this.$('#listTopics').change();
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$('#headerBar'),
                parentView: this,
                searchBoxVal: '',
                appCount: 0
            });
        });
        return this;
    },
    _processPeerReview: function (review) {
        // determine what topics are "done"
        var totalQs = 0;
        var nonAnswered = 0;
        Object.keys(review.questions.topics).forEach(function (index, topic) {
            var questions = review.questions.topics[index].questions;
            review.questions.topics[index]['done'] = true;
            Object.keys(questions).forEach(function (qindex, question) {
                totalQs++;
                if (!questions[qindex].value.length) {
                    nonAnswered++;
                    review.questions.topics[index]['done'] = false;
                }
            });
        });
        review.done = ((totalQs - nonAnswered) / totalQs) * 100;
        review.questions.list.comment = this.$('#globalComment').val();
        this.$('#summaryTable').empty();
        this.$('#summaryTable').html(PeerReviewSummary({'review': review}));
        return review;
    },
    _processFinalReview: function (review) {
        // determine what topics are "done"
        var totalQs = 0;
        var nonAnswered = 0;
        Object.keys(review.questions.topics).forEach(function (index, topic) {
            var questions = review.questions.topics[index].questions;
            review.questions.topics[index]['done'] = true;
            Object.keys(questions).forEach(function (qIndex, question) {
                totalQs++;
                if (!questions[qIndex].value.length) {
                    nonAnswered++;
                    review.questions.topics[index]['done'] = false;
                }
            });
        });
        review.done = ((totalQs - nonAnswered) / totalQs) * 100;
        review.questions.list.comment = this.$('#globalComment').val();
        review.questions.list.certificationLevel = this.$('#certificationLevel option:selected').text();
        this.$('#summaryTable').empty();
        this.$('#summaryTable').html(FinalReviewSummary({'review': review}));
        return review;
    },
    _updateReview: function () {
        var topicName = this.$('#listTopics option:selected').text();
        var targetIndex = 0;
        var selectedTopics = this.reviewData.questions.topics;
        Object.keys(selectedTopics).forEach(function (d) {
            if (selectedTopics[d].name === topicName) {
                targetIndex = d;
            }
        });
        var updatedQuestions = {};
        this.$('.questionObject').each(function (index, data) {
            var questionIndex = $(data).attr('value');
            var selectedVal = [$(data).find('.questionVal option:selected').attr('value')];
            if ((selectedVal[0] === null) || (selectedVal[0] === undefined)) {
                selectedVal = [];
            }
            updatedQuestions[questionIndex] = {'attachfile': '0',
                'attachfileValue': '',
                'commentValue': $(data).find('textarea').val(),
                'comment': '1',
                'description': selectedTopics[targetIndex].questions[questionIndex].description,
                'value': selectedVal
            };
        }, this);
        this.reviewData.questions.topics[targetIndex].questions = updatedQuestions;
        this.processReviewFunc(this.reviewData);
    },
    _saveReview: function () {
        if (this.type === 'peer') {
            this.reviewData = this._processPeerReview(this.reviewData);
        } else {
            this.reviewData = this._processFinalReview(this.reviewData);
        }
        if (this.reviewIndex === 'new') {
            this.revData.meta.reviews[this.type].reviews.push(this.reviewData);
        } else {
            this.revData.meta.reviews[this.type].reviews[this.reviewIndex] = this.reviewData;
        }
        restRequest({
            type: 'PUT',
            contentType: 'application/json',
            url: `journal/${this.revData._id}/review`,
            data: JSON.stringify(this.revData.meta)
        }).done((resp) => {
            router.navigate(this.returnURL, {trigger: true});
        });
    }
});

export default reviewView;
