#!/usr/bin/env python
# -*- coding: utf-8 -*-

###############################################################################
#  Copyright 2016 Open Source Electronic Health Record Alliance.
#
#  Licensed under the Apache License, Version 2.0 ( the 'License' );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an 'AS IS' BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
###############################################################################
import os
import six
import json
import datetime
import re
import urllib
from bson.objectid import ObjectId

from girder.api.describe import Description, describeRoute
from girder.api.rest import Resource, RestException, filtermodel, loadmodel
from girder.api import access
from girder.constants import AccessType, TokenScope
from girder.models.model_base import ValidationException
from girder.models.folder import Folder
from girder.models.user import User
from girder.utility import mail_utils
from girder.utility.model_importer import ModelImporter
from girder.utility.plugin_utilities import getPluginDir, registerPluginWebroot
from girder.utility.webroot import WebrootBase
from girder import events
from girder_worker_utils.transforms.girder_io import GirderUploadToItem
from tech_journal_tasks.tasks import processGithub, surveySubmission
from . import constants


class Webroot(WebrootBase):
    """
    The webroot endpoint simply serves the main index HTML file.
    """
    def __init__(self, templatePath=None):
        if not templatePath:
            templatePath = os.path.join(getPluginDir(), 'tech_journal', 'server', 'webroot.mako')
        super(Webroot, self).__init__(templatePath)

        self.vars = {
            'apiRoot': '/api/v1',
            'staticRoot': '/static',
            'title': 'Technical Journal'
        }


def sortByDate(elem):
    return elem['created']


def validateSettings(event):
    key, val = event.info['key'], event.info['value']

    if key == constants.TechJournalSettings.admin_email:
        if val:
            if not isinstance(val, six.string_types):
                raise ValidationException(
                    'Tech Journal Resources must be a string.', 'value')
            # accept comma or space separated lists
            resources = val.replace(',', ' ').strip().split()
            # reformat to a comma-separated list
            event.info['value'] = ','.join(resources)
    event.preventDefault().stopPropagation()


def checkValue(infoList, filterParams, category, value):
    if 'meta' in infoList:
        if "categories" in infoList['meta'].keys():
            if value in infoList['meta']["categories"]:
                return True
    if category in infoList:
        if type(infoList[category]) == list:
            if (value in infoList[category]):
                return True
        else:
            if (value == infoList[category]):
                return True
    return False


class TechJournal(Resource):

    def checkSubmission(self, filterParams, submission, searchObj, targetVal, category):
        keyMatch = False
        if searchObj in submission["meta"].keys():
            keyMatch = keyMatch or checkValue(submission["meta"],
                                              filterParams[category],
                                              searchObj,
                                              targetVal)
        else:
            keyMatch = keyMatch or checkValue(submission,
                                              filterParams[category],
                                              searchObj,
                                              targetVal)
        # Capture all revisions under each object
        revisionInfo = list(self.model('folder')
                                .childFolders(parentType='folder',
                                              parent=submission,
                                              user=self.getCurrentUser()
                                              ))
        # If not found in the top level data, search through each revision
        if not keyMatch:
            for revision in revisionInfo:
                for key in filterParams[category]:
                    searchObj = category
                    targetVal = key
                    if re.match("has.*code", key):
                        searchObj = key
                        targetVal = "true"
                    if category == "License":
                        searchObj = "source-license"
                    if searchObj in revision["meta"].keys():
                        keyMatch = keyMatch or checkValue(revision["meta"],
                                                          filterParams[category],
                                                          searchObj,
                                                          targetVal)
                    else:
                        keyMatch = keyMatch or checkValue(revision,
                                                          filterParams[category],
                                                          searchObj,
                                                          targetVal)
        return keyMatch

    def __init__(self):

        super(TechJournal, self).__init__()
        self.resourceName = 'journal'
        self.route('GET', (':id', 'submissions'), self.getAllSubmissions)
        self.route('GET', (':id', 'pending'), self.getPendingSubmissions)
        self.route('GET', (), self.getAllJournals)
        self.route('GET', (':id', 'issues'), self.getAllIssues)
        self.route('GET', (':id', 'openissues',), self.getFilteredIssues)
        self.route('GET', (':id', 'details'), self.getSubmissionDetails)
        self.route('GET', (':id', 'search'), self.getFilteredSubmissions)
        self.route('GET', (':id', 'logo'), self.getLogo)
        self.route('PUT', (':id', 'metadata'), self.setSubmissionMetadata)
        self.route('PUT', (':id', 'finalize'), self.finalizeSubmission)
        self.route('PUT', (':id', 'approve'), self.approveSubmission)
        self.route('PUT', (':id', 'comments'), self.updateComments)
        self.route('GET', (':id', 'survey'), self.getSurvey)
        self.route('PUT', ('setting',), self.setJournalSettings)
        self.route('GET', ('setting',), self.getJournalSettings)
        self.route('GET', ('licenses',), self.getJournalLicenses)
        self.route('POST', ('feedback',), self.sendFeedBack)
        self.route('DELETE', (':id',), self.deleteObject)
        self.route('PUT', ('user',), self.updateUser)
        self.route('GET', (':id', "citation", ":type"), self.printCitation)

        # APIs for categories
        self.route('POST', ('category',), self.addJournalObj)
        self.route('PUT', ('category',), self.updateJournalObj)
        self.route('GET', ('categories',), self.getJournalObjs)
        self.route('DELETE', ('category',), self.rmJournalObj)
        # APIs for Disclaimers
        self.route('POST', ('disclaimer',), self.addJournalObj)
        self.route('PUT', ('disclaimer',), self.updateJournalObj)
        self.route('GET', ('disclaimers',), self.getJournalObjs)
        self.route('DELETE', ('disclaimer',), self.rmJournalObj)

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @describeRoute(
        Description('Get all Issues from a given Journal')
        .responseClass('Collection')
        .param('id', 'The ID of the Journal (collection) to pull from', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getAllIssues(self, collection, params):
        issues = list(self.model('folder').childFolders(parentType='collection',
                                                        parent=collection,
                                                        user=self.getCurrentUser()))
        issues.sort(key=sortByDate)
        return issues

    @access.public(scope=TokenScope.DATA_WRITE)
    @loadmodel(model='folder', level=AccessType.WRITE)
    @describeRoute(
        Description('Delete a given object')
        .responseClass('folder')
        .param('id', 'The ID of the object to delete', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def deleteObject(self, folder, params):
        return self.model('folder').remove(folder)

    @access.public(scope=TokenScope.DATA_WRITE)
    @describeRoute(
        Description('Save user info beyond default')
        .responseClass('folder')
        .param('body', 'A JSON object containing the user object to update',
               paramType='body')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def updateUser(self, params):
        user = self.getBodyJson()
        existing = self.model('user').load(user['_id'], user=self.getCurrentUser())
        existing['notificationStatus'] = user['notificationStatus']
        return self.model('user').save(existing)

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @describeRoute(
        Description('Get filtered Issues from a given Journal which are still active')
        .responseClass('Collection')
        .param('id', 'The ID of the Journal (collection) to pull from', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getFilteredIssues(self, collection, params):
        issues = list(self.model('folder').childFolders(parentType='collection',
                                                        parent=collection,
                                                        user=self.getCurrentUser()))
        activeIssues = []
        for issue in issues:
            try:
                dateofIssue = datetime.datetime.strptime(issue['meta']['paperDue'],
                                                         '%Y-%m-%d %H:%M:%S')
            except ValueError:
                dateofIssue = datetime.datetime.strptime(issue['meta']['paperDue'],
                                                         '%Y-%m-%dT%H:%M:%S.%fZ')
            if dateofIssue > datetime.datetime.now():
                activeIssues.append(issue)
        activeIssues.sort(key=sortByDate)
        return activeIssues

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Get all details of a submission')
        .param('id', 'The ID of the submission', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getSubmissionDetails(self, folder, params):
        parentInfo = self.model('folder').load(folder['parentId'],
                                               user=self.getCurrentUser(), force=True)
        parentInfo['issue'] = self.model('folder').load(parentInfo['parentId'],
                                                        user=self.getCurrentUser(),
                                                        force=True)
        parentInfo['submitter'] = self.model('user').load(folder['creatorId'],
                                                          user=self.getCurrentUser(),
                                                          force=True)
        currentInfo = self.model('folder').load(folder['_id'],
                                                user=self.getCurrentUser(), force=True)
        otherRevs = list(self.model('folder').childFolders(parentType='folder', parent=parentInfo,
                                                           user=self.getCurrentUser()))
        otherRevs.sort(key=sortByDate)
        for rev in otherRevs:
            rev['submitter'] = self.model('user').load(rev['creatorId'],
                                                       user=self.getCurrentUser(),
                                                       force=True)
        return (currentInfo, parentInfo, otherRevs)

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @describeRoute(Description('Get all submissions from a given Journal')
                   .responseClass('Collection')
                   .param('id', "The ID of the Journal (collection) to pull from", paramType='path')
                   .param('filterID', "The ID of the Issue to limit the results from")
                   .param('strtIndex', "The index of the list of issues to start displaying")
                   .errorResponse('Test error.')
                   .errorResponse('Read access was denied on the issue.', 403)
                   )
    def getAllSubmissions(self, collection, params):
        totalData = list()
        issues = list(self.model('folder').childFolders(parentType='collection', parent=collection,
                                                        user=self.getCurrentUser()))
        for issue in issues:
            if ((str(issue['_id']) == params['filterID']) or (params['filterID'] == '*')):
                testInfo = list(self.model('folder').childFolders(parentType='folder', parent=issue,
                                                                  user=self.getCurrentUser()))
                for submission in testInfo:
                    # Find all folders under each submission to capture all revisions
                    submissionInfo = list(self.model('folder')
                                              .childFolders(parentType='folder',
                                                            parent=submission,
                                                            user=self.getCurrentUser()
                                                            ))
                    if len(submissionInfo):
                        submission['currentRevision'] = submissionInfo[0]
                    if "curation" in submission:
                        if submission['curation']['status'] != "REQUESTED":
                            totalData.append(submission)
        totalData = sorted(totalData, reverse=True, key=lambda submission: submission['updated'])
        return totalData[int(params['strtIndex']):int(params['strtIndex'])+20]

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @describeRoute(Description('Get all pending submissions from a given Journal')
                   .responseClass('Collection')
                   .param('id', 'The ID of the Journal (collection) to pull from', paramType='path')
                   .errorResponse('Test error.')
                   .errorResponse('Read access was denied on the issue.', 403)
                   )
    def getPendingSubmissions(self, collection, params):
        totalData = list()
        issues = list(self.model('folder').childFolders(parentType='collection', parent=collection,
                                                        user=self.getCurrentUser()))
        for issue in issues:
            testInfo = list(self.model('folder').childFolders(parentType='folder', parent=issue,
                                                              user=self.getCurrentUser()))
            for submission in testInfo:
                # Find all folders under each submission to capture all revisions
                submissionInfo = list(self.model('folder')
                                          .childFolders(parentType='folder',
                                                        parent=submission,
                                                        user=self.getCurrentUser()
                                                        ))
                if len(submissionInfo):
                    submission['currentRevision'] = submissionInfo[-1]
                if "curation" in submission:
                    if submission['curation']['status'] == "REQUESTED":
                        totalData.append(submission)
        totalData = sorted(totalData, reverse=True, key=lambda submission: submission['updated'])
        return totalData

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @describeRoute(
        Description('Get submissions matching a certain set of parameters by JSON')
        .responseClass('Collection')
        .param('id', "The ID of the Journal (collection) to pull from", paramType='path')
        .param('query', "A JSON object to filter the objects over", required=False)
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getFilteredSubmissions(self, collection, params):
        user = self.getCurrentUser()
        totalData = list()
        filterParams = json.loads(params["query"])
        if "issueId" in filterParams:
            issues = [self.model('folder').load(filterParams['issueId'],
                                                user=user
                                                )]
            del filterParams['issueId']
        else:
            issues = list(self.model('folder').childFolders(parentType='collection',
                                                            parent=collection,
                                                            user=user
                                                            ))
        textArg = ""
        if "text" in filterParams:
            textArg = {"$text": {"$search": filterParams['text']}}
            del filterParams['text']
        for issue in issues:
            testInfo = list(self.model('folder').childFolders(parentType='folder',
                                                              parent=issue,
                                                              user=user,
                                                              filters=textArg
                                                              ))
            for submission in testInfo:
                # ===================================================
                # Complicated search to "or" and "and" query objects
                # ===================================================
                submissionMatch = True
                # Go through each category of the search query
                for category in filterParams.keys():
                    foundMatch = False
                    # If no values found, skip it
                    if not len(filterParams[category]):
                        continue
                    for key in filterParams[category]:
                        searchObj = category
                        targetVal = key
                        if re.match("has.*code", key):
                            searchObj = key
                            targetVal = "true"
                        if category == "License":
                            searchObj = "source-license"
                        foundMatch = self.checkSubmission(filterParams,
                                                          submission,
                                                          searchObj,
                                                          targetVal,
                                                          category) or foundMatch
                    submissionMatch = foundMatch and submissionMatch
                if submissionMatch:
                    # Find all folders under each submission to capture all revisions
                    submissionInfo = list(self.model('folder')
                                              .childFolders(parentType='folder',
                                                            parent=submission,
                                                            user=self.getCurrentUser()
                                                            ))
                    # Grab the last object as its most current revision
                    if len(submissionInfo):
                        submissionInfo = sorted(submissionInfo,
                                                key=lambda submission: submission['updated'])
                        submissionInfo[-1]['logo'] = self.getLogo(id=submissionInfo[-1]['_id'],
                                                                  params=params)
                        submission['currentRevision'] = submissionInfo[-1]
                    # If not found already, add it to the returned information
                    if submission not in totalData:
                        totalData.append(submission)
        totalData = sorted(totalData, reverse=True,
                           key=lambda submission: submission['currentRevision']['updated'])
        return totalData

    @access.public(scope=TokenScope.DATA_READ)
    @filtermodel(model='collection')
    @describeRoute(
        Description('Get all collections that are marked as Journals')
        .responseClass('Collection', array=True)
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getAllJournals(self, params):
        user = self.getCurrentUser()
        return list(self.model('collection').textSearch('__journal__', user=user))

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Get logo associated with submission')
        .param('id', "The ID of the foder to aquire logo for", paramType='path')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getLogo(self, folder, params):
        thumbURL = ""
        for fileObj in self.model('folder').childItems(folder, user=self.getCurrentUser()):
            if fileObj['meta']['type'] == "THUMBNAIL":
                thumbURL = "item/%s/download?contentDisposition=inline" % fileObj['_id']
        return thumbURL

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Get survey results associated with submission')
        .param('id', "The ID of the folder to aquire logo for", paramType='path')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getSurvey(self, folder, params):
        foundText = ""
        parentFolder = self.model('folder').load(folder['parentId'], force=True)
        for fileObj in self.model('folder').childItems(parentFolder, user=self.getCurrentUser()):
            print fileObj
            if fileObj['name'] == "Survey Result":
                downLoadObj = self.model('item').fileList(fileObj).next()[1]()
                foundText = downLoadObj.next()
        return unicode(foundText, errors='ignore')

    @access.user(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.WRITE)
    @describeRoute(
        Description('Move folder from user\'s directory to the\
                    issue while prepping it for curation')
        .param('id', 'The ID of the folder.', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def finalizeSubmission(self, params, folder):
        DEFAULTS = {
            'enabled': True,
            'status': 'REQUESTED'
        }
        folder['curation'] = DEFAULTS
        folder['public'] = False
        self.model('folder').save(folder)
        parentFolder = self.model('folder').load(folder['parentId'], force=True)
        targetFolder = self.model('folder').load(parentFolder['meta']['targetIssue'], force=True)
        movedFolder = self.model('folder').move(parentFolder, targetFolder, 'folder')
        data = {'name': folder['name'],
                'authors': folder['meta']['authors'],
                'abstract': parentFolder['description'],
                'id': folder['_id']}
        text = mail_utils.renderTemplate('tech_journal_approval.mako', data)
        mail_utils.sendEmail(toAdmins=True,
                             subject='New Submission - Pending Approval',
                             text=text)
        movedFolder['curation'] = DEFAULTS
        parentFolder['public'] = False
        self.model('folder').save(movedFolder)
        newItem = self.model("item").createItem(name="Survey Result",
                                                creator=self.getCurrentUser(),
                                                folder=movedFolder,
                                                description="Result of simple pattern match")
        surveySubmission.delay(folder,
                               girder_result_hooks=[GirderUploadToItem(str(newItem['_id'])), ])
        return movedFolder

    @access.user(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.WRITE)
    @describeRoute(
        Description("Approve a submission and make it publicly visible")
        .param('id', 'The ID of the folder.', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def approveSubmission(self, params, folder):
        DEFAULTS = {
            'enabled': False,
            'status': 'APPROVED'}
        parentFolder = self.model('folder').load(folder['parentId'], force=True)
        if not (parentFolder['parentId'] == parentFolder['meta']['targetIssue']):
            targetFolder = self.model('folder').load(parentFolder['meta']['targetIssue'],
                                                     force=True)
            self.model('folder').move(parentFolder, targetFolder, 'folder')
        data = {'name': parentFolder['name'],
                'authors': folder['meta']['authors'],
                'abstract': parentFolder['description']}
        subject = ''
        if self.model('folder').countFolders(parentFolder) == 1:
            subject = 'New Submission'
            params['sendEmail'] = True
            emailTemplate = 'tech_journal_new_submission.mako'
        else:
            subject = 'Updated Submission'
            data['rNotes'] = folder['description']
            emailTemplate = 'tech_journal_updated.mako'
        html = mail_utils.renderTemplate(emailTemplate, data)
        mail_utils.sendEmail(toAdmins=True, subject=subject, text=html)
        folder['curation'] = DEFAULTS
        folder['public'] = True
        folder['downloadStatistics'] = {
            'views': 0,
            'completed': 0
        }
        parentFolder['curation'] = DEFAULTS
        parentFolder['public'] = True
        self.model('folder').save(parentFolder)
        self.model('folder').save(folder)
        return folder

    @access.user(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Set metadata for a submission. Most stays on each revision,\
                    but others go to the parent folder')
        .param('id', 'The ID of the folder.', paramType='path')
        .param('body', 'A JSON object containing the metadata keys to add',
               paramType='body')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def setSubmissionMetadata(self, params, folder):
        # Submission metadata is split between the parent and revision folders:
        #    revision:
        #      type
        #      authors
        #      institution
        #      tags
        #    parent
        #      all other metadata
        #
        metadata = self.getBodyJson()
        parentMetaData = {}
        if ['github'] == metadata.keys():
            # first check for validity of URL
            page = urllib.urlopen(metadata['github'])
            if page.getcode() == 200:
                # Spawn off Girder-worker process to generate the download from the URL
                newItem = self.model("item").createItem(name="GitHub Repository",
                                                        creator=self.getCurrentUser(),
                                                        folder=folder,
                                                        description=metadata['github'])
                self.model("item").setMetadata(newItem, {'type': 6})
                processGithub.delay(metadata['github'],
                                    girder_result_hooks=[GirderUploadToItem(str(newItem['_id'])), ])
            else:
                raise RestException('The repository doesn\'t exist or the URL is invalid.')
        for key in ['related', 'copyright', 'grant', 'comments',
                    'attribution-policy', 'targetIssue']:
            if key in metadata.keys():
                parentMetaData[key] = metadata.pop(key)
        parentFolder = self.model('folder').load(folder['parentId'],
                                                 user=self.getCurrentUser(),
                                                 force=True)
        self.model('folder').setMetadata(parentFolder, parentMetaData)
        self.model('folder').setMetadata(folder, metadata)
        return 'Success'

    @access.user(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Set metadata for a submission. Most stays on each revision,\
                    but others go to the parent folder')
        .param('id', 'The ID of the folder.', paramType='path')
        .param('sendEmail', "Send an email about comment update")
        .param('body', 'A JSON object containing the comments to update',
               paramType='body')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def updateComments(self, params, folder):
        metadata = self.getBodyJson()

        parentFolder = self.model('folder').load(folder['parentId'],
                                                 user=self.getCurrentUser(),
                                                 force=True)
        if params['sendEmail'] == 'send':
            data = {'name': parentFolder['name'],
                    'commentText': metadata['comments'][-1]['text'],
                    'commentAuthor':  metadata['comments'][-1]["name"]}
            subject = "Comment Added - Submission %s" % parentFolder['name']
            emailTemplate = 'tech_journal_new_comment.mako'
            html = mail_utils.renderTemplate(emailTemplate, data)
            mail_utils.sendEmail(toAdmins=True, subject=subject, text=html)
        self.model('folder').setMetadata(parentFolder, metadata)
        return 'Success'

    @access.admin(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Set a Journal category for filtering')
        .param('list', 'A JSON list of objects with key and value representing\
                        a list of settings to set.', required=True)
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def setJournalSettings(self, params):
        settings = json.loads(params['list'])
        for setting in settings:
            if setting['value'] is None:
                value = None
            else:
                try:
                    if isinstance(setting['value'], six.string_types):
                        value = json.loads(setting['value'])
                    else:
                        value = setting['value']
                except ValueError:
                    value = setting['value']
            if value is None:
                ModelImporter.model('journal', 'tech_journal').unset(key=setting['key'])
            else:
                ModelImporter.model('journal', 'tech_journal').set(key=setting['key'],
                                                                   value=value)

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('get the journal Settings')
        .param('list', 'A JSON list of objects with key and value representing\
                        a list of settings to set.', required=True)
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getJournalSettings(self, params):

        getFunc = getattr(ModelImporter.model('journal', 'tech_journal'), 'get')
        funcParams = {}
        if 'list' in params:
            try:
                keys = json.loads(params['list'])
                if not isinstance(keys, list):
                    raise ValueError()
            except ValueError:
                raise RestException('List was not a valid JSON list.')
            return {k: getFunc(k, **funcParams) for k in keys}

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('get the journal licenses')
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getJournalLicenses(self, params):
        return constants.TechJournalLicenseDefault.licenseDict

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('get citation for an object')
        .param('id', 'The ID of the folder.', paramType='path')
        .param('type', 'Type of citation to generate', paramType='path')
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def printCitation(self, folder, type, params):
        folder['parent'] = self.model('folder').load(folder['parentId'],
                                                     user=self.getCurrentUser(), force=True)
        templateInfo = {
            'authors': folder['meta']['authors'],
            'name': folder['parent']['name'],
            'description': folder['parent']['description'],
            'institution': folder['meta']['institution'],
            'date_year': folder['created'].year,
            'date_mon': folder['created'].month,
        }
        return constants.TechJournalCitations.templates[type].substitute(templateInfo)

    # -----------------------------------------------
    #  Add Journal Setting manipulation APIs
    #  Used for both Categories and Disclaimers
    # -----------------------------------------------

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Create a setting object')
        .param('text', "An object name", required=True)
        .param('tag', "An object tag", required=True)
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def addJournalObj(self, params):
        ModelImporter.model('journal', 'tech_journal').set(key=params['text'],
                                                           value=[], tag=params['tag'])

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('get the journal'' filter categories')
        .param('tag', "An object tag", required=True)
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getJournalObjs(self, params):
        return ModelImporter.model('journal', 'tech_journal').getAllByTag(params['tag'])

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Delete a journal''s filter Category')
        .param('text', "A category name", required=True)
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def rmJournalObj(self, params):
        ModelImporter.model('journal', 'tech_journal').removeObj(params['text'])

    @access.admin(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Set the journal objects')
        .param('list', 'A JSON list of objects with key and value representing\
                        a list of settings to set.', required=True)
        .param('tag', "An object tag", required=True)
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def updateJournalObj(self, params):
        settings = json.loads(params['list'])
        for setting in settings:
            if setting['value'] is None:
                value = None
            else:
                try:
                    if isinstance(setting['value'], six.string_types):
                        value = json.loads(setting['value'])
                    else:
                        value = setting['value']
                except ValueError:
                    value = setting['value']
            if value is None:
                ModelImporter.model('journal', 'tech_journal').unset(key=setting['key'])
            else:
                ModelImporter.model('journal', 'tech_journal').set(key=setting['key'],
                                                                   value=value, tag=params['tag'])

    def _onDownloadFileComplete(self, event):
        Folder().increment(
            query={'_id': ObjectId(event.info['id'])},
            field='downloadStatistics.completed',
            amount=1
        )

    def _onPageView(self, event):
        Folder().increment(
            query={'_id': ObjectId(event.info['id'])},
            field='downloadStatistics.views',
            amount=1
        )

    @access.public
    @describeRoute(
        Description('Send feedback email to admins')
        .param('body', 'A JSON object containing the feedback.  Am object \
                        with three params: title, where, summary',
               paramType='body')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def sendFeedBack(self, params):
        metadata = self.getBodyJson()
        subject = "Website Feedback from %s" % metadata['title']
        emailTemplate = 'tech_journal_feedback.mako'
        html = mail_utils.renderTemplate(emailTemplate, metadata)
        mail_utils.sendEmail(toAdmins=True, subject=subject, text=html)
        return 'Success'


def load(info):
    techJournal = TechJournal()
    events.bind('model.setting.validate', 'journalMain', validateSettings)
    info['apiRoot'].journal = techJournal
    # Bind REST events
    events.bind('rest.get.folder/:id/download.after',
                'tech_journal',
                techJournal._onDownloadFileComplete)
    events.bind('rest.get.journal/:id/details.after',
                'tech_journal',
                techJournal._onPageView)
    Folder().exposeFields(level=AccessType.READ, fields='downloadStatistics')
    User().exposeFields(level=AccessType.READ, fields='notificationStatus')
    registerPluginWebroot(Webroot(), info['name'])
