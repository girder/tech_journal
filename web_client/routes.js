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
router.route('plugins/journal/journal', 'journalConfig', function () {
    events.trigger('g:navigateTo', indexView,{},{layout: Layout.EMPTY});
});

import selectIssueView from './views/selectIssue';
router.route('plugins/journal/journal/selectIssue', 'selectIssue', function () {
    events.trigger('g:navigateTo', selectIssueView,{},{layout: Layout.EMPTY});
});

import submitView from './views/submit';
router.route('plugins/journal/journal/submit', 'submitInfo', function (id) {
    events.trigger('g:navigateTo', submitView,{id:id},{layout: Layout.EMPTY});
});

import uploadView from './views/upload';
router.route('plugins/journal/journal/upload', 'uploadFiles', function (id) {
    events.trigger('g:navigateTo', uploadView,{id:id},{layout: Layout.EMPTY});
});

import submissionView from './views/view';
router.route('plugins/journal/journal/view', 'submissionView', function (id) {
    events.trigger('g:navigateTo', submissionView,{id:id},{layout: Layout.EMPTY});
});

import downloadView from './views/download';
router.route('plugins/journal/journal/download', 'submissionDownload', function (id) {
    events.trigger('g:navigateTo', downloadView,{id:id},{layout: Layout.EMPTY});
});
