import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import HomeTemplate from './home.pug';
import IndexEntryViewTemplate from '../../templates/journal_index_entry.pug';
import CategoryTemplate from './home_categoryTemplate.pug';

const HomePage = View.extend({
    events: {
        'click #search_button': function (event) {
            // search the available submissions for the text entered in the box
            var searchText = $('#live_search').val();
            restRequest({
                type: 'GET',
                path: `journal/${this.collectionID}/search?text=${searchText}`
            }).done((resp) => {
                this.render(resp, searchText, this.collectionID, 0);
            });
        },
        'click #clear_button': function (event) {
            // search the available submissions for the text entered in the box
            this.initialize();
        },
        'click .issueTitle': function (event) {
            // search the available submissions for the text entered in the box
            $('.issueSelected').removeClass('issueSelected');
            $(event.currentTarget.parentNode).addClass('issueSelected');
            // Use the journal API to filter by selected submission
            restRequest({
                type: 'GET',
                path: `journal/${this.defaultJournal}/submissions?strtIndex=0&filterID=${$(event.currentTarget.parentNode).attr('key')}`
            }).done((jrnResp) => {
                // Only update the search results, leaving the menu bar and selected issue intact.
                this.$('.searchResults').html(IndexEntryViewTemplate({info: {'submissions': jrnResp}}));
            });
        },
        'click #showMoreResults': function (event) {
            this.getSubmissions(this.collectionID, this.querystring, $('.SearchResultEntry').length);
        },
        'click .filterOption': function (event) {
            var queryString = '';
            if (this.$('.filterOption:checked').length) {
                this.$('.categoryTree').each(function (index, category) {
                    var catName = $(category).siblings('h4').text();
                    if (queryString !== '') {
                        queryString += ',';
                    }
                    queryString += `"${catName}":[`;
                    var innerQuery = '';
                    $(category).find('.filterOption:checked').each(function (index, filter) {
                        if (innerQuery !== '') {
                            innerQuery += ',';
                        }
                        innerQuery += `"${$(filter).attr('val')}"`;
                    });
                    queryString += `${innerQuery}]`;
                });
                this.querySubmissions(this.collectionID, queryString, 0);
            } else {
                this.initialize(this.querystring);
            }
        }
    },
    initialize: function (query) {
        restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify([
                    'tech_journal.default_journal'
                ])
            }
        }).done((resp) => {
            this.defaultJournal = resp['tech_journal.default_journal'];
            this.collectionID = this.defaultJournal;
            this.querystring = '*';
            if (!$.isEmptyObject(query.collection)) {
                this.collectionID = query.collection;
            }

            if (!$.isEmptyObject(query.query)) {
                this.querystring = query.query;
                this.querySubmissions(this.collectionID, this.querystring, 0);
            } else {
                this.getSubmissions(this.collectionID, this.querystring, 0);
            }
        }); // End getting of OTJ Collection value setting
    },
    render: function (subData, searchVal, collection, startIndex) {
        var pendingSubs = 0;
        restRequest({
            type: 'GET',
            path: `journal/${collection}/issues`
        }).done((jrnResp) => {
            restRequest({
                type: 'GET',
                path: `journal/${this.defaultJournal}/pending?`
            }).done((pendRsp) => {
                pendingSubs = pendRsp.length;
                if (!this.$('.searchResults').length) {
                    this.$el.html(HomeTemplate({info: { 'issues': jrnResp }}));
                }
                if (startIndex === 0) {
                    this.$('.searchResults').html('');
                }
                this.$('.searchResults').html(this.$('.searchResults').html() + IndexEntryViewTemplate({info: {'submissions': subData}}));
                new MenuBarView({ // eslint-disable-line no-new
                    el: this.$el,
                    parentView: this,
                    searchBoxVal: searchVal,
                    pendingSubNum: pendingSubs
                });
                if (this.$('#treeWrapper').find('.treeEntry').length < 3) {
                    restRequest({
                        type: 'GET',
                        path: 'journal/categories'
                    }).done((resp) => {
                        for (var key in resp) {
                            this.$('#treeWrapper').html(this.$('#treeWrapper').html() + CategoryTemplate({'catName': resp[key]['key'], 'values': resp[key]['value']}));
                        }
                    }); // End getting of OTJ Collection value setting
                }
            });
        });
        return this;
    },

    querySubmissions: function (collection, queryString, startIndex) {
        restRequest({
            type: 'GET',
            path: `journal/${collection}/search?query={${queryString}}`
        }).done((jrnResp) => {
            this.render(jrnResp, 'Search...', collection, startIndex);
        });
    },
    getSubmissions: function (collection, queryString, startIndex) {
        restRequest({
            type: 'GET',
            path: `journal/${collection}/submissions?strtIndex=${startIndex}&filterID=*`,
            params: {
                filterID: '*'
            }
        }).done((jrnResp) => {
            this.render(jrnResp, 'Search...', collection, startIndex);
        });
    }
});

export default HomePage;
