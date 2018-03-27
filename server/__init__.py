#!/usr/bin/env python
# -*- coding: utf-8 -*-

###############################################################################
#  Copyright 2016 Open Source Electronic Health Record Alliance.
#
#  Licensed under the Apache License, Version 2.0 ( the "License" );
#  you may not use this file except in compliance with the License.
#  You may obtain a copy of the License at
#
#    http://www.apache.org/licenses/LICENSE-2.0
#
#  Unless required by applicable law or agreed to in writing, software
#  distributed under the License is distributed on an "AS IS" BASIS,
#  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
#  See the License for the specific language governing permissions and
#  limitations under the License.
###############################################################################
import os
import six
import json
import datetime
from bson.objectid import ObjectId

from girder.api.describe import Description, describeRoute
from girder.api.rest import Resource, RestException, filtermodel, loadmodel
from girder.api import access
from girder.constants import AccessType, TokenScope
from girder.models.model_base import ValidationException
from girder.models.folder import Folder
# from girder.utility import mail_utils
from girder.utility.model_importer import ModelImporter
from girder.utility.plugin_utilities import getPluginDir, registerPluginWebroot
from girder.utility.webroot import WebrootBase
from girder import events
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


def validateSettings(event):
    key, val = event.info['key'], event.info['value']

    if key == constants.TechJournalSettings.admin_email:
        if val:
            if not isinstance(val, six.string_types):
                raise ValidationException(
                    'Tech Journal Resources must be a string.', 'value')
            # accept comma or space separated lists
            resources = val.replace(",", " ").strip().split()
            # reformat to a comma-separated list
            event.info["value"] = ",".join(resources)
    event.preventDefault().stopPropagation()


def checkValue(infoList, filterParams, value):
    if value in infoList:
        if type(infoList[value]) == list:
            if (filterParams[value] in infoList[value]):
                return True
        else:
            if (filterParams[value] == infoList[value]):
                return True
    return False


class TechJournal(Resource):

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
        self.route('PUT', (':id', 'metadata'), self.setSubmissionMetadata)
        self.route('PUT', (':id', 'finalize'), self.finalizeSubmission)
        self.route('PUT', (':id', 'approve'), self.approveSubmission)
        self.route('PUT', ('setting',), self.setJournalSettings)
        self.route('GET', ('setting',), self.getJournalSettings)

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @describeRoute(
        Description('Get all Issues from a given Journal')
        .responseClass('Collection')
        .param('id', "The ID of the Journal (collection) to pull from", paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getAllIssues(self, collection, params):
        issues = list(self.model('folder').childFolders(parentType='collection',
                                                        parent=collection,
                                                        user=self.getCurrentUser()))
        return issues

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @describeRoute(
        Description('Get filtered Issues from a given Journal which are still active')
        .responseClass('Collection')
        .param('id', "The ID of the Journal (collection) to pull from", paramType='path')
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
                dateofIssue = datetime.datetime.strptime(issue["meta"]["paperDue"],
                                                         '%Y-%m-%d %H:%M:%S')
            except ValueError:
                dateofIssue = datetime.datetime.strptime(issue["meta"]["paperDue"],
                                                         '%Y-%m-%dT%H:%M:%S.%fZ')
            if dateofIssue > datetime.datetime.now():
                activeIssues.append(issue)
        return activeIssues

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Get all details of a submission')
        .param('id', "The ID of the submission", paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getSubmissionDetails(self, folder, params):
        parentInfo = self.model('folder').load(folder["parentId"],
                                               user=self.getCurrentUser(), force=True)
        currentInfo = self.model('folder').load(folder["_id"],
                                                user=self.getCurrentUser(), force=True)
        otherRevs = list(self.model('folder').childFolders(parentType='folder', parent=parentInfo,
                                                           user=self.getCurrentUser()))
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
            if ((str(issue["_id"]) == params["filterID"]) or (params["filterID"] == "*")):
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
        Description('Get submissions matching a certain set of parameters')
        .responseClass('Collection')
        .param('id', "The ID of the Journal (collection) to pull from", paramType='path')
        .param('query', "A JSON object to filter the objects over", required=False)
        .param('text', "A JSON object to filter the objects over", required=False)
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getFilteredSubmissions(self, collection, params):
        user = self.getCurrentUser()
        if 'text' in params:
            totalData = list(self.model('folder').textSearch(params['text'], user=user))
            for submission in totalData:
                submissionInfo = list(self.model('folder')
                                          .childFolders(parentType='folder',
                                                        parent=submission,
                                                        user=self.getCurrentUser()
                                                        ))
                if len(submissionInfo):
                    submission['currentRevision'] = submissionInfo[-1]
        else:
            filterParams = json.loads(params["query"])
            totalData = list()
            issues = list(self.model('folder').childFolders(parentType='collection',
                                                            parent=collection,
                                                            user=user
                                                            ))
            for issue in issues:
                testInfo = list(self.model('folder').childFolders(parentType='folder',
                                                                  parent=issue,
                                                                  user=user
                                                                  ))
                for submission in testInfo:
                    foundMatch = True
                    for key in filterParams.keys():
                        if key in submission["meta"].keys():
                            foundMatch = checkValue(submission["meta"], filterParams, key)
                        else:
                            foundMatch = checkValue(submission, filterParams, key)
                    revisionInfo = list(self.model('folder')
                                            .childFolders(parentType='folder',
                                                          parent=submission,
                                                          user=self.getCurrentUser()
                                                          ))
                    if not foundMatch:
                        for revision in revisionInfo:
                            for key in filterParams.keys():
                                if key in revision["meta"].keys():
                                    foundMatch = checkValue(revision["meta"], filterParams, key)
                                else:
                                    foundMatch = checkValue(revision, filterParams, key)
                    if foundMatch:
                        # Find all folders under each submission to capture all revisions
                        submissionInfo = list(self.model('folder')
                                                  .childFolders(parentType='folder',
                                                                parent=submission,
                                                                user=self.getCurrentUser()
                                                                ))
                        if len(submissionInfo):
                            submission['currentRevision'] = submissionInfo[-1]
                        totalData.append(submission)
        totalData = sorted(totalData, reverse=True, key=lambda submission: submission['updated'])
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
        return list(self.model('collection').textSearch("__journal__", user=user))

    @access.user(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.WRITE)
    @describeRoute(
        Description("Move folder from user's directory to the\
                    issue while prepping it for curation")
        .param('id', 'The ID of the folder.', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def finalizeSubmission(self, params, folder):
        DEFAULTS = {
            "enabled": True,
            "status": "REQUESTED"
        }
        folder['curation'] = DEFAULTS
        folder['public'] = False
        self.model('folder').save(folder)
        parentFolder = self.model('folder').load(folder["parentId"], force=True)
        targetFolder = self.model('folder').load(parentFolder["meta"]["targetIssue"], force=True)
        movedFolder = self.model('folder').move(parentFolder, targetFolder, "folder")
        # data = {"name": folder['name']}
        # text = mail_utils.renderTemplate('technical_journal_new_submission.mako', data)
        # mail_utils.sendEmail(toAdmins=True,
        #                       subject="New Submission - Pending Approval",
        #                       text=text)
        movedFolder['curation'] = DEFAULTS
        parentFolder['public'] = False
        self.model('folder').save(movedFolder)
        return movedFolder

    @access.user(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.WRITE)
    @describeRoute(
        Description("Approve a submission and make it publicly visable")
        .param('id', 'The ID of the folder.', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def approveSubmission(self, params, folder):
        DEFAULTS = {
            "enabled": False,
            "status": "APPROVED"}
        parentFolder = self.model('folder').load(folder["parentId"], force=True)
        if not (parentFolder["parentId"] == parentFolder["meta"]["targetIssue"]):
            targetFolder = self.model('folder').load(parentFolder["meta"]["targetIssue"],
                                                     force=True)
            self.model('folder').move(parentFolder, targetFolder, "folder")
        # data = {"name": folder['name']}
        # text = mail_utils.renderTemplate('technical_journal_new_submission.mako', data)
        # mail_utils.sendEmail(toAdmins=True, subject="New Submission", text=text)
        folder['curation'] = DEFAULTS
        folder['public'] = True
        parentFolder['curation'] = DEFAULTS
        parentFolder['public'] = True
        self.model('folder').save(parentFolder)
        self.model('folder').save(folder)
        return folder

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.WRITE)
    @describeRoute(
        Description('Set metadata for a submission. Most stays on each\
                    revision, but others go to the parent folder')
        .param('id', 'The ID of the folder.', paramType='path')
        .param('body', 'A JSON object containing the metadata keys to add',
               paramType='body')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def setSubmissionMetadata(self, params, folder):
        metadata = self.getBodyJson()
        parentMetaData = {}
        for key in ['related', 'copyright', 'grant', 'comments', 'targetIssue']:
            if key in metadata.keys():
                parentMetaData[key] = metadata.pop(key)
        parentFolder = self.model('folder').load(folder["parentId"], user=self.getCurrentUser())
        self.model('folder').setMetadata(parentFolder, parentMetaData)
        self.model('folder').setMetadata(folder, metadata)
        return "Success"

    @access.admin(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Set the journal Settings')
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
    registerPluginWebroot(Webroot(), info['name'])
