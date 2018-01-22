import View from 'girder/views/View';
import events from 'girder/events';
import MarkdownWidget from 'girder/views/widgets/MarkdownWidget';
import { restRequest } from 'girder/rest';

import MenuBarView from './menuBar.js';
import manageHelpViewTemplate from '../templates/journal_admin_help.jade';

var ManageHelpView = View.extend({

    events: {
        'submit #mainForm': function (event) {
            event.preventDefault();
            // save Content to show on other pages
            this._saveHelp([
                { key: 'main', value: this.HelpEditor.val() },
                { key: 'about', value: this.AboutEditor.val() },
                { key: 'faq', value: this.FAQEditor.val() }
            ]);
        }
    },
    initialize: function () {
        restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify(['main', 'about', 'faq'])
            }
        }).done((resp) => {
            this.render(resp);
        });
    },
    render: function (existingPages) {
        this.$el.html(manageHelpViewTemplate());
        new MenuBarView({ el: this.$el, parentView: this, searchBoxVal: 'Search...' });
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
            type: 'PUT',
            path: 'journal/setting',
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
