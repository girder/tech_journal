girder.views.journal_configView = girder.View.extend({
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
        girder.restRequest({
            type: 'GET',
            path: 'system/setting',
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
            this.render();
        }, this)); 
    },
    render: function () {
        this.$el.html(girder.templates.journal_configView());

        if (!this.breadcrumb) {
            this.breadcrumb = new girder.views.PluginConfigBreadcrumbWidget({
                pluginName: 'Technical Journal',
                el: this.$('.g-config-breadcrumb-container'),
                parentView: this
            });
        }

        this.breadcrumb.render();

        return this;
    },
    _saveSettings: function (settings) {
        console.log(settings)
        girder.restRequest({
            type: 'PUT',
            path: 'system/setting',
            data: {
                list: JSON.stringify(settings)
            },
            error: null
        }).done(_.bind(function (resp) {
            girder.events.trigger('g:alert', {
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

girder.router.route('plugins/journal/config', 'journalConfig', function () {
    girder.events.trigger('g:navigateTo', girder.views.journal_configView);
});

girder.exposePluginConfig('technical_journal', 'plugins/journal/config');
