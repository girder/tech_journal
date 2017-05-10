import _ from 'underscore';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import MenuBarView from './menuBar.js';
import { getCurrentUser } from 'girder/auth'
import { restRequest } from 'girder/rest';

import manageHelpViewTemplate from '../templates/journal_admin_help.jade';

import tinymce from 'tinymce/tinymce'
require('tinymce/themes/modern/theme')

var ManageHelpView = View.extend({

    events: {
      'submit #mainForm': function(event) {
        event.preventDefault();
        // save Content to show on other pages
        this._saveHelp([
        {key: "main", value: $("#mainPage p").text().trim()},
        {key: "about", value: $("#aboutPage p").text().trim()},
        {key: "faq"  , value: $("#faqPage p").text().trim()}
        ])
      }
    },
    initialize: function() {
        restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify(['main','about','faq'])
            }
        }).done(_.bind(function (resp) {
            this.render(resp);
        }, this));
    },
    render: function(existingPages) {
            this.$el.html(manageHelpViewTemplate());
            new MenuBarView({ el: this.$el, parentView: this, searchBoxVal: "Search..."});
            tinymce.init({selector:".textDiv", mode : "exact", inline:true,skin:false ,height:500, menubar: false,toolbar: 'undo redo'});
            // Prepopulate the pages
              this.$("#mainPage p").text(existingPages['main'])
              this.$("#faqPage p").text(existingPages['faq'])
              this.$("#aboutPage p").text(existingPages['about'])
        return this;
    },
    _saveHelp: function(inData) {
        restRequest({
            type: 'PUT',
            path: 'journal/setting',
            data: {
                list: JSON.stringify(inData)
            },
            error: null
        }).done(_.bind(function (resp) {
            events.trigger('g:alert', {
                icon: 'ok',
                text: 'Help Pages saved.',
                type: 'success',
                timeout: 4000
            });
        },this));
    }
});

export default ManageHelpView
