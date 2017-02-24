import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import router from 'girder/router';
import { getCurrentUser } from 'girder/auth'
import { restRequest } from 'girder/rest';

import MenuBarViewTemplate from '../templates/journal_menu_bar.pug';


var MenuBarView = View.extend({

    events: {
       'click #logout': function(event) {
         restRequest({
            type: 'DELETE',
            path: 'user/authentication'
         }).done(_.bind(function (resp) {
            window.location.reload();
         }))
       },
       'mouseleave #userOptionsList': function(event) {
         this.$("#userOptionsList").attr('style','display: none;')
       },
       'mouseenter #profileLink': function(event) {
         this.$("#adminOptionsList").attr('style','display: none;')
         this.$("#userOptionsList").attr('style','display: block;')
       },
       'mouseleave #adminOptionsList': function(event) {
         this.$("#adminOptionsList").attr('style','display: none;')
       },
       'mouseenter #adminLink': function(event) {
         this.$("#userOptionsList").attr('style','display: none;')
         this.$("#adminOptionsList").attr('style','display: block;')
       }
    },
    initialize: function(options) {
        this.options= options;
        this.render(getCurrentUser())
    },
    render: function(curUser) {

        this.$("#headerBar").html(MenuBarViewTemplate({user:curUser, searchVal:this.options.searchBoxVal }));
        return this;
    }
});

export default MenuBarView

