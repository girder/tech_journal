import View from '@girder/core/views/View';
import { restRequest } from '@girder/core/rest';
import events from '@girder/core/events';

import MenuBarView from '../../views/menuBar.js';
import manageReviewQuestions from './review_manageLists.pug';
import manageReviewQuestionEntry from './review_manageQuestionEntry.pug';
import addQuestionTemplate from './review_newQuestionTemplate.pug';
import addTopicTemplate from './review_newTopicTemplate.pug';
import addQListTemplate from './review_newQuestionListTemplate.pug';

var editLinks =  '<i class="mvUp material-icons" title="Move Upward">arrow_upward</i>';
editLinks += '<i class="mvDn material-icons", title="Move Downward">arrow_downward</i>';
editLinks += '<i class="material-icons" title="Edit" id="editTopicLink">edit</i>';
editLinks += '<i class="material-icons" title="Delete Topic" id="deleteTopic">delete</i>';

var manageQuestionView = View.extend({
    events: {
        'change #selectList': function (event) {
            this.qListName = this.$('.qListOption:selected').val();
            if (!this.topicsList[this.qListName].value) {
                this.topicsList[this.qListName].value = {'questions': {'topics': {}}};
            }
            this.render(manageReviewQuestions({'qList': this.qListName, 'topics': this.topicsList, 'qTopics': this.topicsList[this.qListName].value.questions.topics}));
            this.$('#qListDetail').show();
        },
        'click #cancelNewList': function (event) {
            this.$('.questionArea').empty();
        },
        'click #deleteList': function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            restRequest({
                type: 'DELETE',
                url: `journal/questions?text=${this.qListName}`
            }).done((resp) => {
                window.location.reload();
            });
        },
        'click #deleteTopic': function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.$('.topicElement.active').remove();
            this.$('.questionArea').empty();
            this.$('.questionTD').empty();
            delete this.topicsList[this.qListName].value.questions.topics[this.topicIndex];
            this._saveList();
        },
        'click #deleteQuestion': function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            this.$('.questionArea').empty();
            this._saveList();
        },
        'click .topicElement': function (event) {
            event.preventDefault();
            this.topicIndex = event.target.attributes['val'].value;
            this.$('.topicElement.active').toggleClass('active');
            this.$('#topicTD').find('.material-icons').remove();
            this.$(event.currentTarget).toggleClass('active');
            this.$(event.currentTarget).append(editLinks);
            this.$('#questionTD').empty();
            var questions = {};
            if (Object.keys(this.topicsList[this.qListName].value.questions.topics).indexOf(this.topicIndex) !== -1) {
                questions = this.topicsList[this.qListName].value.questions.topics[this.topicIndex].questions;
            }
            this.$('#questionTD').append(
                manageReviewQuestionEntry({'questions': questions})
            );
        },
        'click #newQuestionListLink': function (event) {
            event.preventDefault();
            this.$('.questionArea').empty();
            this.$('.questionArea').append(addQListTemplate({'type': 'New', 'text': '', 'catList': this.categoryList}));
        },
        'click #newTopicLink': function (event) {
            event.preventDefault();
            this.$('.questionArea').empty();
            this.$('.questionArea').append(addTopicTemplate({'type': 'New', 'text': ' '}));
        },
        'click #newQuestionLink': function (event) {
            event.preventDefault();
            this.$('.questionArea').empty();
            this.$('.questionArea').append(addQuestionTemplate({'type': 'New', 'text': ''}));
        },
        // Adapted from https://stackoverflow.com/questions/3050830/reorder-list-elements-jquery
        'click .mvUp': function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (this.$(event.currentTarget.parentElement).not(':first-child')) {
                this.$(event.currentTarget.parentElement).prev().before(this.$(event.currentTarget.parentElement));
            }
        },
        'click .mvDn': function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            if (this.$(event.currentTarget.parentElement).not(':last-child')) {
                this.$(event.currentTarget.parentElement).next().after(this.$(event.currentTarget.parentElement));
            }
        },
        'submit #addQuestionListForm': function (event) {
            event.preventDefault();
            var valueData = {'tag': 'questionList',
                'key': this.$('#listText').val(),
                'value': {
                    'done': 0,
                    'questions': {
                        'list': {
                            'category_id': this.$('.catOption:selected').val(),
                            'comment': '',
                            'description': this.$('#reviewDescription').val(),
                            'name': this.$('#listText').val(),
                            'type': this.$('#reviewType').val()
                        },
                        'review_id': '',
                        'revision_id': '',
                        'topics': {}
                    },
                    'type': this.$('#reviewType').val(),
                    'user': ''
                }
            };
            restRequest({
                type: 'PUT',
                url: `journal/questions`,
                contentType: 'application/json',
                data: JSON.stringify(valueData)
            }).done((resp) => {
                window.location.reload();
            });
        },
        'submit #addTopicForm': function (event) {
            event.preventDefault();
            this.$('#topicTD').find('.material-icons').remove();
            this.$('.active').toggleClass('active');
            this.$('#topicTD').append(`<div class="topicElement active"><a class="topicString" val=${this.$('.topicElement').length + 1}>${this.$('#topicText').val()}</a></div>`);
            this.$('.topicElement.active').append(editLinks);
            this._saveList();
        },
        'submit #addQuestionForm': function (event) {
            event.preventDefault();
            this.$('#questionTD').append(
                manageReviewQuestionEntry({questions: [{'description': this.$('#questionText').val()}]})
            );
            this._saveList();
        },
        'click #updateQuestion': function (event) {
            event.preventDefault();
            var children = this.$('#questionTD').children('.questionElement');
            var targetText = this.preEdit;
            children.each(function (child) {
                if ($(children[child]).find('textarea').val() === targetText) {
                    $(children[child]).remove();
                    $('#questionTD').append(manageReviewQuestionEntry({questions: [{'description': $('#questionText').val()}]}));
                }
            }, this);
            this.$('.questionArea').empty();
            this._saveList();
        },
        'click #updateTopic': function (event) {
            event.preventDefault();
            var children = this.$('#topicTD').children('.topicElement');
            var targetText = this.preEdit;
            children.each(function (child) {
                if ($(children[child]).find('a').text() === targetText) {
                    var originalVal = $(children[child]).find('a').attr('val');
                    $(children[child]).remove();
                    $('#topicTD').append(`<div class="topicElement active"><a class="topicString" val="${originalVal}">${$('#topicText').val()}</a></div>`);
                    $('.topicElement.active').append(editLinks);
                }
            }, this);
            this.$('.questionArea').empty();
            this._saveList();
        },
        'click #updateList': function (event) {
            event.preventDefault();
            var valueData = {'tag': 'questionList',
                'key': this.$('#listText').val(),
                'value': {
                    'done': 0,
                    'questions': {
                        'list': {
                            'category_id': this.$('.catOption:selected').val(),
                            'comment': '',
                            'description': this.$('#reviewDescription').val(),
                            'name': this.$('#listText').val(),
                            'type': this.$('#reviewType').val()
                        },
                        'review_id': '',
                        'revision_id': '',
                        'topics': this.topicsList[this.qListName].value.questions.topics
                    },
                    'type': this.$('#reviewType').val(),
                    'user': ''
                }
            };
            restRequest({
                type: 'DELETE',
                url: `journal/questions?text=${this.qListName}`
            }).done((resp) => {
                restRequest({
                    type: 'PUT',
                    url: `journal/questions`,
                    contentType: 'application/json',
                    data: JSON.stringify(valueData)
                }).done((resp) => {
                    window.location.reload();
                });
            });
        },
        'click .delQuestion': function (event) {
            event.preventDefault();
            this.$(event.currentTarget.parentElement).empty();
        },
        'click #editListLink': function (event) {
            var listText = this.qListName;
            this.preEdit = listText;
            this.$('.questionArea').empty();
            this.$('.questionArea').append(addQListTemplate({'type': 'Edit', 'text': listText, 'catList': this.categoryList}));
        },
        'click #saveListLink': function (event) {
            this._saveList();
        },
        'click #editTopicLink': function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            var topicText = this.$(event.currentTarget.parentElement).find('.topicString').text();
            this.preEdit = topicText;
            this.$('.questionArea').empty();
            this.$('.questionArea').append(addTopicTemplate({'type': 'Edit', 'text': topicText}));
        },
        'click .EditQes': function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();
            var questionText = this.$(event.currentTarget.parentElement).find('textarea').val();
            this.$('.questionArea').empty();
            this.preEdit = questionText;
            this.$('.questionArea').append(addQuestionTemplate({'type': 'Edit', 'text': questionText}));
        }
    },
    initialize: function (options) {
        restRequest({
            type: 'GET',
            url: 'journal/questions'
        }).done((resp) => {
            restRequest({
                type: 'GET',
                url: 'journal/categories?tag=categories'
            }).done((catResp) => {
                this.categoryList = catResp;
                this.topicsList = resp;
                this.render(manageReviewQuestions({'topics': this.topicsList, 'qTopics': []}));
            }); // End getting of categories for new questions
        }); // End getting of quuestions
    },
    _saveList: function () {
        if (Object.keys(this.topicsList[this.qListName]).indexOf('value') === -1) {
            this.topicsList[this.qListName]['value'] = {};
        }
        var topicName = this.$('.topicElement.active .topicString').text();
        var existingTopics = this.topicsList[this.qListName].value.questions.topics;
        var targetIndex = '-1';
        var tmpTopicList = {};
        // first bring over all topics from existing
        this.$('.topicString').each(function (index, element) {
            // Check each name for the active topic
            if (Object.keys(existingTopics).indexOf($(element).attr('val')) !== -1) {
                tmpTopicList[index] = existingTopics[$(element).attr('val')];
            } else {
                // New topic, could be targeted one, could not be
                tmpTopicList[index] = {
                    'comment': '',
                    'attachfile': '',
                    'description': '',
                    'questions': {},
                    'name': $(element).text()
                };
            }
            $(element).attr('val', index);
        });
        if (topicName !== '') {
            Object.keys(tmpTopicList).forEach(function (key, index) {
                if (tmpTopicList[key].name === topicName) {
                    targetIndex = key;
                }
            });
            var newQuestions = {};
            this.$('.questionElement textarea').each(function (index, data) {
                newQuestions[index] = {'value': [],
                    'attachfile': '0',
                    'attachfileValue': '',
                    'commentValue': '',
                    'comment': '1',
                    'description': $(data).text()
                };
            });
            tmpTopicList[targetIndex].questions = newQuestions;
            delete this.topicsList[this.qListName].value.questions.topics;
            this.topicsList[this.qListName].value.questions.topics = Object.assign({}, tmpTopicList);
        }
        restRequest({
            type: 'PUT',
            contentType: 'application/json',
            url: `journal/questions`,
            data: JSON.stringify(this.topicsList[this.qListName])
        }).done((resp) => {
            events.trigger('g:alert', {
                icon: 'ok',
                text: 'Question List saved.',
                type: 'success',
                timeout: 4000
            });
        });
    },
    render: function (templateHTML) {
        this.$el.html(templateHTML);
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$('#headerBar'),
            parentView: this,
            searchBoxVal: '',
            appCount: 0
        });
        return this;
    }
});

export default manageQuestionView;
