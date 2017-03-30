import _ from 'underscore';

import PluginConfigBreadcrumbWidget from 'girder/views/widgets/PluginConfigBreadcrumbWidget';
import View from 'girder/views/View';
import events from 'girder/events';
import MenuBarView from './menuBar.js';
import { restRequest } from 'girder/rest';
import { apiRoot } from 'girder/rest';

// Import all stylesheets
import '../stylesheets/main.styl';
import '../stylesheets/index.index.styl';
import '../stylesheets/submit.index.styl';
import '../stylesheets/submit.upload.styl';
import '../stylesheets/view.index.styl';

import IndexViewTemplate from '../templates/journal_index.jade';
import IndexEntryViewTemplate from '../templates/journal_index_entry.jade';


var indexView = View.extend({
    events: {
        'click #search_button': function(event) {
            //search the available submissions for the text entered in the box
            var searchText = $('#live_search').val()
            restRequest({
                type: 'GET',
                path: 'folder?text='+searchText+'&parentType=folder'
            }).done(_.bind(function (resp) {
                this.render(resp, searchText)
            }, this));
        },
        'click #clear_button': function(event) {
            //search the available submissions for the text entered in the box
            this.initialize();
        },
        'click .issueTitle': function(event) {
            //search the available submissions for the text entered in the box
            $('.issueSelected').removeClass("issueSelected")
            $(event.currentTarget.parentNode).addClass('issueSelected');
            // Use the journal API to filter by selected submission
            restRequest({
                type: 'GET',
                path: 'journal/'+this.defaultJournal +'/submissions?filterID='+$(event.currentTarget.parentNode).attr('key')
            }).done(_.bind(function (jrnResp) {
                // Only update the search results, leaving the menu bar and selected issue intact.
                this.$('.searchResults').html(IndexEntryViewTemplate({info:{"submissions":jrnResp}}));
            },this));
        },
    },
    initialize: function (query) {
        var totalData=[]
        restRequest({
            type: 'GET',
            path: 'journal/setting',
            data: {
                list: JSON.stringify([
                    'technical_journal.default_journal',
                ])
            }
        }).done(_.bind(function (resp) {
            this.defaultJournal = resp['technical_journal.default_journal']
            var collectionID = this.defaultJournal;
            var querystring='*'
            if(!$.isEmptyObject(query["collection"])) {
                collectionID = query["collection"]
            }
            if(!$.isEmptyObject(query["query"])) {
                querystring= query["query"];
                this.querySubmissions(collectionID,querystring)
            }

            this.getSubmissions(collectionID,querystring)
        }, this));  // End getting of OTJ Collection value setting
    },
    render: function (subData, searchVal,collection) {
        restRequest({
            type: 'GET',
            path: 'journal/'+collection +'/issues'
        }).done(_.bind(function (jrnResp) {
            this.$el.html(IndexViewTemplate({info:{"issues":jrnResp   }}));
            this.$('.searchResults').html(IndexEntryViewTemplate({info:{"submissions":subData}}));
            new MenuBarView({ el: this.$el, parentView: this, searchBoxVal: searchVal});
        },this));

        return this;
    },

    querySubmissions: function(collection, queryString) {
        restRequest({
            type: 'GET',
            path: 'journal/'+collection+'/search?query={'+queryString+'}'
        }).done(_.bind(function (jrnResp) {
            this.render(jrnResp,"Search...",collection);
        },this));
    },
    getSubmissions: function (collection, queryString) {
        restRequest({
            type: 'GET',
            path: 'journal/'+collection +'/submissions?filterID=*',
            params: {
              filterID:"*"
            }
        }).done(_.bind(function (jrnResp) {
            this.render(jrnResp,"Search...",collection);
        },this));
    }
});

export default indexView;

