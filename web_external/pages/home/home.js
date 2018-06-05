import View from 'girder/views/View';
import router from 'girder/router';
import { restRequest } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import HomeTemplate from './home.pug';
import IndexEntryViewTemplate from '../../templates/journal_index_entry.pug';
import CategoryTemplate from './home_categoryTemplate.pug';

const HomePage = View.extend({
    events: {
        'click #search_button': function (event) {
            // search the available submissions for the text entered in the box
            this.buildSearch(this.collectionID, 0);
        },
        'click #clear_button': function (event) {
            // search the available submissions for the text entered in the box
            this.$('#live_search').val('');
            this.$('.filterOption:checked').each(function (index, filter) {
                filter.checked = false;
            });
            if (window.location.hash) {
                router.navigate(``, {trigger: true});
            } else {
                this.buildSearch(this.collectionID, 0);
            }
        },
        'click .issueTitle': function (event) {
            // search the available submissions for the text entered in the box
            $('.issueSelected').removeClass('issueSelected');
            $(event.currentTarget.parentNode).addClass('issueSelected');
            // Use the journal API to filter by selected submission
            this.buildSearch(this.collectionID, 0);
        },
        'click #showMoreResults': function (event) {
            this.buildSearch(this.collectionID, this.$('.SearchResultEntry').length);
        },
        'click .filterOption': function (event) {
            this.buildSearch(this.collectionID, 0);
        }
    },
    initialize: function (query) {
        restRequest({
            type: 'GET',
            url: 'journal/setting',
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
            this.buildSearch(this.collectionID, 0);
        }); // End getting of OTJ Collection value setting
    },
    render: function (subData, searchVal, collection, startIndex) {
        var pendingSubs = 0;
        restRequest({
            type: 'GET',
            url: `journal/${collection}/issues`
        }).done((jrnResp) => {
            restRequest({
                type: 'GET',
                url: `journal/${this.defaultJournal}/pending?`
            }).done((pendRsp) => {
                pendingSubs = pendRsp.length;
                if (!this.$('.searchResults').length) {
                    this.$el.html(HomeTemplate({info: { 'issues': jrnResp }}));
                }
                // Check to see if we blank the existing submissions or not
                if (startIndex === 0) {
                    this.$('.searchResults').html('');
                }
                var submissions = subData;
                // Check to see if we need the "See more files" link
                if (startIndex + 20 > subData.length) {
                    this.$('#showMoreResults').hide();
                } else {
                    submissions = subData.slice(startIndex, startIndex + 20);
                    this.$('#showMoreResults').show();
                }
                // Check to see if we have to add the "No results" message
                if (subData.length === 0) {
                    this.$('#noResultElement').show();
                } else {
                    this.$('#noResultElement').hide();
                    this.$('.searchResults').html(this.$('.searchResults').html() + IndexEntryViewTemplate({info: {'submissions': submissions}}));
                }
                new MenuBarView({ // eslint-disable-line no-new
                    el: this.$el,
                    parentView: this,
                    searchBoxVal: searchVal,
                    pendingSubNum: pendingSubs
                });
                if (this.$('#treeWrapper').find('.treeEntry').length < 3) {
                    restRequest({
                        type: 'GET',
                        url: 'journal/categories?tag=categories'
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

    buildSearch: function (collection, startIndex) {
        /* Add all objects to the json file to query
        *
        *  targetIssue
        *  text in live_search
        *  selected filters
        *
        */
        var queryString = '';
        if (window.location.hash && !window.location.hash.includes('dialog')) {
            queryString += decodeURI(window.location.hash.substring(8));
        }

        var searchText = $('#live_search').val();
        if (searchText !== undefined && searchText !== '') {
            if (queryString !== '') {
                queryString += ',';
            }
            searchText = searchText.replace(/"/g, '&quot;');
            queryString += `"text": "${searchText}"`;
        }
        var issueId = $('.issueSelected').attr('key');
        if (issueId !== undefined && issueId !== '' && issueId !== '*') {
            if (queryString !== '') {
                queryString += ',';
            }
            queryString += `"issueId": "${issueId}"`;
        }
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
                    innerQuery += '"' + $(filter).attr('val') + '"';
                });
                queryString += innerQuery + ']';
            });
        }
        this.querySubmissions(this.collectionID, queryString, startIndex);
    },
    querySubmissions: function (collection, queryString, startIndex) {
        restRequest({
            type: 'GET',
            url: `journal/${collection}/search?query={` + encodeURIComponent(queryString) + '}'
        }).done((jrnResp) => {
            this.render(jrnResp, $('#live_search').val(), collection, startIndex);
        });
    }
});

export default HomePage;
