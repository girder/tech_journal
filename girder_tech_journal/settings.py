class TechJournalSettings(object):
    ADMIN_EMAIL = 'tech_journal.admin_email'
    DEFAULT_JOURNAL = 'tech_journal.default_journal'
    DEFAULT_LAYOUT = 'tech_journal.default_layout'
    BASE_HANDLE = 'tech_journal.base_handle'
    OLD_URL = 'tech_journal.old_url'
    SUBMISSION = 'tech_journal.submission'


class TechJournalSettingsDefault(object):
    defaults = {
        TechJournalSettings.ADMIN_EMAIL: "",
        TechJournalSettings.DEFAULT_JOURNAL: "",
        TechJournalSettings.DEFAULT_LAYOUT: "",
        TechJournalSettings.BASE_HANDLE: "",
        TechJournalSettings.OLD_URL: "",
        TechJournalSettings.SUBMISSION: 0
    }
