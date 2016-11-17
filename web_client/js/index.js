girder.views.journal_index = girder.View.extend({
    initialize: function () {
        var totalData=[]
        girder.restRequest({
            type: 'GET',
            path: 'system/setting',
            data: {
                list: JSON.stringify([
                    'technical_journal.default_journal',
                ])
            }
        }).done(_.bind(function (resp) {
            console.log(resp)
            console.log(resp['technical_journal.default_journal'])
            girder.restRequest({
                type: 'GET',
                path: 'collection',
                params: {
                    id: resp['technical_journal.default_journal']
                    }

            }).done(_.bind(function (issueResp) {
               for (issue in issueResp) {
                  girder.restRequest({
                      type: 'GET',
                      path: 'folder',
                      data: {
                          parentType: "collection",
                          parentId: issueResp[issue]['_id']
                          }
                  }).done(_.bind(function (subList) {
                       for (sub in subList) {
                          girder.restRequest({
                              type: 'GET',
                              path: 'folder',
                              data: {
                                  parentType: "folder",
                                  parentId: subList[sub]['_id']
                                  }
                          }).done(_.bind(function (subData) {
                               for(entry in subData) {
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
        this.$el.html(girder.templates.journal_index({info:subData}));
        return this;
    }
});

girder.router.route('plugins/journal/journal', 'journalIndex', function() {
    girder.events.trigger('g:navigateTo', girder.views.journal_index,{},{layout: girder.Layout.EMPTY});
});

