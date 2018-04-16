import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

import MenuBarView from '../../views/menuBar.js';
import HomeTemplate from './home.pug';
import IndexEntryViewTemplate from '../../templates/journal_index_entry.pug';

const HomePage = View.extend({
    events: {
        'click #search_button': async function () {
            // search the available submissions for the text entered in the box
            const searchText = $('#live_search').val();
            const resp = await restRequest({
                type: 'GET',
                path: `journal/${this.collectionID}/search?text=${searchText}`
            });
            this.render(resp, searchText, this.collectionID);
        },
        'click #clear_button': function (event) {
            // search the available submissions for the text entered in the box
            this.initialize();
        },
        'click .issueTitle': async function (event) {
            // search the available submissions for the text entered in the box
            $('.issueSelected').removeClass('issueSelected');
            $(event.currentTarget.parentNode).addClass('issueSelected');
            // Use the journal API to filter by selected submission
            const jrnResp = await restRequest({
                type: 'GET',
                path: `journal/${this.defaultJournal}/submissions?strtIndex=0&filterID=${$(event.currentTarget.parentNode).attr('key')}`
            });

            // Only update the search results, leaving the menu bar and selected issue intact.
            this.$('.searchResults').html(IndexEntryViewTemplate({info: {'submissions': jrnResp}}));
        },
        'click #showMoreResults': function (event) {
            this.getSubmissions(this.collectionID, this.querystring, $('.SearchResultEntry').length);
        }
    },
    initialize: async function (query) {
        const resp = await restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify([
                    'tech_journal.default_journal'
                ])
            }
        });

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
    },
    render: async function (subData, searchVal, collection) {
        var pendingSubs = 0;
        const jrnResp = await restRequest({
            type: 'GET',
            path: `journal/${collection}/issues`
        });

        const pendRsp = await restRequest({
            type: 'GET',
            path: `journal/${this.defaultJournal}/pending?`
        });

        pendingSubs = pendRsp.length;
        this.$el.html(HomeTemplate({
            info: { 'issues': jrnResp }
        }));
        this.$('.searchResults').html(this.$('.searchResults').html() + IndexEntryViewTemplate({info: {'submissions': subData}}));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this,
            searchBoxVal: searchVal,
            pendingSubNum: pendingSubs
        });

        return this;
    },

    querySubmissions: async function (collection, queryString, startIndex) {
        const jrnResp = await restRequest({
            type: 'GET',
            path: `journal/${collection}/search?query={${queryString}}`
        });

        this.render(jrnResp, 'Search...', collection);
    },
    getSubmissions: async function (collection, queryString, startIndex) {
        const jrnResp = await restRequest({
            type: 'GET',
            path: `journal/${collection}/submissions?strtIndex=${startIndex}&filterID=*`,
            params: {
                filterID: '*'
            }
        });

        if (startIndex === 0) {
            this.render(jrnResp, 'Search...', collection);
        } else {
            this.$('.searchResults').html(this.$('.searchResults').html() + IndexEntryViewTemplate({info: {'submissions': jrnResp}}));
        }
    }
});

export default HomePage;
