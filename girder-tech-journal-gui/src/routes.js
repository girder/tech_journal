/* eslint-disable import/first, import/order */

import Backbone from 'backbone';

import router from '@girder/core/router';
import events from '@girder/core/events';
import { getCurrentUser } from '@girder/core/auth';
import { Layout } from '@girder/core/constants';
import { restRequest } from '@girder/core/rest';

// Import views from plugin
import submitView from './pages/submit/submit';
import editView from './pages/submit/editSubmission';
import ManageDisclaimerView from './pages/admin/manageDisclaimers';
import submissionView from './pages/view/view';
import approvalView from './views/manageApproval';
import downloadView from './views/download';
import manageJournalView from './views/manageJournal';
import EditIssueView from './views/editIssue';
import EditJournalView from './views/editJournal';
import manageHelpView from './views/manageHelp';
import FeedBackView from './pages/feedback/feedback.js';
import EditGroupUsersView from './views/groupUsers.js';
import userView from './pages/user/user.js';
import surveyView from './pages/survey/survey.js';

// Clear all of the existing routes, which will always added by Girder
Backbone.history.handlers = [];

// Home page
import HomePage from './pages/home/home';
router.route('', 'home', function (query) {
    testUserAccess(HomePage, query, false, false);
});

router.route('login', 'login', function () {});

// adminCategories page
import adminCategoriesPage from './pages/adminCategories/adminCategories';
router.route('admin/categories', 'adminCategories', function () {
    testUserAccess(adminCategoriesPage, {}, false, false);
});

// Submission related pages
router.route('submission/new', 'submissionInfo', function () {
    testUserAccess(submitView, {id: 'new'}, true, false);
});

// user profile page
router.route('plugins/user/:id/edit', 'submissionInfo', function (id) {
    testUserAccess(userView, {id: id}, true, false);
});

router.route('plugins/journal/submission/:id/new', 'submissionInfo', function (id) {
    testUserAccess(submitView, {id: id}, true, false);
});
// Pass through the revision view to eliminate the need to pick an issue
router.route('plugins/journal/submission/:id/edit', 'submissionInfo', function (id) {
    testUserAccess(editView, {id: id, NR: false, approve: false}, true, false);
});
router.route('plugins/journal/submission/:id/revision', 'submissionInfo', function (id) {
    testUserAccess(editView, {id: id, NR: true, approve: false}, true, false);
});

router.route('plugins/journal/submission/:id/approve', 'submissionInfo', function (id) {
    testUserAccess(editView, {id: id, NR: false, approve: true}, true, true);
});
// Listing page of Journal
import JournalListPage from './pages/journalList/journalList';
router.route('journals', 'journalList', function () {
    testUserAccess(JournalListPage, {}, false, false);
});

import uploadView from './pages/upload/upload';
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
router.route('plugins/journal/submission/:id/survey', 'uploadFiles', function (id) {
    testUserAccess(surveyView, {id: id}, true, true);
});

// Page to view each individual submission
router.route('view/:submission(/:revision)', 'submissionView', function (submission, revision) {
    restRequest({
        method: 'GET',
        url: 'journal/translate',
        data: {
            submission: submission,
            revision: revision
        }
    }).done((ids) => {
        testUserAccess(submissionView, {
            id: ids.submission,
            revId: ids.revision
        });
    });
});

// Page for admin to see submissions for approval
router.route('plugins/journal/approval', 'approvalView', function () {
    testUserAccess(approvalView, {}, true, true);
});

// Page for admin to see users for elevation (editors and managers)
router.route('plugins/journal/admin/groupusers/:id/journal', 'approvalView', function (id) {
    testUserAccess(EditGroupUsersView, {id: id, type: 'collection'}, true, true);
});

// Page for admin to see users for elevation (editors and managers)
router.route('plugins/journal/admin/groupusers/:id/issue', 'approvalView', function (id) {
    testUserAccess(EditGroupUsersView, {id: id, type: 'folder'}, true, true);
});

// Download page for each submission
router.route('view/:id/download', 'submissionDownload', function (id) {
    restRequest({
        method: 'GET',
        url: `folder/${id}`
    }).done((revision) => {
        restRequest({
            method: 'GET',
            url: `folder/${revision.parentId}`
        }).done((submission) => {
            testUserAccess(downloadView, {
                id: id,
                submissionNumber: submission.meta.submissionNumber,
                revisionNumber: revision.meta.revisionNumber
            }, true, false);
        });
    });
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

// Admin page to set the content of each disclaimer
router.route('plugins/journal/admin/disclaimer', '', function () {
    testUserAccess(ManageDisclaimerView, {}, true, true);
});
// Admin page to set the content of each help page
router.route('plugins/journal/admin/help', 'adminHelp', function () {
    testUserAccess(manageHelpView, {}, true, true);
});

// Display page for the Help page of the Journal
import HelpPage from './pages/help/help';
router.route('help', 'help', function () {
    testUserAccess(HelpPage, {title: 'Help', settingKey: 'main'}, false, false);
});

// Display page for the F.A.Q. page of the Journal
router.route('help/faq', 'helpFaq', function () {
    testUserAccess(HelpPage, {title: 'Frequently Asked Questions', settingKey: 'faq'}, false, false);
});

// Display page of the About page of the Journal
router.route('help/about', 'helpAbout', function () {
    testUserAccess(HelpPage, {title: 'About', settingKey: 'about'}, false, false);
});

// Display page for a user to submit feedback to Journal Admins
router.route('plugins/journal/help/feedback', 'FeedBackView', function () {
    testUserAccess(FeedBackView, {}, false, false);
});

/*
 * Hack-tastic fix to force the login to not re-render the page
 * Keeps track of the old view and navigates to it
 *
 * Window.back ensures that the URL is correct for the loaded view
 *
 * Sorry * J.Snyder 1/23/2019
 */
let target = null;
events.on('g:login', function () {
    if (target) {
        const tmp = target;
        target = null;
        events.trigger('g:navigateTo', tmp[0], tmp[1], {layout: Layout.EMPTY});
        window.history.back();
        // window.history.pushState(null, '', tmp[2]);
        return false;
    }
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
        if (!user) {
            target = [view, args, window.location.href];
            // Route to non-rendering page to show log-in window
            router.navigate('login?dialog=login', { trigger: true });
            return -1;
        }
    }
}
