import router from 'girder/router';
import events from 'girder/events';
import { getCurrentUser } from 'girder/auth';
import { Layout } from 'girder/constants';
import { exposePluginConfig } from 'girder/utilities/PluginUtils';

// Import views from plugin
import configView from './views/ConfigView';
import indexView from './views/index';
import submitView from './views/submit';
import editView from './views/editSubmission';
import listView from './views/listJournals';
import uploadView from './views/upload';
import submissionView from './views/view';
import approvalView from './views/manageApproval';
import downloadView from './views/download';
import manageJournalView from './views/manageJournal';
import EditIssueView from './views/editIssue';
import EditJournalView from './views/editJournal';
import manageHelpView from './views/manageHelp';
import HelpView from './views/help_main';
import FAQView from './views/help_faq';
import AboutView from './views/help_about';
import FeedBackView from './views/feedback';

exposePluginConfig('tech_journal', 'plugins/journal/config');

// Journal Configuration page
router.route('plugins/journal/config', 'journalConfig', function () {
    testUserAccess(configView, {}, true, true);
});

// Main page of Journal
router.route('plugins/journal', 'mainView', function (query) {
    testUserAccess(indexView, query, false, false);
});

// Submission related pages
router.route('plugins/journal/submission/new', 'submissionInfo', function () {
    testUserAccess(submitView, {id: 'new'}, true, false);
});

router.route('plugins/journal/submission/:id/new', 'submissionInfo', function (id) {
    testUserAccess(submitView, {id: id}, true, false);
});
// Pass through the revision view to eliminate the need to pick an issue
router.route('plugins/journal/submission/:id/edit', 'submissionInfo', function (id) {
    testUserAccess(editView, {id: id, NR: false}, true, false);
});
router.route('plugins/journal/submission/:id/revision', 'submissionInfo', function (id) {
    testUserAccess(editView, {id: id, NR: true}, true, false);
});

router.route('plugins/journal/submission/:id/approve', 'submissionInfo', function (id) {
    testUserAccess(editView, {id: id, NR: false, approve: true}, true, true);
});
// Listing page of Journal
router.route('plugins/journal/list', 'listJournals', function () {
    testUserAccess(listView, {}, true, true);
});

// Upload files to a submission
router.route('plugins/journal/submission/:id/upload/new', 'uploadFiles', function (id) {
    testUserAccess(uploadView, {id: id, newSub: true, NR: false}, true, false);
});

router.route('plugins/journal/submission/:id/upload/revision', 'uploadFiles', function (id) {
    testUserAccess(uploadView, {id: id, newSub: true, NR: true}, true, false);
});
router.route('plugins/journal/submission/:id/upload/edit', 'uploadFiles', function (id) {
    testUserAccess(uploadView, {id: id, newSub: false, NR: false}, true, false);
});

// Page to view each individual submission
router.route('plugins/journal/view/:id', 'submissionView', function (id) {
    testUserAccess(submissionView, {id: id}, false, false);
});

// Page for admin to see submissions for approval
router.route('plugins/journal/approval', 'approvalView', function () {
    testUserAccess(approvalView, {}, true, true);
});

// Download page for each submission
router.route('plugins/journal/view/:id/download', 'submissionDownload', function (id) {
    testUserAccess(downloadView, {id: id}, false, false);
});
// View to manage (or create) a Journal
router.route('plugins/journal/admin', 'manageJournalView', function () {
    testUserAccess(manageJournalView, {}, true, true);
});

// View to manage(or create) an Issue to submit to
router.route('plugins/journal/admin/issue/:id/:type', 'editIssue', function (id, type) {
    testUserAccess(EditIssueView, {id: id, type: type}, true, true);
});

// View to manage a Journal entry
// Existing journal route
router.route('plugins/journal/admin/journal/:id', 'editJournal', function (id) {
    testUserAccess(EditJournalView, {id: id}, true, true);
});
// Help pages

// Admin page to set the content of each help page
router.route('plugins/journal/admin/help', 'adminHelp', function () {
    testUserAccess(manageHelpView, {}, true, true);
});

// Display page for the Help page of the Journal
router.route('plugins/journal/help', 'HelpView', function () {
    testUserAccess(HelpView, {}, false, false);
});

// Display page for the F.A.Q. page of the Journal
router.route('plugins/journal/help/faq', 'FAQView', function () {
    testUserAccess(FAQView, {}, false, false);
});

// Display page of the About page of the Journal
router.route('plugins/journal/help/about', 'AboutView', function () {
    testUserAccess(AboutView, {}, false, false);
});

// Display page for a user to submit feedback to Journal Admins
router.route('plugins/journal/help/feedback', 'FeedBackView', function () {
    testUserAccess(FeedBackView, {}, false, false);
});

function testUserAccess(view, args, needsUser, needsAdmin) {
    var userFlag  = true;
    var adminFlag = true;
    if (needsUser || needsAdmin) {
        var user = getCurrentUser();
        if (needsUser && user === null) {
            userFlag = false;
        }
        if (needsAdmin && (user !== null) && !user.attributes.admin) {
            adminFlag = false;
        }
    }
    if (userFlag && adminFlag) {
        events.trigger('g:navigateTo', view, args, {layout: Layout.EMPTY});
    } else {
        window.location.href = '#plugins/journal?dialog=login';
    }
}
