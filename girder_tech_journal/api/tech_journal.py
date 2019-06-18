import datetime
import json
import re
import six
import urllib
from bson.objectid import ObjectId

from girder import events
from girder.api import access
from girder.api.describe import Description, describeRoute
from girder.api.rest import Resource, RestException, filtermodel, loadmodel
from girder.constants import AccessType, TokenScope
from girder.external.mongodb_proxy import MongoProxy
from girder.models import getDbConnection
from girder.models.collection import Collection
from girder.models.folder import Folder
from girder.models.item import Item
from girder.models.setting import Setting
from girder.models.upload import Upload
from girder.models.user import User
from girder.utility import mail_utils

from girder_worker_utils.transforms.girder_io import GirderUploadToItem
from tech_journal_tasks.tasks import processGithub, surveySubmission

from girder_tech_journal import constants
from girder_tech_journal.utils.mail import sendEmails
from girder_tech_journal.models.download_statistics import DownloadStatistics
from girder_tech_journal.models.journal import Journal


def sortByDate(elem):
    return elem['created']


def checkValue(infoList, filterParams, category, value):
    if 'meta' in infoList:
        if "categories" in infoList['meta'].keys():
            if value in infoList['meta']["categories"]:
                return True
    if category in infoList:
        if category == "creatorId":
            value = ObjectId(value)
        if type(infoList[category]) == list:
            if (value in infoList[category]):
                return True
        else:
            if (value == infoList[category]):
                return True
    return False


class TechJournal(Resource):

    def findReviews(self, reviewType, reviewTemplates, revisionData):
        # First filter review types,
        # i.e. a list of  only peer review templates
        reviewTemplateList = []
        for template in reviewTemplates:
            if reviewTemplates[template]['value']["questions"]["list"]["type"] == reviewType:
                reviewTemplateList.append(reviewTemplates[template]['value'])
        # Go through each review template checking category vs submission list
        for template in reviewTemplateList:
            if template["questions"]["list"]["category_id"] == "Default":
                reviewTemplate = template
                break
        for review in reviewTemplateList:
            if review["questions"]["list"]["category_id"] in revisionData["meta"]["categories"]:
                reviewTemplate = review
        return reviewTemplate

    def getDownloadCount(self, idVal, targetYear):
        cur = DownloadStatistics().find({'item_id': idVal})
        downloads = 0
        for download in cur:
            if download['date'].year == targetYear:
                downloads += 1
        return downloads

    def checkSubmission(self, filterParams, submission, searchObj, targetVal, category):
        keyMatch = [False, -1]
        if searchObj in submission["meta"].keys():
            keyMatch[0] = keyMatch[0] or checkValue(
                submission["meta"],
                filterParams[category],
                searchObj,
                targetVal)
        else:
            keyMatch[0] = keyMatch[0] or checkValue(
                submission,
                filterParams[category],
                searchObj,
                targetVal)
        # Capture all revisions under each object
        revisionInfo = list(Folder()
                            .childFolders(parentType='folder',
                                          parent=submission,
                                          user=self.getCurrentUser()))
        # If not found in the top level data, search through each revision
        if not keyMatch[0]:
            for revision in revisionInfo:
                revisionMatch = [False, -1]
                for key in filterParams[category]:
                    searchObj = category
                    targetVal = key
                    if re.match("has.*code", key):
                        searchObj = key
                        targetVal = "true"
                    if category == "License":
                        searchObj = "source-license"
                    elif category == "Certified":
                        searchObj = "certification_level"
                    elif category == "OSEHRA":
                        searchObj = "osehra_core"
                    if searchObj in revision["meta"].keys():
                        revisionMatch[0] = revisionMatch[0] or checkValue(
                            revision["meta"],
                            filterParams[category],
                            searchObj,
                            targetVal)
                    else:
                        revisionMatch[0] = revisionMatch[0] or checkValue(
                            revision,
                            filterParams[category],
                            searchObj,
                            targetVal)
                if revisionMatch[0]:
                    revisionMatch[1] = int(revision["meta"]["revisionNumber"])
                    keyMatch = revisionMatch
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
        self.route('PUT', (':id', 'review'), self.updateReviews)
        self.route('PUT', (':id', 'finalize'), self.finalizeSubmission)
        self.route('PUT', (':id', 'approve'), self.approveSubmission)
        self.route('PUT', (':id', 'comments'), self.updateComments)
        self.route('GET', (':id', 'survey'), self.getSurvey)
        self.route('PUT', ('setting',), self.setJournalSettings)
        self.route('GET', ('setting',), self.getJournalSettings)
        self.route('GET', ('licenses',), self.getJournalLicenses)
        self.route('GET', (':id', 'statistics',), self.getYearlyStatistics)
        self.route('POST', ('feedback',), self.sendFeedBack)
        self.route('DELETE', (':id',), self.deleteObject)
        self.route('PUT', ('user',), self.updateUser)
        self.route('GET', (':id', "citation", ":type"), self.printCitation)

        self.route('GET', ('submission', ':id'), self.getSubmission)
        self.route('GET', ('submission', ':id', 'revision'), self.getRevisions)
        self.route('GET', ('review', ':id', 'directory'), self.getUploadDirectory)
        self.route('POST', ('review', ':id', 'upload'), self.uploadEvidence)
        self.route('POST', ('submission', 'number'), self.getNewSubmissionNumber)
        self.route('POST', ('submission', ':submission', 'number'), self.getNewRevisionNumber)

        self.route('GET', ('translate',), self.translate)

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

        # APIs for getting of review question lists
        self.route('GET', ('questions',), self.getQuestions)
        self.route('PUT', ('questions',), self.setQuestions)
        self.route('DELETE', ('questions',), self.deleteQuestions)

        # Bind REST events
        events.bind('rest.get.folder/:id/download.after',
                    'tech_journal.onDownloadFileComplete',
                    self._onDownloadFileComplete)
        events.bind('rest.get.journal/:id/details.after',
                    'tech_journal.onPageView',
                    self._onPageView)

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Get the Review question lists. Supply a name to return only the one set')
        .param('qType', 'Name of review list to acquire', required=False)
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getQuestions(self, params):
        qLists = Journal().getAllByTag('questionList')
        if 'qType' in params:
            qLists = {k: v for (k, v) in qLists.iteritems() if k == params['qType']}
        return qLists

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Update or create a set of Review questions')
        .param('body', 'A JSON object containing the QuestionList object to update',
               paramType='body')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def setQuestions(self, params):
        questionJSON = self.getBodyJson()
        Journal().set(key=questionJSON['key'],
                      value=questionJSON['value'],
                      tag='questionList')

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Delete a journal''s filter Category')
        .param('text', "A question list name", required=True)
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def deleteQuestions(self, params):
        ModelImporter.model('journal', 'tech_journal').removeObj(params['text'])

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
        issueFilter = {"meta.__issue__": True}
        issues = list(Folder().childFolders(parentType='collection',
                                            parent=collection,
                                            user=self.getCurrentUser(),
                                            filters=issueFilter))
        issues.sort(key=sortByDate)
        return issues

    @access.public(scope=TokenScope.DATA_WRITE)
    @loadmodel(model='folder', level=AccessType.WRITE)
    @describeRoute(
        Description('Delete a Submission by ID ')
        .responseClass('folder')
        .param('id', 'The ID of the object to delete', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def deleteObject(self, folder, params):
        return Folder().remove(folder)

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
        bodyJson = self.getBodyJson()
        user = User().load(bodyJson['_id'], user=self.getCurrentUser())
        user['notificationStatus'] = bodyJson['notificationStatus']
        return User().save(user)

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @describeRoute(
        Description('Get Issues from a Journal that have not yet been closed')
        .responseClass('Collection')
        .param('id', 'The ID of the Journal (collection) to pull from', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getFilteredIssues(self, collection, params):
        issueFilter = {"meta.__issue__": True}
        issues = list(Folder().childFolders(parentType='collection',
                                            parent=collection,
                                            user=self.getCurrentUser(),
                                            filters=issueFilter))
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
        parentInfo = Folder().load(folder['parentId'],
                                   user=self.getCurrentUser(), force=True)
        parentInfo['issue'] = Folder().load(parentInfo['parentId'],
                                            user=self.getCurrentUser(),
                                            force=True)
        parentInfo['submitter'] = User().load(folder['creatorId'],
                                              user=self.getCurrentUser(),
                                              force=True)
        currentInfo = Folder().load(folder['_id'],
                                    user=self.getCurrentUser(), force=True)
        otherRevs = list(Folder().childFolders(parentType='folder', parent=parentInfo,
                                               user=self.getCurrentUser()))
        otherRevs.sort(key=sortByDate)
        cursor = DownloadStatistics().find({"item_id": ObjectId(parentInfo["_id"])})
        parentInfo['downloads'] = len([x for x in cursor])
        for rev in otherRevs:
            rev['submitter'] = User().load(rev['creatorId'],
                                           user=self.getCurrentUser(),
                                           force=True)
        return (currentInfo, parentInfo, otherRevs)

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Get details of a submission')
        .param('id', 'The ID of the submission', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getSubmission(self, folder, params):
        info = Folder().load(
            folder['_id'],
            user=self.getCurrentUser(),
            force=True)
        info['issue'] = Folder().load(
            info['parentId'],
            user=self.getCurrentUser(),
            force=True)
        cursor = DownloadStatistics().find({"item_id": ObjectId(info["_id"])})
        info['downloads'] = len([x for x in cursor])
        return info

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Get all revisions of a submission')
        .param('id', 'The ID of the submission', paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getRevisions(self, folder, params):
        info = Folder().load(folder['_id'],
                             user=self.getCurrentUser(),
                             level=AccessType.ADMIN,
                             force=True)
        revisions = list(Folder().childFolders(info, 'folder'))
        revisions.sort(key=sortByDate)
        revisions.reverse()
        for rev in revisions:
            rev['submitter'] = User().load(
                rev['creatorId'],
                user=self.getCurrentUser(),
                force=True)
        return list(revisions)

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Get the ID of the folder where all evidence files for a review are placed')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getUploadDirectory(self, folder, params):
        info = Folder().load(folder['parentId'],
                             user=self.getCurrentUser(),
                             level=AccessType.ADMIN,
                             force=True)
        issue = Folder().load(info['parentId'], force=True)
        return issue['meta']['reviewUploadDir']

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Create an upload object in the Review Files folder')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def uploadEvidence(self, folder, params):
        json = self.getBodyJson()
        upload = Upload().createUpload(self.getCurrentUser(),
                                       json['name'],
                                       'folder',
                                       folder,
                                       json['size'],
                                       json['type']
                                       )
        return upload

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Generate a new submission number')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getNewSubmissionNumber(self, params):
        s = Setting()

        nextNum = s.get('technical_journal.submission')
        if nextNum is None:
            nextNum = 1000

        s.set('technical_journal.submission', nextNum + 1)

        return nextNum

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Generate a new revision number')
        .param('submission', 'The submission number for which to generate a new revision number',
               paramType='path')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def getNewRevisionNumber(self, submission, params):
        s = Setting()

        key = 'technical_journal.submission.%s' % (submission)

        nextNum = s.get(key)
        if nextNum is None:
            nextNum = 1

        s.set(key, nextNum + 1)

        return nextNum

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Translate submission and/or revision numbers to a Girder IDs')
        .param('submission', 'The number of the submission', paramType='query')
        .param('revision', 'The number of the revision', paramType='query', required=False)
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def translate(self, params):
        submission = params['submission']
        revision = params.get('revision')

        db = getDbConnection()
        coll = MongoProxy(db.get_database()['folder'])

        result = {}

        doc = coll.find_one({'meta.submissionNumber': submission})
        if doc:
            result['submission'] = doc['_id']

            if revision:
                id = doc['_id']
                doc = coll.find_one({'parentId': ObjectId(id), 'meta.revisionNumber': revision})

                if doc:
                    result['revision'] = doc['_id']
                else:
                    result = None

        return result or None

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
        issues = list(Folder().childFolders(parentType='collection', parent=collection,
                                            user=self.getCurrentUser()))
        submissionFilter = {"meta.submissionNumber": {'$gte': "0"}}
        for issue in issues:
            if (str(issue['_id']) == params['filterID']) or (params['filterID'] == '*'):
                testInfo = list(Folder().childFolders(parentType='folder', parent=issue,
                                                      user=self.getCurrentUser(),
                                                      filters=submissionFilter))
                for submission in testInfo:
                    # Find all folders under each submission to capture all revisions
                    submissionInfo = list(Folder()
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
        submissionFilter = {"meta.submissionNumber": {'$gte': "0"}}
        issues = list(Folder().childFolders(parentType='collection',
                                            parent=collection,
                                            user=self.getCurrentUser()))
        for issue in issues:
            testInfo = list(Folder().childFolders(parentType='folder', parent=issue,
                                                  user=self.getCurrentUser(),
                                                  filters=submissionFilter))
            for submission in testInfo:
                # Find all folders under each submission to capture all revisions
                submissionInfo = list(Folder()
                                      .childFolders(parentType='folder',
                                                    parent=submission,
                                                    user=self.getCurrentUser()
                                                    ))
                if len(submissionInfo):
                    submission['currentRevision'] = submissionInfo[-1]
                    submission['currentRevision']['logo'] = self.getLogo(
                        id=submission['currentRevision']['_id'],
                        params=params
                    )
                if "curation" in submission:
                    if submission['curation']['status'] == "REQUESTED":
                        totalData.append(submission)
        totalData = sorted(totalData, reverse=True, key=lambda submission: submission['updated'])
        return totalData

    @access.public(scope=TokenScope.DATA_READ)  # noqa: C901
    @loadmodel(model='collection', level=AccessType.READ)
    @describeRoute(
        Description('Get submissions which were submitted in a given calendar year')
        .responseClass('Collection')
        .param('id', "The ID of the Journal (collection) to pull from", paramType='path')
        .param('year', "The calendar year to gather statistics over")
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getYearlyStatistics(self, collection, params):
        targetYear = int(params['year'])
        submissions = {'total': {}, 'monthly': []}
        # First gather all submissions from the target year
        cursor = Folder().collection.aggregate([{
            '$match': {
                '$expr': {
                    '$and': [
                        {'$eq': [{'$year': "$created"}, targetYear]},
                        {'$gte': ["$meta.revisionNumber", 0]}
                    ]
                }
            }
        }, ])

        # Loop through the submissions calculating the total number of
        # views and downloads across all revisions
        for revision in cursor:
            if not revision['baseParentId'] == collection['_id']:
                continue
            subs = Folder().load(revision['parentId'],
                                 user=self.getCurrentUser(), force=True)
            if subs['name'] not in submissions['total']:
                submissions['total'][subs['name']] = {}
            subs['views'] = revision['downloadStatistics']['views']
            subs['downloads'] = self.getDownloadCount(ObjectId(subs['_id']), targetYear)
            subs['license'] = revision['meta']['source-license']
            submissions['total'][subs['name']] = subs
        submissions['total'] = sorted(submissions['total'].values(),
                                      key=lambda x: x['downloads'],
                                      reverse=True)

        cursor = Folder().collection.aggregate([{
            '$match': {
                '$expr': {
                    '$and': [
                        {'$eq': [{'$year': "$created"}, targetYear]},
                        {'$gte': ["$meta.revisionNumber", 0]}
                    ]
                }
            }
        }, {
            '$bucket': {
                'groupBy': {
                    '$month': "$created"
                },
                'boundaries': range(14),
                'default': -1,
                'output': {
                    'has_code': {
                        '$sum': {
                            '$switch': {
                                'branches': [{
                                    'case': {'$eq': ['$meta.has_code', 'true']},
                                    'then': 1
                                }],
                                'default':0
                            }
                        }
                    },
                    'total': {'$sum': 1},
                    'ids': {'$addToSet': '$parentId'},
                    'idList': {'$addToSet': '$creatorId'},
                }
            }
        }])
        for bucket in cursor:
            bucket['names'] = []
            bucket['downloads'] = 0
            for idVal in bucket['idList']:
                usr = User().find({"_id": idVal})
                if usr.count():
                    bucket['names'].append(usr[0]['firstName'] + " " + usr[0]['lastName'])
            for submission in bucket['ids']:
                bucket['downloads'] += self.getDownloadCount(ObjectId(submission), targetYear)
            submissions['monthly'].append(bucket)
        return submissions

    @access.public(scope=TokenScope.DATA_READ)  # noqa: C901
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
            issues = [Folder().load(filterParams['issueId'],
                                    user=user,
                                    force=True)]
            del filterParams['issueId']
        else:
            issues = list(Folder().childFolders(parentType='collection',
                                                parent=collection,
                                                user=user
                                                ))
        textArg = {}
        # "AND" regex update taken from:
        # https://stackoverflow.com/questions/3041320/regex-and-operator/37692545
        if "text" in filterParams:
            textArg = {"name": {"$regex": "(?=.*"+filterParams['text']+")", "$options": "i"}}
            del filterParams['text']
        if "Code" in filterParams:
            if "is_cif" in filterParams['Code']:
                if textArg:
                    textArg["name"]["$regex"] += "(?=.*Code in Flight)"
                else:
                    textArg = {"name": {"$regex": "Code in Flight", "$options": "i"}}
                filterParams['Code'].remove("is_cif")
        textArg["meta.submissionNumber"] = {'$gte': "0"}
        for issue in issues:
            testInfo = list(Folder().childFolders(parentType='folder',
                                                  parent=issue,
                                                  user=user,
                                                  filters=textArg
                                                  ))
            for submission in testInfo:
                # ===================================================
                # Complicated search to "or" and "and" query objects
                # ===================================================
                # Submission match now tracks the revision number
                submissionMatch = [True, -1]
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
                        elif category == "Certified":
                            searchObj = "certification_level"
                        elif category == "OSEHRA":
                            searchObj = "osehra_core"
                        foundMatch = self.checkSubmission(filterParams,
                                                          submission,
                                                          searchObj,
                                                          targetVal,
                                                          category) or foundMatch
                    submissionMatch[0] = foundMatch[0] and submissionMatch[0]
                    submissionMatch[1] = foundMatch[1]
                if submissionMatch[0]:
                    # Find all folders under each submission to capture all revisions
                    submissionInfo = list(Folder()
                                          .childFolders(parentType='folder',
                                                        parent=submission,
                                                        user=self.getCurrentUser()
                                                        ))
                    # Grab the last object as its most current revision
                    if len(submissionInfo):
                        submissionInfo = sorted(submissionInfo,
                                                key=lambda submission: submission['updated'])
                        # If revisionVal is not -1, filter revisions to find the one that matched
                        revisionInfo = submissionInfo[-1]
                        if not submissionMatch[1] == -1:
                            for revision in submissionInfo:
                                if revision['meta']['revisionNumber'] == str(submissionMatch[1]):
                                    revisionInfo = revision
                        revisionInfo['logo'] = self.getLogo(
                            id=revisionInfo['_id'],
                            params=params)
                        submission['currentRevision'] = revisionInfo
                    # If not found already, add it to the returned information
                    if submission not in totalData:
                        totalData.append(submission)
        # Prevent non-approved submissions from being shown to non-admin users
        if (not user) or (not user['admin']):
            totalData = filter(lambda submission: submission['curation']['status'] != 'REQUESTED',
                               totalData)
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
        return list(Collection().textSearch('__journal__', user=user))

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Get logo associated with submission')
        .param('id', "The ID of the foder to aquire logo for", paramType='path')
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getLogo(self, folder, params):
        thumbURL = ""
        for fileObj in Folder().childItems(folder, user=self.getCurrentUser()):
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
        parentFolder = Folder().load(folder['parentId'], force=True)
        for fileObj in Folder().childItems(parentFolder, user=self.getCurrentUser()):
            if fileObj['name'] == "Survey Result":
                downLoadObj = Item().fileList(fileObj).next()[1]()
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
        folder['public'] = True
        Folder().save(folder)
        parentFolder = Folder().load(folder['parentId'], force=True)
        targetFolder = Folder().load(parentFolder['meta']['targetIssue'], force=True)
        movedFolder = Folder().move(parentFolder, targetFolder, 'folder')
        data = {'name': folder['name'],
                'authors': folder['meta']['authors'],
                'abstract': parentFolder['description'],
                'id': folder['_id']}
        text = mail_utils.renderTemplate('tech_journal_approval.mako', data)
        sendEmails(User().getAdmins(), 'New Submission - Pending Approval', text)
        movedFolder['curation'] = DEFAULTS
        parentFolder['public'] = True
        Folder().save(movedFolder)
        newItem = Item().createItem(name="Survey Result",
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
        metadata = self.getBodyJson()
        DEFAULTS = {
            'enabled': False,
            'status': 'APPROVED'}
        parentFolder = Folder().load(folder['parentId'], force=True)
        folder['public'] = True
        parentFolder['public'] = True
        getFunc = getattr(Journal(), 'get')
        if getFunc("tech_journal.use_review", {}):
            # Use the folder's information to find review objects to
            reviewObjects = Journal().getAllByTag("questionList")
            folder['meta']['reviews'] = {
                'peer': {"template": {},
                         "reviews": []},
                'final': {"template": {},
                          "reviews": []}
            }
            folder['meta']['revisionPhase'] = "peer"

            folder['meta']['reviews']['peer']['template'] = self.findReviews('peer',
                                                                             reviewObjects,
                                                                             folder)
            folder['meta']['reviews']['final']['template'] = self.findReviews('final',
                                                                              reviewObjects,
                                                                              folder)
        if not (parentFolder['parentId'] == parentFolder['meta']['targetIssue']):
            targetFolder = Folder().load(parentFolder['meta']['targetIssue'],
                                         force=True)
            Folder().move(parentFolder, targetFolder, 'folder')
        data = {'name': parentFolder['name'],
                'authors': folder['meta']['authors'],
                'abstract': parentFolder['description'],
                'subNo': parentFolder['meta']['submissionNumber'],
                'revNo': folder['meta']['revisionNumber']
                }
        subject = ''
        if Folder().countFolders(parentFolder) == 1:
            subject = 'New Submission'
            params['sendEmail'] = True
            emailTemplate = 'tech_journal_new_submission.mako'
        else:
            subject = 'Updated Submission'
            data['rNotes'] = folder['description']
            emailTemplate = 'tech_journal_updated.mako'
        if metadata['notification-email']:
            html = mail_utils.renderTemplate(emailTemplate, data)
            sendEmails(
                User().find({
                    'notificationStatus.NewSubmissionEmail': {'$ne': False}
                }),
                subject,
                html
            )
        folder['curation'] = DEFAULTS
        folder['public'] = True
        folder['downloadStatistics'] = {
            'views': 0,
            'completed': 0
        }
        parentFolder['curation'] = DEFAULTS
        parentFolder['public'] = True

        # Add appropriate Reviews to
        Folder().save(parentFolder)
        Folder().save(folder)
        return folder

    @access.user(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Update the Review information for a submission')
        .param('id', 'The ID of the folder.', paramType='path')
        .param('body', 'A JSON object containing the Review metadata to update',
               paramType='body')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def updateReviews(self, params, folder):
        metadataDict = self.getBodyJson()
        metadata = metadataDict['meta']
        reviewIndex = int(metadataDict['index'])
        reviewType = metadataDict['type']
        reviewUser = metadata['reviews'][reviewType]['reviews'][reviewIndex]['user']
        reviewUserName = "%s %s" % (reviewUser['firstName'], reviewUser['lastName'])
        parentFolder = Folder().load(folder['parentId'],
                                     user=self.getCurrentUser(),
                                     force=True)
        Folder().setMetadata(folder, metadata)
        data = {'name': parentFolder['name'],
                'id': folder['_id'],
                'index': reviewIndex,
                'type': reviewType,
                'reviewer': reviewUserName
                }
        subject = "New Review: %s" % parentFolder['name']
        emailTemplate = 'tech_journal_new_review.mako'
        html = mail_utils.renderTemplate(emailTemplate, data)
        sendEmails(
            User().find({
                'notificationStatus.NewReviewsEmail': {'$ne': False}
            }),
            subject,
            html
        )

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
                newItem = Item().createItem(name="GitHub Repository",
                                            creator=self.getCurrentUser(),
                                            folder=folder,
                                            description=metadata['github'])
                Item().setMetadata(newItem, {'type': "GITHUB"})
                processGithub.delay(metadata['github'],
                                    girder_result_hooks=[GirderUploadToItem(str(newItem['_id'])), ])
            else:
                raise RestException('The repository doesn\'t exist or the URL is invalid.')
        for key in ['related', 'copyright', 'grant', 'comments',
                    'attribution-policy', 'targetIssue', 'submissionNumber']:
            if key in metadata.keys():
                parentMetaData[key] = metadata.pop(key)
        parentFolder = Folder().load(folder['parentId'],
                                     user=self.getCurrentUser(),
                                     force=True)
        Folder().setMetadata(parentFolder, parentMetaData)
        Folder().setMetadata(folder, metadata)
        return 'Success'

    @access.user(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Add/Update the comments for a submission')
        .param('id', 'The ID of the folder.', paramType='path')
        .param('sendEmail', "Send an email about comment update")
        .param('body', 'A JSON object containing the comments to update',
               paramType='body')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def updateComments(self, params, folder):
        metadata = self.getBodyJson()

        parentFolder = Folder().load(folder['parentId'],
                                     user=self.getCurrentUser(),
                                     force=True)
        if params['sendEmail'] == 'send':
            data = {'name': parentFolder['name'],
                    'commentText': metadata['comments'][-1]['text'],
                    'commentAuthor':  metadata['comments'][-1]["name"],
                    'subNo': parentFolder['meta']['submissionNumber'],
                    'revNo': folder['meta']['revisionNumber']
                    }
            subject = "Comment Added - Submission %s" % parentFolder['name']
            emailTemplate = 'tech_journal_new_comment.mako'
            html = mail_utils.renderTemplate(emailTemplate, data)
            sendEmails(
                User().find({
                    'notificationStatus.NewCommentEmail': {'$ne': False}
                }),
                subject,
                html
            )
        Folder().setMetadata(parentFolder, metadata)
        return 'Success'

    @access.admin(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Set the settings for the Tech Journal')
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
                Journal().unset(key=setting['key'])
            else:
                Journal().set(key=setting['key'],
                                                                   value=value)

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Get the settings for the Tech Journal')
        .param('list', 'A JSON list of objects with key and value representing\
                        a list of settings to set.', required=True)
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getJournalSettings(self, params):

        getFunc = getattr(Journal(), 'get')
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
        Description('Get the list of Tech Journal licenses')
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getJournalLicenses(self, params):
        return constants.TechJournalLicenseDefault.licenseDict

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='folder', level=AccessType.READ)
    @describeRoute(
        Description('Get citation for an submission')
        .param('id', 'The ID of the folder.', paramType='path')
        .param('type', 'Type of citation to generate', paramType='path')
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def printCitation(self, folder, type, params):
        folder['parent'] = Folder().load(folder['parentId'],
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
        Journal().set(key=params['text'],
                      value=[], tag=params['tag'])

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('get the journal'' filter categories')
        .param('tag', "An object tag", required=True)
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def getJournalObjs(self, params):
        return Journal().getAllByTag(params['tag'])

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
        Description('Delete a journal''s filter Category')
        .param('text', "A category name", required=True)
        .errorResponse()
        .errorResponse('Read access was denied on the issue.', 403)
        )
    def rmJournalObj(self, params):
        Journal().removeObj(params['text'])

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
                Journal().unset(key=setting['key'])
            else:
                Journal().set(key=setting['key'],
                              value=value, tag=params['tag'])

    def _onDownloadFileComplete(self, event):
        folder = Folder().load(event.info['id'],
                               user=self.getCurrentUser(), force=True)
        parentInfo = Folder().load(folder['parentId'],
                                   user=self.getCurrentUser(), force=True)
        DownloadStatistics().save({
            'date': datetime.datetime.now(),
            'item_id': ObjectId(parentInfo['_id'])
        })

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
                        with three params: title, location, summary',
               paramType='body')
        .errorResponse('Test error.')
        .errorResponse('Read access was denied on the issue.', 403)
    )
    def sendFeedBack(self, params):
        metadata = self.getBodyJson()
        subject = "Website Feedback from %s" % metadata['title']
        emailTemplate = 'tech_journal_feedback.mako'
        html = mail_utils.renderTemplate(emailTemplate, metadata)
        sendEmails(User().getAdmins(), subject, html)
        return 'Success'
