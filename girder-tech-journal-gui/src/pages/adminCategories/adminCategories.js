import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import adminCategoriesTemplate from './adminCategories.pug';
import adminCategoriesEntryTemplate from './adminCategories_entry.pug';

const adminCategoriesPage = View.extend({
    events: {
        'click .DeleteRootLink': function (event) {
            var catName = $(event.currentTarget).siblings('h4').text();
            restRequest({
                type: 'DELETE',
                path: `journal/category?text=${catName}&tag=disclaimer`
            }).done((resp) => {
                $(event.currentTarget).closest('.TreeEntry').remove();
            });
        },
        'click .AddRootLink': function (event) {
            $('.AddRootCategory').show();
        },
        'click .categoryObj': function (event) {
            this.categoryObj = event.currentTarget;
            $('.AddCategory').show();
        },
        'submit #addTree': function (event) {
            event.preventDefault();
            var newCatName = this.$('#newTreeName').val();
            //  Call out to category API to save initial object
            restRequest({
                type: 'POST',
                path: `journal/category?text=${newCatName}&tag=disclaimer`
            }).done((resp) => {
                this.$('#treeWrapper').html(this.$('#treeWrapper').html() + adminCategoriesEntryTemplate({'name': newCatName, 'values': []}));
            });
        },
        'submit #addRootCategoryForm': function (event) {
            event.preventDefault();
            var parent = $(event.currentTarget).parent();
            parent.siblings('.categoryTree').find('.categoryList').append('<li class="categoryObj">' + $(event.currentTarget).children().first().val() + '</li>');
            var catName = parent.siblings('h4').text();
            var valueData = {'key': catName, 'value': []};
            parent.siblings('.categoryTree').find('.categoryList').find('li').each(function (index, val) {
                valueData['value'].push($(val).text());
            });

            restRequest({
                type: 'PUT',
                path: 'journal/category?tag=categories',
                data: {
                    list: JSON.stringify([valueData])
                }
            });
        },
        'submit #addNewChildCategory': function (event) {
            event.preventDefault();
            // Change old li object to ul to allow for subcategories?
            // $(this.categoryObj).closest(".categoryTree ul").append('<ul><li class="categoryObj">'+$(event.currentTarget).children().first().val()+'</li></ul>')
        }
    },
    initialize: function (query) {
        restRequest({
            type: 'GET',
            path: 'journal/categories?tag=categories'
        }).done((resp) => {
            this.render(resp);
        }); // End getting of OTJ Collection value setting
    },
    render: function (subData) {
        this.$el.html(adminCategoriesTemplate());
        for (var key in subData) {
            this.$('#treeWrapper').html(this.$('#treeWrapper').html() + adminCategoriesEntryTemplate({'name': subData[key]['key'], 'values': subData[key]['value']}));
        }
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this
        });
        return this;
    }
});

export default adminCategoriesPage;
