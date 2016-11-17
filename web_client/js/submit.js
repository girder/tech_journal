girder.views.journal_submit = girder.View.extend({
    events: {
        'submit #submitForm': function (event) {
            event.preventDefault();
            this._createSubmission({
                "subName":this.$('#titleEntry').val().trim(),
                "subDescription": this.$('#abstractEntry').val().trim()
                })
        }
    },
    initialize: function (subId) {
        this.parentId= subId.id.id;
        girder.restRequest({
            type: 'GET',
            path: 'folder/'+ this.parentId
        }).done(_.bind(function (resp) {
            console.log(resp)
            this.render(resp)
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subResp) {
        this.$el.html(girder.templates.journal_submit({info:subResp}));
        return this;
    },
    _createSubmission: function (data) {
        girder.restRequest({
            type: 'POST',
            path: 'folder',
            data: {
                parentId: this.parentId,
                parentType: "folder",
                name: data.subName,
                description: data.description
            },
            error: null
        }).done(_.bind(function (resp) {
           console.log(resp);
           girder.events.trigger('g:navigateTo', girder.views.journal_upload,{id:resp},{layout: girder.Layout.EMPTY});
        }, this));
    }
});

girder.router.route('plugins/journal/journal/submit', 'journalSubmit', function(id) {
    girder.events.trigger('g:navigateTo', girder.views.journal_submit,{id: id},{layout: girder.Layout.EMPTY});
});

