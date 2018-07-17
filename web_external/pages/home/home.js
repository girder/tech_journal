import View from 'girder/views/View';
import router from 'girder/router';
import { restRequest } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import HomeTemplate from './home.pug';
import IndexEntryViewTemplate from '../../templates/journal_index_entry.pug';
import CategoryTemplate from './home_categoryTemplate.pug';

var magicTerms = ['authors', 'institution', 'creatorId', 'tags'];

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
            this.render('', this.collectionID, 0);
        }); // End getting of OTJ Collection value setting
    },
    render: function (searchVal, collection, startIndex) {
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
                this.$el.html(HomeTemplate({info: { 'issues': jrnResp }}));
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
                        // Put URL hash additions into text box as "magic" terms
                        if (window.location.hash && !window.location.hash.includes('dialog')) {
                            var queryString = decodeURI(window.location.hash.substring(8));
                            if (queryString.indexOf('category') !== -1) {
                                var categoryVal = queryString.substring(13, queryString.length - 2);
                                this.$(`.filterOption[val=${categoryVal}]`)[0].checked = true;
                            } else if ($('#live_search').val().indexOf(queryString) === -1) {
                                $('#live_search').val($('#live_search').val() + queryString);
                            }
                        }
                        this.buildSearch(this.collectionID, 0);
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
        var searchText = $('#live_search').val();
        queryString += this.findSearchTerms(searchText, queryString);
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
            // Check to see if we blank the existing submissions or not
            if (startIndex === 0) {
                this.$('.searchResults').html('');
            }
            var submissions = jrnResp;
            // Check to see if we need the "See more files" link
            if (startIndex + 20 > jrnResp.length) {
                this.$('#showMoreResults').hide();
            } else {
                submissions = jrnResp.slice(startIndex, startIndex + 20);
                this.$('#showMoreResults').show();
            }
            // Check to see if we have to add the "No results" message
            if (jrnResp.length === 0) {
                this.$('#noResultElement').show();
            } else {
                this.$('#noResultElement').hide();
                this.$('.searchResults').html(this.$('.searchResults').html() + IndexEntryViewTemplate({info: {'submissions': submissions}}));
            }
        });
    },
    findSearchTerms: function (searchText, queryString) {
        var terms = [];
        if (searchText !== undefined && searchText !== '') {
            if (queryString !== '') {
                queryString += ',';
            }

            var inQuotes = false;
            var tmpStr = '';
            for (var i = 0; i < searchText.length; i++) {
                if (searchText.charAt(i) === ' ') {
                    if (!inQuotes) {
                        terms.push(tmpStr);
                        tmpStr = '';
                    }
                } else if (searchText.charAt(i) === '\'' || searchText.charAt(i) === '"') {
                    inQuotes = !inQuotes;
                }
                tmpStr += searchText.charAt(i);
            }
            terms.push(tmpStr);
            terms.forEach(function (searchVal) {
                var magicFound = false;
                magicTerms.forEach(function (termVal) {
                    if (searchVal.indexOf(termVal) !== -1) {
                        magicFound = true;
                    }
                });
                if (queryString !== '') {
                    queryString += ',';
                }
                if (magicFound) {
                    queryString += searchVal;
                } else {
                    searchVal = searchVal.replace(/"/g, '&quot;');
                    queryString += `"text": "${searchVal}"`;
                }
            });
        }
        return queryString;
    }
});

export default HomePage;
