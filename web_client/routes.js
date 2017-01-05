import router from 'girder/router';
import events from 'girder/events';
import { Layout } from 'girder/constants';
import { exposePluginConfig } from 'girder/utilities/PluginUtils';

exposePluginConfig('technical_journal', 'plugins/journal/config');

import configView from './views/ConfigView';
router.route('plugins/journal/config', 'journalConfig', function () {
    events.trigger('g:navigateTo', configView);
});

import indexView from './views/index';
router.route('plugins/journal', 'mainView', function () {
    events.trigger('g:navigateTo', indexView,{},{layout: Layout.EMPTY});
});

import submitView from './views/submit';
router.route('plugins/journal/submission/new', 'submissionInfo', function () {
    events.trigger('g:navigateTo', submitView,{},{layout: Layout.EMPTY});
});

import uploadView from './views/upload';
router.route('plugins/journal/submission/:id/upload', 'uploadFiles', function (id) {
    events.trigger('g:navigateTo', uploadView,{id:id},{layout: Layout.EMPTY});
});

import submissionView from './views/view';
router.route('plugins/journal/view/:id', 'submissionView', function (id) {
    console.log(id);
    events.trigger('g:navigateTo', submissionView,{id:id},{layout: Layout.EMPTY});
});

import downloadView from './views/download';
router.route('plugins/journal/view/:id/download', 'submissionDownload', function (id) {
    events.trigger('g:navigateTo', downloadView,{id:id},{layout: Layout.EMPTY});
});
import manageJournalView from './views/manageJournal';
router.route('plugins/journal/admin', 'manageJournalView', function () {
    events.trigger('g:navigateTo', manageJournalView,{},{layout: Layout.EMPTY});
});

import EditIssueView from './views/editIssue';
router.route('plugins/journal/admin/issue/:id/:type', 'editIssue', function (id, type) {
    events.trigger('g:navigateTo', EditIssueView,{id: id, type:type},{layout: Layout.EMPTY});
});

import EditJournalView from './views/editJournal';
//Existing journal route
router.route('plugins/journal/admin/journal/:id', 'editJournal', function (id) {
    events.trigger('g:navigateTo', EditJournalView,{id:id},{layout: Layout.EMPTY});

});
