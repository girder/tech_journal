girder.views.journal_download = girder.View.extend({
    events: {
    },

    initialize: function (subId) {
        this.parentId= subId.id.id;
        girder.restRequest({
            type: 'GET',
            path: 'folder/'+ this.parentId
        }).done(_.bind(function (resp) {
            this.parent = resp;
            girder.restRequest({
                type: 'GET',
                path: 'item?folderId='+ this.parentId
            }).done(_.bind(function (itemResp) {
                for(index in itemResp) {
                  console.log(itemResp[index]);
                  if(itemResp[index].meta.type=="Paper") {
                    this.paperItem = itemResp[index];
                  }
                }
                this.render(this.paperItem);
            }, this));
        }, this));
    },
    render: function (paperItem) {
        var paperDownloadUrl =
            paperItem && paperItem._id ?
            girder.apiRoot + '/item/' + paperItem._id + '/download'
            : null;
        var parentDownloadUrl =
            girder.apiRoot + '/folder/' +this.parentId+ '/download';

        this.$el.html(girder.templates.journal_download({
            parent: this.parentId,
            parentDownloadUrl: parentDownloadUrl,
            paperDownloadUrl: paperDownloadUrl
        }));
        return this;
    },
});

girder.router.route('plugins/journal/journal/download', 'journalDownload', function(id) {
    girder.events.trigger('g:navigateTo', girder.views.journal_download,{id: id},{layout: girder.Layout.EMPTY});
});
