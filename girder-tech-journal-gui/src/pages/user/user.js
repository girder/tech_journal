import $ from 'jquery';
import UserAccountView from 'girder/views/body/UserAccountView';
import { AccessType } from 'girder/constants';
import router from 'girder/router';
import events from 'girder/events';
import { getCurrentUser } from 'girder/auth';
import { cancelRestRequests, restRequest } from 'girder/rest';
import UserAccountTemplate from 'girder/templates/body/userAccount.pug';

import MenuBarView from '../../views/menuBar.js';
import NotificationTabFormTemplate from './journal_notifications_tab.pug';
import NotificationTabTemplate from './journal_notifications_tab_entry.pug';

var userView = UserAccountView.extend({
    events: {
        'submit #notificationForm': function (event) {
            event.preventDefault();
            var params = {
                'NewSubmissionEmail': this.$('[name="NewSubmissionEmail"]').filter(function (indx, val) { return val.checked; }).val(),
                'NewReviewsEmail': this.$('[name="NewReviewsEmail"]').filter(function (indx, val) { return val.checked; }).val(),
                'NewCommentEmail': this.$('[name="NewCommentEmail"]').filter(function (indx, val) { return val.checked; }).val()
            };
            this.user.set({'notificationStatus': params});
            restRequest({
                method: 'PUT',
                url: 'journal/user',
                contentType: 'application/json',
                data: JSON.stringify(this.user),
                error: null
            }).done((resp) => {
                events.trigger('g:alert', {
                    icon: 'ok',
                    text: 'Information Saved.',
                    type: 'success',
                    timeout: 4000
                });
            });
        }

    },

    initialize: function (settings) {
        this.user = getCurrentUser();
        this.isCurrentUser = getCurrentUser();

        this.model = this.user;

        if (!this.user || this.user.getAccessLevel() < AccessType.WRITE) {
            router.navigate('users', {trigger: true});
            return;
        }

        cancelRestRequests('fetch');

        this.render();
        // Remove the API keys tab from the user view
    },

    render: function () {
        if (getCurrentUser() === null) {
            router.navigate('users', {trigger: true});
            return;
        }

        this.$el.html('<div id="headerBar"></div><div class="Wrapper"><div class="Content">' + UserAccountTemplate({
            user: this.model,
            isCurrentUser: this.isCurrentUser,
            getCurrentUser: getCurrentUser,
            temporaryToken: this.temporary
        }) + '</div></div>');
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this
        });
        this.$('[name="apikeys"]').parent().remove();
        this.$('.g-account-tabs').append(NotificationTabTemplate());
        this.$('.tab-content').append(NotificationTabFormTemplate());
        var notifications = this.user.attributes.notificationStatus;
        Object.keys(this.user.attributes.notificationStatus).forEach(function (d) {
            $(`[name=${d}][value=${notifications[d]}]`).prop('checked', true);
        });
        return this;
    }
});

export default userView;
