import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import { restRequest } from 'girder/rest';

import ConfigViewTemplate from '../templates/journal_configView.pug';

var configView = View.extend({
    events: {
        'submit #configForm': function (event) {
            event.preventDefault();
            this.$('#g-journal-settings-error-message').empty();

            this._saveSettings([{
                key: 'tech_journal.admin_email',
                value: this.$('#admin_email').val().trim()
            }, {
                key: 'tech_journal.default_journal',
                value: this.$('#default_journal').val().trim()
            }, {
                key: 'tech_journal.default_layout',
                value: this.$('#default_layout').val().trim()
            },
            {
                key: 'tech_journal.base_handle',
                value: this.$('#base_handle').val().trim()
            },
            {
                key: 'tech_journal.old_url',
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
                    'tech_journal.admin_email',
                    'tech_journal.default_journal',
                    'tech_journal.default_layout',
                    'tech_journal.base_handle',
                    'tech_journal.old_url'
                ])
            }
        }).done((resp) => {
            this.render();
            this.$('#admin_email').val(
                resp['tech_journal.admin_email']);
            this.$('#default_journal').val(
                resp['tech_journal.default_journal']);
            this.$('#default_layout').val(
                resp['tech_journal.default_layout']);
            this.$('#base_handle').val(
                resp['tech_journal.base_handle']);
            this.$('#old_url').val(
                resp['tech_journal.old_url']);
        });
    },
    render: function () {
        this.$el.html(ConfigViewTemplate());

        if (!this.breadcrumb) {
            this.breadcrumb = new PluginConfigBreadcrumbWidget({
                pluginName: 'Tech Journal',
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
        }).done((resp) => {
            events.trigger('g:alert', {
                icon: 'ok',
                text: 'Settings saved.',
                type: 'success',
                timeout: 4000
            });
        }).error((resp) => {
            this.$('#g-journal-settings-error-message').text(
                resp.responseJSON.message);
        });
    }
});

export default configView;
