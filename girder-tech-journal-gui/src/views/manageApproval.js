import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import ApprovalViewTemplate from '../templates/journal_admin_approval.pug';
import IndexEntryViewTemplate from '../templates/journal_index_entry.pug';

var manageApprovalView = View.extend({

    events: {
    },
    initialize: function (options) {
        restRequest({
            method: 'GET',
            url: 'journal/setting',
            data: {
                list: JSON.stringify([
                    'tech_journal.default_journal'
                ])
            }
        }).done((resp) => {
            console.log(resp);
            restRequest({
                method: 'GET',
                url: `journal/${resp['tech_journal.default_journal']}/pending?`
            }).done((jrnResp) => {
                this.render(jrnResp);
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
