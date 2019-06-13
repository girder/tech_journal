import six

from girder.utility import setting_utilities
from girder.exceptions import ValidationException


class TechJournalSettings(object):
    ADMIN_EMAIL = 'tech_journal.admin_email'
    DEFAULT_JOURNAL = 'tech_journal.default_journal'
    DEFAULT_LAYOUT = 'tech_journal.default_layout'
    BASE_HANDLE = 'tech_journal.base_handle'
    OLD_URL = 'tech_journal.old_url'


@setting_utilities.default(TechJournalSettings.ADMIN_EMAIL)
def _defaultAdminEmail():
    return ''


@setting_utilities.default(TechJournalSettings.DEFAULT_JOURNAL)
def _defaultDefaultJournal():
    return ''


@setting_utilities.default(TechJournalSettings.DEFAULT_LAYOUT)
def _defaultDefaultLayout():
    return ''


@setting_utilities.default(TechJournalSettings.BASE_HANDLE)
def _defaultBaseHandle():
    return ''


@setting_utilities.default(TechJournalSettings.OLD_URL)
def _defaultOldUrl():
    return ''


@setting_utilities.validator(TechJournalSettings.ADMIN_EMAIL)
def validateSettings(doc):
    if doc['value']:
        if not isinstance(doc['value'], six.string_types):
            raise ValidationException(
                'Tech Journal Resources must be a string.', 'value')
        # accept comma or space separated lists
        resources = doc['value'].replace(',', ' ').strip().split()
        # reformat to a comma-separated list
        doc['value'] = ','.join(resources)
