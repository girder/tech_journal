girder.views.journal_selectIssue = girder.View.extend({
    initialize: function (subId) {
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
                        console.log(subList);
                        this.render(subList);
                    }, this));
                }
             }, this));
         }, this));
    },
    render: function (subResp) {
        this.$el.html(girder.templates.journal_select_issue({info:subResp}));
        return this;
    }
});

girder.router.route('plugins/journal/journal/selectIssue', 'journalSelect', function() {
    girder.events.trigger('g:navigateTo', girder.views.journal_selectIssue,{},{layout: girder.Layout.EMPTY});
});

