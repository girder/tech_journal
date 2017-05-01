import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import { restRequest } from 'girder/rest';

import ConfigViewTemplate from '../templates/journal_configView.jade';

var configView = View.extend({
    events: {
        'submit #configForm': function (event) {
            event.preventDefault();
            this.$('#g-journal-settings-error-message').empty();

            this._saveSettings([{
                key: 'technical_journal.admin_email',
                value: this.$('#admin_email').val().trim()
            }, {
                key: 'technical_journal.default_journal',
                value: this.$('#default_journal').val().trim()
            },{
                key: 'technical_journal.default_layout',
                value: this.$('#default_layout').val().trim()
            },
            {
                key: 'technical_journal.base_handle',
                value: this.$('#base_handle').val().trim()
            },
            {
                key: 'technical_journal.old_url',
                value: this.$('#old_url').val().trim()
            }]);
        }
    },

    initialize: function () {
        restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify([
                    'technical_journal.admin_email',
                    'technical_journal.default_journal',
                    'technical_journal.default_layout',
                    'technical_journal.base_handle',
                    'technical_journal.old_url'
                ])
            }
        }).done(_.bind(function (resp) {
            this.render();
            this.$('#admin_email').val(
                resp['technical_journal.admin_email']);
            this.$('#default_journal').val(
                resp['technical_journal.default_journal']);
            this.$('#default_layout').val(
                resp['technical_journal.default_layout']);
            this.$('#base_handle').val(
                resp['technical_journal.base_handle']);
            this.$('#old_url').val(
                resp['technical_journal.old_url']);
        }, this));
    },
    render: function () {
        this.$el.html(ConfigViewTemplate());

        if (!this.breadcrumb) {
            this.breadcrumb = new PluginConfigBreadcrumbWidget({
                pluginName: 'Technical Journal',
                el: this.$('.g-config-breadcrumb-container'),
                parentView: this
            }).render();
        }

        return this;
    },
    _saveSettings: function (settings) {
        restRequest({
            type: 'PUT',
            path: 'journal/setting',
            data: {
                list: JSON.stringify(settings)
            },
            error: null
        }).done(_.bind(function (resp) {
            events.trigger('g:alert', {
                icon: 'ok',
                text: 'Settings saved.',
                type: 'success',
                timeout: 4000
            });
        }, this)).error(_.bind(function (resp) {
            this.$('#g-journal-settings-error-message').text(
                resp.responseJSON.message);
        }, this));
    }
});

export default configView;
