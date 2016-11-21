girder.views.journal_submit = girder.View.extend({
    events: {
        'submit #submitForm': function (event) {
            event.preventDefault();
            this._createSubmission({
                "subName":this.$('#titleEntry').val().trim(),
                "subDescription": this.$('#abstractEntry').val().trim()
            })
        },
        'click #authorAdd': function (event) {
            event.preventDefault();
            this.$("#authors").append(girder.templates.journal_author_entry({info: "1"}))
        },
        'click #removeAuthor': function(event){
            this.$(event.currentTarget.parentElement).remove();
        },
        'click #tagAdd': function (event) {
            event.preventDefault();
            this.$("#tags").append(girder.templates.journal_tag_entry({info: "1"}))
        },
        'click #removeTag': function(event){
            this.$(event.currentTarget.parentElement).remove();
        }
    },
    initialize: function (subId) {
        this.parentId= subId.id.id;
        girder.restRequest({
            type: 'GET',
            path: 'folder/'+ this.parentId
        }).done(_.bind(function (resp) {
            this.render(resp)
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subResp) {
        this.$el.html(girder.templates.journal_submit({info:subResp}));
        return this;
    },
    _createSubmission: function (inData) {
            var subData = {
                'institution': this.$('#institutionEntry').val().trim(),
                'related': this.$('#relatedEntry').val().trim(),
                'type': this.$('#typeEntry').val().trim()
            };
        girder.restRequest({
            type: 'POST',
            path: 'folder',
            data: {
                parentId: this.parentId,
                parentType: "folder",
                name: inData.subName,
                description: inData.subDescription
            },
            error: null
        }).done(_.bind(function (resp) {
           girder.restRequest({
               type: 'PUT',
               path: 'folder/'+resp._id+'/metadata',
               contentType: 'application/json',
               data: JSON.stringify(subData),
               error:null
           }).done(_.bind(function (respMD) {
               girder.router.navigate('plugins/journal/journal/upload?id='+respMD._id,
                                      {trigger: true});
             }, this));
        }, this));
    }
});

girder.router.route('plugins/journal/journal/submit', 'journalSubmit', function(id) {
    girder.events.trigger('g:navigateTo', girder.views.journal_submit,{id: id},{layout: girder.Layout.EMPTY});
});

