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


class TechJournal(Resource):

    def __init__(self):
        super(TechJournal,self).__init__()
        self.resourceName = 'journal'
        self.route('GET',(':id','submissions'), self.getAllSubmissions)
        self.route('GET',(':id','issues'), self.getAllIssues)


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
      .errorResponse('Test error.')
      .errorResponse('Read access was denied on the issue.', 403)
    )
    def getAllSubmissions(self, collection, params):
      totalData =  list()
      issues = list(self.model('folder').childFolders(parentType='collection', parent=collection,\
          user=self.getCurrentUser()))
      for issue in issues:
        testInfo = list(self.model('folder').childFolders(parentType='folder', parent=issue,\
          user=self.getCurrentUser()))
        for submission in testInfo:
          totalData.append(submission)
      return totalData
def load(info):
  techJournal = TechJournal()
  events.bind('model.setting.validate', 'journalMain', validateSettings)
  info['apiRoot'].journal = techJournal
