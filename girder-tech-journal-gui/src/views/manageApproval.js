import View from '@girder/core/views/View';
import { restRequest, apiRoot } from '@girder/core/rest';

import MenuBarView from './menuBar.js';
import ApprovalViewTemplate from '../templates/journal_admin_approval.pug';
import IndexEntryViewTemplate from '../templates/journal_index_entry.pug';

import PlaceholderLogoURL from '@/assets/journal.gif';

import CertificationLogoURL from '@/assets/check.gif';

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
        this.$('.SearchResults').html(IndexEntryViewTemplate({
            info: {
                'submissions': subData,
                'approveLink': true
            },
            root: apiRoot,
            'logos': {
                'default': PlaceholderLogoURL,
                'certified': CertificationLogoURL
            }

        }));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$('#headerBar'),
            parentView: this
        });
        return this;
    }
});

export default manageApprovalView;
