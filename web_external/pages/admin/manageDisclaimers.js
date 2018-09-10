import View from 'girder/views/View';
import events from 'girder/events';
import MarkdownWidget from 'girder/views/widgets/MarkdownWidget';
import { restRequest } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import manageAdminViewTemplate from './journal_admin_disclaimer.pug';

var ManageDisclaimerView = View.extend({

    events: {
        'submit #mainForm': function (event) {
            event.preventDefault();
            // save Content to show on other pages
            this._saveDisclaimer([
                {tag: 'disclaimer', key: this.$('#discName').val(), value: this.HelpEditor.val()}
            ]);
        },
        'change #disclaimerChoice': function (event) {
            var discName = '';
            var discText = '';
            if (Object.keys(this.disclaimers).indexOf(event.target.value) !== -1) {
                discName = event.target.value;
                discText = this.disclaimers[event.target.value].value;
            }
            this.$('#discName').val(discName);
            this.HelpEditor.text = discText;
            this.HelpEditor.render();
        }
    },
    initialize: function () {
        restRequest({
            type: 'GET',
            path: 'journal/disclaimers?tag=disclaimer'
        }).done((resp) => {
            this.render(resp);
        });
    },
    render: function (disclaimerList) {
        this.$el.html(manageAdminViewTemplate());
        this.disclaimers = disclaimerList;
        for (var disc in disclaimerList) {
            this.$('#disclaimerChoice').append('<option>' + disc + '</option>');
        }
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this,
            searchBoxVal: 'Search...'
        });
        this.HelpEditor = new MarkdownWidget({
            prefix: 'homepage',
            placeholder: 'Enter disclaimer text',
            parentView: this,
            parent: this.folder,
            enableUploads: false
        });
        this.HelpEditor.setElement(this.$('#mainPage')).render();
        return this;
    },
    _saveDisclaimer: function (inData) {
        restRequest({
            type: 'PUT',
            path: 'journal/disclaimer?tag=disclaimer',
            data: {
                list: JSON.stringify(inData)
            },
            error: null
        }).done((resp) => {
            events.trigger('g:alert', {
                icon: 'ok',
                text: 'Disclaimer saved.',
                type: 'success',
                timeout: 4000
            });
        });
    }
});

export default ManageDisclaimerView;
