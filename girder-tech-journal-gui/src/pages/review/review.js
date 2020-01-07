import View from '@girder/core/views/View';
import { restRequest, getApiRoot } from '@girder/core/rest';
import router from '@girder/core/router';
import { getCurrentUser } from '@girder/core/auth';
import FolderModel from '@girder/core/models/FolderModel';
import FileModel from '@girder/core/models/FileModel';
import UploadWidget from '@girder/core/views/widgets/UploadWidget';

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
            Object.keys(questionList).forEach(function (questionIndex) {
                this.$('#templateQuestions').append(
                    QuestionTemplate({'question': questionList[questionIndex],
                        'index': questionIndex,
                        'type': this.type,
                        'isDisabled': this.disablePage
                    })
                );
                if (questionList[questionIndex].hasOwnProperty('attachfileValue') && questionList[questionIndex].attachfileValue !== '') {
                    var value = questionList[questionIndex].attachfileValue;
                    restRequest({
                        type: 'GET',
                        url: `file/${value}`
                    }).done((attachFileDetails) => {
                        var name = attachFileDetails.name;
                        var url = `${getApiRoot()}/file/${value}/download`;
                        var questionEntry = this.$(`.questionObject[value=${questionIndex}]`);
                        questionEntry.find('#attachFileRow').append(`<td><span class='fileItemId' value=${value}><a href=${url}>${name}</a></span></td>`);
                        questionEntry.find('#UploadFile').remove();
                    });
                }
            }, this);
        },
        'change .questionVal': function (event) {
            this._updateReview();
        },
        'change .questionComment': function (event) {
            this._updateReview();
        },
        'click #saveReview': function (event) {
            this._saveReview();
        },
        'click .inputUpload': function (event) {
            var parentObj = this.$(event.currentTarget).parents('.questionObject');
            this._uploadAttachment(parentObj);
        },
        'click .fileItemId': function (event) {
            this._downloadAttachment();
        }
    },
    initialize: function (options) {
        restRequest({
            method: 'GET',
            url: `journal/review/${options['id']}/directory`
        }).done((resp) => {
            this.reviewFilesDir = resp;
            this.render(options);
        });
    },
    render: function (options) {
        this.type = options['type'];
        this.reviewIndex = options['index'];
        var user = getCurrentUser();
        restRequest({
            type: 'GET',
            url: `journal/${options['id']}/details`
        }).done((totalDetails) => {
            this.revData = totalDetails[0];
            this.returnURL = `#view/${totalDetails[1].meta.submissionNumber}/${this.revData.meta.revisionNumber}`;
            this.parentId = totalDetails[1]._id;
            this.disablePage = true;
            var templateData = {
                'name': totalDetails[1]['name'],
                'description': totalDetails[1]['description']
            };
            if (this.type === 'peer') {
                if (this.reviewIndex === 'new') {
                    this.reviewData = JSON.parse(JSON.stringify(this.revData.meta.reviews[this.type]['template']));
                    this.reviewData.user = getCurrentUser();
                } else {
                    this.reviewData = this.revData.meta.reviews[this.type].reviews[this.reviewIndex];
                }
                templateData['review'] = this.reviewData;
                if (user) {
                    this.disablePage = !((templateData['review']['user']['_id'] === user.attributes._id) || (user.attributes.admin));
                }
                templateData['isDisabled'] = this.disablePage;
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
                if (user) {
                    this.disablePage = !((templateData['review']['user']['_id'] === user.attributes._id) || (user.attributes.admin));
                }
                templateData['isDisabled'] = this.disablePage;
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
        review.questions.list.certificationLevel = this.$('#certificationLevel option:selected').text();
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
            updatedQuestions[questionIndex] = {'attachfile': selectedTopics[targetIndex].questions[questionIndex].attachfile,
                'attachfileValue': $(data).find('.fileItemId').attr('value'),
                'commentValue': $(data).find('textarea').val(),
                'comment': selectedTopics[targetIndex].questions[questionIndex].comment,
                'description': selectedTopics[targetIndex].questions[questionIndex].description,
                'value': selectedVal
            };
        }, this);
        this.reviewData.questions.topics[targetIndex].questions = updatedQuestions;
        this.processReviewFunc(this.reviewData);
    },
    _uploadAttachment: function (parentObj) {
        // taken from HierarchyWidget.js
        var container = $('#g-dialog-container');
        var model = new FolderModel();
        model.set({_id: this.reviewFilesDir});

        new UploadWidget({
            el: container,
            parent: model,
            parentType: this.parentType,
            parentView: this,
            overrideStart: true
        }).once('g:uploadStarted', function () {
            for (var i = 0; i < this.files.length; i++) {
                // Get name size and type from file info
                var fileName = this.files[i].name;
                var fileSize = this.files[i].size;
                var fileType = this.files[i].type;
                restRequest({
                    type: 'POST',
                    contentType: false,
                    processData: false,
                    url: `journal/review/${this.parentView.reviewFilesDir}/upload`,
                    data: JSON.stringify({
                        'name': fileName,
                        'size': fileSize,
                        'type': fileType
                    })
                }).done((resp) => {
                    this.destroy();
                    // Upload the chunks of data
                    var model = new FileModel();
                    model.once('g:upload.complete', () => {
                        // Once the upload is complete,
                        // show the information in the review table
                        this.parentView.$(parentObj).find('.inputUpload').hide();
                        this.parentView.$(parentObj).find('.fileItemId').append(resp.name);
                        this.parentView.$(parentObj).find('.fileItemId').attr('value', model.id);
                        this.parentView.$(parentObj).find('.fileItemId').show();
                        this.parentView._updateReview();
                    });
                    model.startByte = 0;
                    model._uploadChunk(this.files[0], resp._id);
                }, this);
            }
        }).render();
    },
    _saveReview: function () {
        if (this.type === 'peer') {
            this.reviewData = this._processPeerReview(this.reviewData);
        } else {
            this.reviewData = this._processFinalReview(this.reviewData);
        }
        if (this.reviewIndex === 'new') {
            this.revData.meta.reviews[this.type].reviews.push(this.reviewData);
            this.reviewIndex = 0;
        } else {
            this.revData.meta.reviews[this.type].reviews[this.reviewIndex] = this.reviewData;
        }
        restRequest({
            type: 'PUT',
            contentType: 'application/json',
            url: `journal/${this.revData._id}/review`,
            data: JSON.stringify({'index': this.reviewIndex,
                'meta': this.revData.meta,
                'type': this.type
            })
        }).done((resp) => {
            router.navigate(this.returnURL, {trigger: true});
        });
    }
});

export default reviewView;
