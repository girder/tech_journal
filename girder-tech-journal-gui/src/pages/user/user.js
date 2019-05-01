import $ from 'jquery';
import _ from 'underscore';
import UserAccountView from '@girder/core/views/body/UserAccountView';
import { AccessType } from '@girder/core/constants';
import router from '@girder/core/router';
import events from '@girder/core/events';
import { getCurrentUser } from '@girder/core/auth';
import { cancelRestRequests, restRequest } from '@girder/core/rest';
import UserAccountTemplate from '@girder/core/templates/body/userAccount.pug';

import MenuBarView from '../../views/menuBar.js';
import NotificationTabFormTemplate from './journal_notifications_tab.pug';
import NotificationTabTemplate from './journal_notifications_tab_entry.pug';

var userView = UserAccountView.extend({
    events: function () {
        return _.extend({}, UserAccountView.prototype.events, {
            'submit #notificationForm': function (event) {
                event.preventDefault();
                var params = {
                    'NewSubmissionEmail': this.$('[name="NewSubmissionEmail"]:checked').val() === '1',
                    'NewReviewsEmail': this.$('[name="NewReviewsEmail"]:checked').val() === '1',
                    'NewCommentEmail': this.$('[name="NewCommentEmail"]:checked').val() === '1'
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
        });
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
    },

    render: function () {
        if (getCurrentUser() === null) {
            router.navigate('users', {trigger: true});
            return;
        }

        this.$el.html('<div id="headerBar"></div><div class="Wrapper"><div class="Content"><div class="viewMain">' + UserAccountTemplate({
            user: this.model,
            isCurrentUser: this.isCurrentUser,
            getCurrentUser: getCurrentUser,
            temporaryToken: this.temporary
        }) + '</div></div></div>');
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$('#headerBar'),
            parentView: this
        });
        // Remove unneeded pages from the Girder User page
        this.$('[name="apikeys"]').parent().remove();
        this.$('[name="otp"]').parent().remove();
        // Add in custom page for selecting notifications.
        this.$('.g-account-tabs').append(NotificationTabTemplate());
        this.$('.tab-content').append(NotificationTabFormTemplate());
        var notifications = this.user.attributes.notificationStatus;
        Object.keys(this.user.attributes.notificationStatus).forEach(function (d) {
            var value = '0';
            if (notifications[d]) { value = '1'; }
            $(`[name=${d}][value=${value}]`).prop('checked', true);
        });
        return this;
    }
});

export default userView;
