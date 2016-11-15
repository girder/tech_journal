girder.views.journal_view = girder.View.extend({
    initialize: function (subId) {
        girder.restRequest({
            type: 'GET',
            path: 'folder/'+ subId.id.id
        }).done(_.bind(function (resp) {
            console.log(resp)
            this.render(resp)
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subResp) {
        this.$el.html(girder.templates.journal_view({info:subResp}));
        return this;
    }
});

girder.router.route('plugins/journal/journal/view', 'journalView', function(id) {
    girder.events.trigger('g:navigateTo', girder.views.journal_view,{id: id});
});

