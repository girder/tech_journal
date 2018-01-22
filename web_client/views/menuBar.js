import View from 'girder/views/View';
import { getCurrentUser } from 'girder/auth';
import { restRequest } from 'girder/rest';

import MenuBarViewTemplate from '../templates/journal_menu_bar.pug';

var MenuBarView = View.extend({

    events: {
        'click #logout': function (event) {
            restRequest({
                type: 'DELETE',
                path: 'user/authentication'
            }).done((resp) => {
                window.location.reload();
            });
        },
        'mouseenter #profileLink': function (event) {
            this.$('#adminOptionsList').attr('style', 'display: none;');
            this.$('#helpOptionsList').attr('style', 'display: none;');
            this.$('#userOptionsList').attr('style', 'display: block;');
        },
        'mouseenter #helpLink': function (event) {
            this.$('#helpOptionsList').attr('style', 'display: block;');
            this.$('#adminOptionsList').attr('style', 'display: none;');
            this.$('#userOptionsList').attr('style', 'display: none;');
        },
        'mouseenter #adminLink': function (event) {
            this.$('#userOptionsList').attr('style', 'display: none;');
            this.$('#helpOptionsList').attr('style', 'display: none;');
            this.$('#adminOptionsList').attr('style', 'display: block;');
        },
        'mouseleave #adminOptionsList': function (event) {
            this.$('#adminOptionsList').attr('style', 'display: none;');
        },
        'mouseleave #userOptionsList': function (event) {
            this.$('#userOptionsList').attr('style', 'display: none;');
        },
        'mouseleave #helpOptionsList': function (event) {
            this.$('#helpOptionsList').attr('style', 'display: none;');
        },
        'mouseleave #adminLink': function (event) {
            this.$('#adminOptionsList').attr('style', 'display: none;');
        },
        'mouseleave #profileLink': function (event) {
            this.$('#userOptionsList').attr('style', 'display: none;');
        },
        'mouseleave #helpLink': function (event) {
            this.$('#helpOptionsList').attr('style', 'display: none;');
        }
    },
    initialize: function (options) {
        this.options = options;
        this.render(getCurrentUser());
    },
    render: function (curUser) {
        this.$('#headerBar').html(MenuBarViewTemplate({ user: curUser, searchVal: this.options.searchBoxVal, approvalNum: this.options.pendingSubNum }));
        return this;
    }
});

export default MenuBarView;
