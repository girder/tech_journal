import View from '@girder/core/views/View';
import { getCurrentUser } from '@girder/core/auth';
import { restRequest } from '@girder/core/rest';

import MenuBarViewTemplate from '../templates/journal_menu_bar.pug';
import '../pages/register/RegisterView';

var MenuBarView = View.extend({

    events: {
        'click #logout': function (event) {
            restRequest({
                method: 'DELETE',
                url: 'user/authentication'
            }).done((resp) => {
                window.location = '/tech_journal';
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
        this.$el.html(MenuBarViewTemplate({ user: curUser, searchVal: this.options.searchBoxVal, approvalNum: this.options.pendingSubNum }));
        return this;
    }
});

export default MenuBarView;
