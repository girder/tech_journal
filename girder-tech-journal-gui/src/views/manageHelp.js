import View from '@girder/core/views/View';
import events from '@girder/core/events';
import MarkdownWidget from '@girder/core/views/widgets/MarkdownWidget';
import { restRequest } from '@girder/core/rest';

import MenuBarView from './menuBar.js';
import manageHelpViewTemplate from '../templates/journal_admin_help.pug';

var ManageHelpView = View.extend({

    events: {
        'submit #mainForm': function (event) {
            event.preventDefault();
            // save Content to show on other pages
            this._saveHelp([
                { key: 'main', value: this.HelpEditor.val(), 'tag': 'help' },
                { key: 'about', value: this.AboutEditor.val(), 'tag': 'help' },
                { key: 'faq', value: this.FAQEditor.val(), 'tag': 'help' }
            ]);
        }
    },
    initialize: function () {
        restRequest({
            method: 'GET',
            url: 'journal/setting',
            data: {
                list: JSON.stringify(['main', 'about', 'faq'])
            }
        }).done((resp) => {
            this.render(resp);
        });
    },
    render: function (existingPages) {
        this.$el.html(manageHelpViewTemplate());
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this,
            searchBoxVal: 'Search...'
        });
        this.HelpEditor = new MarkdownWidget({
            prefix: 'homepage',
            placeholder: 'Enter Markdown for the Help Page',
            parentView: this,
            parent: this.folder,
            enableUploads: false
        });
        this.FAQEditor = new MarkdownWidget({
            prefix: 'homepage',
            placeholder: 'Enter Markdown for the FAQ Page',
            parentView: this,
            parent: this.folder,
            enableUploads: false
        });

        this.AboutEditor = new MarkdownWidget({
            prefix: 'homepage',
            placeholder: 'Enter Markdown for the About Page',
            parentView: this,
            enableUploads: false
        });

        // Prepopulate the pages
        this.HelpEditor.text = existingPages.main;
        this.HelpEditor.setElement(this.$('#mainPage')).render();
        this.FAQEditor.text = existingPages.faq;
        this.FAQEditor.setElement(this.$('#faqPage')).render();
        this.AboutEditor.text = existingPages.about;
        this.AboutEditor.setElement(this.$('#aboutPage')).render();
        return this;
    },
    _saveHelp: function (inData) {
        restRequest({
            method: 'PUT',
            url: 'journal/setting',
            data: {
                list: JSON.stringify(inData)
            },
            error: null
        }).done((resp) => {
            events.trigger('g:alert', {
                icon: 'ok',
                text: 'Help Pages saved.',
                type: 'success',
                timeout: 4000
            });
        });
    }
});

export default ManageHelpView;
