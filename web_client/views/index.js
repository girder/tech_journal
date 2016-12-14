import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import { restRequest } from 'girder/rest';

import IndexViewTemplate from '../templates/journal_index.jade';


var indexView = View.extend({
    initialize: function () {
        var totalData=[]
        restRequest({
            type: 'GET',
            path: 'system/setting',
            data: {
                list: JSON.stringify([
                    'technical_journal.default_journal',
                ])
            }
        }).done(_.bind(function (resp) {
            restRequest({
                type: 'GET',
                path: 'collection',
                params: {
                    id: resp['technical_journal.default_journal']
                    }

            }).done(_.bind(function (issueResp) {
               for (var issue in issueResp) {
                  restRequest({
                      type: 'GET',
                      path: 'folder',
                      data: {
                          parentType: "collection",
                          parentId: issueResp[issue]['_id']
                          }
                  }).done(_.bind(function (subList) {
                       for (var sub in subList) {
                          restRequest({
                              type: 'GET',
                              path: 'folder',
                              data: {
                                  parentType: "folder",
                                  parentId: subList[sub]['_id']
                                  }
                          }).done(_.bind(function (subData) {
                               for(var entry in subData) {
                                   totalData.push(subData[entry]);
                               }
                               this.render(totalData);
                          }, this));
                       }  // End individual submission data query
                  }, this));
               }  //End getting submissions within issues
            }, this));// End getting issues within collections
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subData) {
        this.$el.html(IndexViewTemplate({info:subData}));
        return this;
    }
});

export default indexView;

