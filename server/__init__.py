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
import six
import json

from girder.api.describe import Description, describeRoute
from girder.api.rest import boundHandler, Resource, RestException, filtermodel, loadmodel, \
    setResponseHeader
from girder.api import access
from girder.constants import AccessType, TokenScope
from girder.models.model_base import ValidationException, AccessException
from girder.utility import ziputil
from girder.utility.model_importer import ModelImporter
from girder.utility.progress import ProgressContext
from girder import events
from . import constants



def validateSettings(event):
    key, val = event.info['key'], event.info['value']

    if key == constants.PluginSettings.admin_email:
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
  if type(infoList[value]) == list:
    if not (filterParams[value] in infoList[value]):
      return True;
  else:
    if not (filterParams[value] == str(infoList[value])):
      return True;
  return False

class TechJournal(Resource):

    def __init__(self):
        super(TechJournal,self).__init__()
        self.resourceName = 'journal'
        self.route('GET',(':id','submissions'), self.getAllSubmissions)
        self.route('GET',(), self.getAllJournals)
        self.route('GET',(':id','issues'), self.getAllIssues)
        self.route('GET',(':id','search'), self.getFilteredIssues)
        self.route('PUT',('setting',),self.setJournalSettings)
        self.route('GET',('setting',),self.getJournalSettings)


    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @filtermodel(model='folder')
    @describeRoute(
      Description('Get all Issues from a given Journal')
      .responseClass('Collection')
      .param('id',"The ID of the Journal (collection) to pull from",paramType='path')
      .errorResponse('Test error.')
      .errorResponse('Read access was denied on the issue.', 403)
    )
    def getAllIssues(self, collection, params):
      issues = list(self.model('folder').childFolders(parentType='collection', parent=collection,\
          user=self.getCurrentUser()))
      return issues

    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @filtermodel(model='folder')
    @describeRoute(
      Description('Get all submissions from a given')
      .responseClass('Collection')
      .param('id',"The ID of the Journal (collection) to pull from",paramType='path')
      .param('filterID',"The ID of the Issue to limit the results from", required=False)
      .errorResponse('Test error.')
      .errorResponse('Read access was denied on the issue.', 403)
    )
    def getAllSubmissions(self, collection, params):
      totalData =  list()
      issues = list(self.model('folder').childFolders(parentType='collection', parent=collection,\
          user=self.getCurrentUser()))
      for issue in issues:
        if ((str(issue["_id"]) == params["filterID"]) or (params["filterID"]=="*")):
            testInfo = list(self.model('folder').childFolders(parentType='folder', parent=issue,\
              user=self.getCurrentUser()))
            for submission in testInfo:
              totalData.append(submission)
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


    @access.public(scope=TokenScope.DATA_READ)
    @loadmodel(model='collection', level=AccessType.READ)
    @filtermodel(model='folder')
    @describeRoute(
      Description('Get submissions matching a certain set of parameters')
      .responseClass('Collection')
      .param('id',"The ID of the Journal (collection) to pull from",paramType='path')
      .param('query',"A JSON object to filter the objects over")
      .errorResponse('Test error.')
      .errorResponse('Read access was denied on the issue.', 403)
    )
    def getFilteredIssues(self, collection, params):
      self.requireParams('query', params)
      filterParams=json.loads(params["query"])
      totalData =  list()
      issues = list(self.model('folder').childFolders(parentType='collection', parent=collection,\
          user=self.getCurrentUser()))
      for issue in issues:
        testInfo = list(self.model('folder').childFolders(parentType='folder', parent=issue,\
          user=self.getCurrentUser()))
        for submission in testInfo:
          foundMismatch = False
          for key in filterParams.keys():
            if key in submission["meta"].keys():
              foundMismatch= checkValue(submission["meta"],filterParams,key)
            else:
              foundMismatch= checkValue(submission,filterParams,key)
          if not foundMismatch:
            totalData.append(submission)
      return totalData

    @access.admin(scope=TokenScope.DATA_READ)
    @describeRoute(
      Description('Set the journal Settings')
      .param('list', 'A JSON list of objects with key and value representing '
'a list of settings to set.', required=True)
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
              ModelImporter.model('journal', 'technical_journal').unset(key=setting['key'])
          else:
              ModelImporter.model('journal', 'technical_journal').set(key=setting['key'], value=value)

    @access.public(scope=TokenScope.DATA_READ)
    @describeRoute(
      Description('get the journal Settings')
      .param('list', 'A JSON list of objects with key and value representing '
'a list of settings to set.', required=True)
      .errorResponse()
      .errorResponse('Read access was denied on the issue.', 403)
    )
    def getJournalSettings(self, params):
      getFunc = getattr(ModelImporter.model('journal', 'technical_journal'), 'get')
      funcParams = {}
      if 'list' in params:
        try:
          keys = json.loads(params['list'])
          if not isinstance(keys, list):
                  raise ValueError()
        except ValueError:
              raise RestException('List was not a valid JSON list.')

        return {k: getFunc(k, **funcParams) for k in keys}

def load(info):
  techJournal = TechJournal()
  events.bind('model.setting.validate', 'journalMain', validateSettings)
  info['apiRoot'].journal = techJournal
