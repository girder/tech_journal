import router from 'girder/router';
import events from 'girder/events';
import LoginView from 'girder/views/layout/LoginView';
import { getCurrentUser } from 'girder/auth'
import { Layout } from 'girder/constants';
import { exposePluginConfig } from 'girder/utilities/PluginUtils';

exposePluginConfig('technical_journal', 'plugins/journal/config');


import configView from './views/ConfigView';
router.route('plugins/journal/config', 'journalConfig', function () {
    testUserAccess(configView,{},true,true);
});

import indexView from './views/index';
router.route('plugins/journal', 'mainView', function (query) {
    testUserAccess(indexView, query, false, false)
});

import submitView from './views/submit';
import editView from './views/editSubmission'
router.route('plugins/journal/submission/new', 'submissionInfo', function () {
        testUserAccess(submitView, {id:"new"}, true, false)
});

router.route('plugins/journal/submission/:id/new', 'submissionInfo', function (id) {
        testUserAccess(submitView, {id:id}, true, false)
});
// Pass through the revision view to eliminate the need to pick an issue
router.route('plugins/journal/submission/:id/edit', 'submissionInfo', function (id) {
        testUserAccess(editView, {id:id,NR:false}, true, false)
});
router.route('plugins/journal/submission/:id/revision', 'submissionInfo', function (id) {
        testUserAccess(editView, {id:id,NR:true}, true, false)
});

import listView from './views/listJournals';
router.route('plugins/journal/list', 'listJournals', function () {
        testUserAccess(listView, {}, true, true)
});

import uploadView from './views/upload';
router.route('plugins/journal/submission/:id/upload/new', 'uploadFiles', function (id) {
        testUserAccess(uploadView, {id:id, newSub:true}, true, false)
});
router.route('plugins/journal/submission/:id/upload/edit', 'uploadFiles', function (id) {
        testUserAccess(uploadView, {id:id, newSub:false}, true, false)
});

import submissionView from './views/view';
router.route('plugins/journal/view/:id', 'submissionView', function (id) {
    testUserAccess(submissionView, {id:id}, false, false)
});

import downloadView from './views/download';
router.route('plugins/journal/view/:id/download', 'submissionDownload', function (id) {
    testUserAccess(downloadView,{id:id}, false, false)
});
import manageJournalView from './views/manageJournal';
router.route('plugins/journal/admin', 'manageJournalView', function () {
        testUserAccess(manageJournalView,{},true,true);
});

import EditIssueView from './views/editIssue';
router.route('plugins/journal/admin/issue/:id/:type', 'editIssue', function (id, type) {
    testUserAccess(EditIssueView,{id: id, type:type},true,true);
});

import EditJournalView from './views/editJournal';
//Existing journal route
router.route('plugins/journal/admin/journal/:id', 'editJournal', function (id) {
    testUserAccess(EditJournalView,{id:id},true,true);

});
// Help pages
import manageHelpView from './views/manageHelp';
//Existing journal route
router.route('plugins/journal/admin/help', 'editJournal', function () {
    testUserAccess(manageHelpView,{},true,true);
});

import HelpView from './views/help_main';
//Existing journal route
router.route('plugins/journal/help', 'HelpView', function () {
    testUserAccess(HelpView,{},false,false);
});
import FAQView from './views/help_faq';
//Existing journal route
router.route('plugins/journal/help/faq', 'FAQView', function () {
    testUserAccess(FAQView,{},false,false);

});
import AboutView from './views/help_about';
//Existing journal route
router.route('plugins/journal/help/about', 'AboutView', function () {
    testUserAccess(AboutView,{},false,false);

});
import FeedBackView from './views/feedback';
//Existing journal route
router.route('plugins/journal/help/feedback', 'FeedBackView', function () {
    testUserAccess(FeedBackView,{},false,false);
});

function testUserAccess(view, args, needsUser, needsAdmin) {
    var userFlag  = true;
    var adminFlag = true;
    if (needsUser || needsAdmin) {
      var user = getCurrentUser();
      if(needsUser && user==null){
          userFlag=false;
      }
      if(needsAdmin && (user!=null) && !user.attributes.admin){
          adminFlag=false
      }
    }
    if (userFlag && adminFlag) {
        events.trigger('g:navigateTo', view,args,{layout: Layout.EMPTY});
    }
    else {
        window.location.href='#plugins/journal?dialog=login'
    }
}

