import View from 'girder/views/View';
import { restRequest, apiRoot } from 'girder/rest';

import MenuBarView from './menuBar.js';
import DownloadViewTemplate from '../templates/journal_download.pug';

var downloadView = View.extend({
    events: {
        'click .disclaimerRad': function (event) {
            this.$('#downloadContent').hide();
            var disclaimerAgree = $('.disclaimerRad:checked').val();
            if (disclaimerAgree === 'agree') {
                this.$('#downloadContent').show();
            }
        }
    },
    initialize: function (subId) {
        this.parentId = subId.id;
        this.submissionNumber = subId.submissionNumber;
        this.revisionNumber = subId.revisionNumber;
        restRequest({
            type: 'GET',
            path: `folder/${this.parentId}`
        }).done((resp) => {
            this.parent = resp;
            restRequest({
                type: 'GET',
                path: `item?folderId=${this.parentId}`
            }).done((itemResp) => {
                for (var index in itemResp) {
                    if (itemResp[index].meta.type === 'PAPER') {
                        this.paperItem = itemResp[index];
                    }
                }
                this.render(this.paperItem);
            });
        });
    },
    render: function (paperItem) {
        restRequest({
            type: 'GET',
            path: 'journal/disclaimers?tag=disclaimer'
        }).done((resp) => {
            var paperDownloadUrl =
                paperItem && paperItem._id
                    ? `${apiRoot}/item/${paperItem._id}/download`
                    : null;
            var parentDownloadUrl =
                 `${apiRoot}/folder/${this.parentId}/download`;
            var displayObj = {
                parent: this.parentId,
                parentDownloadUrl: parentDownloadUrl,
                paperDownloadUrl: paperDownloadUrl,
                submissionNumber: this.submissionNumber,
                revisionNumber: this.revisionNumber,
            };
            if (Object.keys(resp).indexOf(this.parent.meta.disclaimer) !== -1) {
                displayObj['disclaimer'] = resp[this.parent.meta.disclaimer]['value'];
            }
            this.$el.html(DownloadViewTemplate(displayObj));
            new MenuBarView({ // eslint-disable-line no-new
                el: this.$el,
                parentView: this
            });
            if (Object.keys(displayObj).indexOf('disclaimer') !== -1) {
                this.$('#downloadContent').hide();
            } else {
                this.$('#disclaimer').hide();
            }
            return this;
        });
    }
});

export default downloadView;
