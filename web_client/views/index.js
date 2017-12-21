import _ from 'underscore';

import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

// Import all stylesheets
import '../stylesheets/main.styl';
import '../stylesheets/index.index.styl';
import '../stylesheets/submit.index.styl';
import '../stylesheets/submit.upload.styl';
import '../stylesheets/view.index.styl';
import '../stylesheets/item.comments.styl';

import MenuBarView from './menuBar.js';
import IndexViewTemplate from '../templates/journal_index.jade';
import IndexEntryViewTemplate from '../templates/journal_index_entry.jade';

var indexView = View.extend({
    events: {
        'click #search_button': function (event) {
            // search the available submissions for the text entered in the box
            var searchText = $('#live_search').val();
            restRequest({
                type: 'GET',
                path: 'folder?text=' + searchText + '&parentType=folder'
            }).done(_.bind(function (resp) {
                this.render(resp, searchText);
            }, this));
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
                path: 'journal/' + this.defaultJournal + '/submissions?filterID=' + $(event.currentTarget.parentNode).attr('key')
            }).done(_.bind(function (jrnResp) {
                // Only update the search results, leaving the menu bar and selected issue intact.
                this.$('.searchResults').html(IndexEntryViewTemplate({info: {'submissions': jrnResp}}));
            }, this));
        },
        'click #showMoreResults': function (event) {
            this.getSubmissions(this.defaultJournal, this.querystring, $('.SearchResultEntry').length);
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
        }).done(_.bind(function (resp) {
            this.defaultJournal = resp['tech_journal.default_journal'];
            var collectionID = this.defaultJournal;
            this.querystring = '*';
            if (!$.isEmptyObject(query['collection'])) {
                collectionID = query['collection'];
            }
            if (!$.isEmptyObject(query['query'])) {
                this.querystring = query['query'];
                this.querySubmissions(collectionID, this.querystring, 0);
            }

            this.getSubmissions(collectionID, this.querystring, 0);
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subData, searchVal, collection) {
        var pendingSubs = 0;
        subData.forEach(function (d) {
            if (d.curation.status === 'REQUESTED') { pendingSubs++; }
        });
        restRequest({
            type: 'GET',
            path: 'journal/' + collection + '/issues'
        }).done(_.bind(function (jrnResp) {
            this.$el.html(IndexViewTemplate({info: { 'issues': jrnResp }}));
            this.$('.searchResults').html(this.$('.searchResults').html() + IndexEntryViewTemplate({info: {'submissions': subData}}));
            new MenuBarView({ el: this.$el,
                parentView: this,
                searchBoxVal: searchVal,
                pendingSubNum: pendingSubs });
        }, this));

        return this;
    },

    querySubmissions: function (collection, queryString, startIndex) {
        restRequest({
            type: 'GET',
            path: 'journal/' + collection + '/search?query={' + queryString + '}'
        }).done(_.bind(function (jrnResp) {
            this.render(jrnResp, 'Search...', collection);
        }, this));
    },
    getSubmissions: function (collection, queryString, startIndex) {
        restRequest({
            type: 'GET',
            path: 'journal/' + collection + '/submissions?strtIndex=' + startIndex + '&filterID=*',
            params: {
                filterID: '*'
            }
        }).done(_.bind(function (jrnResp) {
            if (startIndex === 0) {
                this.render(jrnResp, 'Search...', collection);
            } else {
                this.$('.searchResults').html(this.$('.searchResults').html() + IndexEntryViewTemplate({info: {'submissions': jrnResp}}));
            }
        }, this));
    }
});

export default indexView;
