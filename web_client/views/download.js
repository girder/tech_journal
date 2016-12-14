import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import { restRequest } from 'girder/rest';
import { apiRoot } from 'girder/rest';

import DownloadViewTemplate from '../templates/journal_download.jade';


var downloadView = View.extend({
    events: {
    },

    initialize: function (subId) {
        this.parentId= subId.id.id;
        restRequest({
            type: 'GET',
            path: 'folder/'+ this.parentId
        }).done(_.bind(function (resp) {
            this.parent = resp;
            restRequest({
                type: 'GET',
                path: 'item?folderId='+ this.parentId
            }).done(_.bind(function (itemResp) {
                for(var index in itemResp) {
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
            apiRoot + '/item/' + paperItem._id + '/download'
            : null;
        var parentDownloadUrl =
            apiRoot + '/folder/' +this.parentId+ '/download';

        this.$el.html(DownloadViewTemplate({
            parent: this.parentId,
            parentDownloadUrl: parentDownloadUrl,
            paperDownloadUrl: paperDownloadUrl
        }));
        return this;
    },
});

export default downloadView;
