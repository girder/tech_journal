import os
from pkg_resources import resource_filename

from girder import events
from girder.constants import AccessType
from girder.models.folder import Folder
from girder.models.user import User
from girder.plugin import GirderPlugin
from girder.utility import mail_utils, config
from girder.utility.model_importer import ModelImporter

import girder_tech_journal.settings  # noqa: F401
from girder_tech_journal.models.journal import Journal
from girder_tech_journal.models.download_statistics import DownloadStatistics
from girder_tech_journal.api.tech_journal import TechJournal
from girder_tech_journal.utils.mail import _queueEmails


class TechJournalPlugin(GirderPlugin):
    DISPLAY_NAME = 'Tech Journal'
    CLIENT_SOURCE_PATH = 'web_client'

    def load(self, info):
        ModelImporter.registerModel('journal', Journal, plugin='tech_journal')
        ModelImporter.registerModel('download_statistics', DownloadStatistics,
                                    plugin='tech_journal')
        mail_utils.addTemplateDirectory(os.path.realpath(
            resource_filename(
                'girder_tech_journal',
                'mail_templates')))

        info['apiRoot'].journal = TechJournal()

        if config.getConfig()['server']['mode'] == 'production':
            info['config']['/tech_journal'] = {
                'tools.staticdir.on': True,
                'tools.staticdir.dir': os.path.realpath(
                    resource_filename(
                        'girder_tech_journal',
                        'external_web_client')
                ),
                'tools.staticdir.index': 'index.html'
            }

        events.bind('_queueEmails', 'tech_journal.queueEmails', _queueEmails)

        Folder().exposeFields(level=AccessType.READ,
                              fields='downloadStatistics')
        Folder().exposeFields(level=AccessType.READ, fields='certified')
        User().exposeFields(level=AccessType.READ, fields='notificationStatus')
