girder.views.journal_index = girder.View.extend({
    initialize: function () {
      /*  girder.restRequest({
            type: 'GET',
            path: 'system/setting',
            data: {
                list: JSON.stringify([
                    'worker.broker',
                    'worker.backend'
                ])
            }
        }).done(_.bind(function (resp) {
            this.render();
        }, this));*/
           this.render(); 
    },
    render: function () {
        this.$el.html(girder.templates.journal_index());
        return this;
    },
    _saveSettings: function (settings) {
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

girder.router.route('plugins/journal/journal', 'journalIndex', function () {
    girder.events.trigger('g:navigateTo', girder.views.journal_index);
});

