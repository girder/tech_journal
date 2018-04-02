import $ from 'jquery';
import View from 'girder/views/View';
import router from 'girder/router';
import { getCurrentUser } from 'girder/auth';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import SubmissionViewTemplate from '../templates/journal_view.pug';

var submissionView = View.extend({

    events: {
        'click #downloadLink': function (event) {
            router.navigate(`#plugins/journal/view/${this.displayId}/download`, {trigger: true});
        },
        'click #addCommentButton': function (event) {
            event.preventDefault();
            var commentInfo = {
                'name': this.currentUser.name(),
                'text': this.$('#commentText').val().trim(),
                'index': String(this.currentComments.length)
            };
            this.currentComments.push(commentInfo);
            this.updateComments();
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
            this.updateComments();
        },
        'keyup #commentText': function (event) {
            var charsLeft = 1200 - this.$('#commentText').val().length;
            $('.commentLengthRemaining').text(`${charsLeft} characters remaining.`);
        },

        'change #revisionSelector': function (event) {
            router.navigate(`#plugins/journal/view/${this.$('.revisionOption:selected').val()}`,
                {trigger: true});
        }
    },
    initialize: function (subId) {
        this.displayId = subId.id;
        this.currentUser = getCurrentUser();
        restRequest({
            type: 'GET',
            path: `journal/${this.displayId}/details`
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
        this.$el.html(SubmissionViewTemplate({ user: this.currentUser, info: { 'revision': totalDetails[0], 'parent': totalDetails[1], 'otherRevisions': totalDetails[2] } }));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this
        });
        this.$(`.revisionOption[value=${totalDetails[0]._id}]`).prop('selected', true);
        return this;
    },
    updateComments: function () {
        restRequest({
            type: 'PUT',
            path: `journal/${this.displayId}/metadata`,
            contentType: 'application/json',
            data: JSON.stringify({'comments': this.currentComments}),
            error: null
        }).done((resp) => {
            window.location.reload();
        });
    }
});

export default submissionView;
