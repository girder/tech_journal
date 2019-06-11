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
import six
import os

from girder import events
from girder.constants import AccessType
from girder.models.model_base import ValidationException
from girder.models.folder import Folder
from girder.models.user import User
from girder.plugin import GirderPlugin
from girder.utility import mail_utils
from girder.utility.model_importer import ModelImporter
from . import constants
from .models.journal import Journal
from .api.tech_journal import TechJournal
from .utils.mail import _queueEmails


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


class TechJournalPlugin(GirderPlugin):
    DISPLAY_NAME = 'Tech Journal'
    CLIENT_SOURCE_PATH = 'web_client'

    def load(self, info):
        ModelImporter.registerModel('journal', Journal, plugin='tech_journal')
        mail_utils.addTemplateDirectory(os.path.join(
            os.path.dirname(__file__),
            'mail_templates'
        ))

        events.bind('model.setting.validate', 'journalMain', validateSettings)
        info['apiRoot'].journal = TechJournal()
        info['config']['/tech_journal'] = {
            'tools.staticdir.on': True,
            'tools.staticdir.dir': os.path.join(
                os.path.abspath('girder-tech-journal-gui'), 'dist'),
            'tools.staticdir.index': 'index.html'
        }

        events.bind('_queueEmails', 'tech_journal._queueEmails', _queueEmails)

        Folder().exposeFields(level=AccessType.READ,
                              fields='downloadStatistics')
        Folder().exposeFields(level=AccessType.READ, fields='certified')
        User().exposeFields(level=AccessType.READ, fields='notificationStatus')
