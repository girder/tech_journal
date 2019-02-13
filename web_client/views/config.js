import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import { restRequest } from 'girder/rest';

import ConfigTemplate from '../templates/config.pug';

const ConfigView = View.extend({
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
            },
            {
                key: 'tech_journal.use_review',
                value: this.$('#use_review:checked').length

            }]);
        }
    },

    initialize: function () {
        restRequest({
            method: 'GET',
            url: 'journal/setting',
            data: {
                list: JSON.stringify([
                    'tech_journal.admin_email',
                    'tech_journal.default_journal',
                    'tech_journal.default_layout',
                    'tech_journal.base_handle',
                    'tech_journal.old_url',
                    'tech_journal.use_review'
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
            this.$('#use_review').prop('checked', resp['tech_journal.use_review']);
        });
    },
    render: function () {
        this.$el.html(ConfigTemplate());

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
            method: 'PUT',
            url: 'journal/setting',
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

export default ConfigView;
