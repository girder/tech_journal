import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import ApprovalViewTemplate from '../templates/journal_admin_approval.jade';
import IndexEntryViewTemplate from '../templates/journal_index_entry.jade';

var manageApprovalView = View.extend({

    events: {
    },
    initialize: function (options) {
        restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify([
                    'technical_journal.default_journal'
                ])
            }
        }).done((resp) => {
            restRequest({
                type: 'GET',
                path: `journal/${resp['technical_journal.default_journal']}/submissions?filterID=*`,
                params: {
                    filterID: '*'
                }
            }).done((jrnResp) => {
                var approvalSubs = [];
                jrnResp.forEach(function (sub) {
                    if (sub.curation.status === 'REQUESTED') {
                        approvalSubs.push(sub);
                    }
                });
                this.render(approvalSubs);
            });
        });
    },
    render: function (subData) {
        this.$el.html(ApprovalViewTemplate({}));
        this.$('.SearchResults').html(IndexEntryViewTemplate({ info: { 'submissions': subData, approveLink: true } }));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this,
            searchBoxVal: '',
            appCount: 0
        });
        return this;
    }
});

export default manageApprovalView;
