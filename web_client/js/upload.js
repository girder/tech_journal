girder.views.journal_upload = girder.View.extend({
    events: {
        'submit #submitForm': function (event) {
            event.preventDefault();
        }
    },
    initialize: function (subId) {
        this.parentId= subId.id.id;
        girder.restRequest({
            type: 'GET',
            path: 'folder/'+ this.parentId
        }).done(_.bind(function (resp) {
            this.render(resp)
        }, this));
    },
    render: function (subResp) {
        this.$el.html(girder.templates.journal_upload({info:subResp}));
        return this;
    },
    _uploadFiles: function (data) {
    }
});
girder.router.route('plugins/journal/journal/upload', 'journalUpload', function(id) {
    girder.events.trigger('g:navigateTo', girder.views.journal_upload,{id: id},{layout: girder.Layout.EMPTY});
});
