from girder.models.model_base import AccessControlledModel, ValidationException
from girder.utility import setting_utilities
from girder import logprint

from collections import OrderedDict
import cherrypy
import pymongo
import six

class Journal(AccessControlledModel):
    def initialize(self):
      self.name='journal_collection'

    def validate(self, entry):
      return entry

    # Taken from the settings module
    def get(self, key, default='__default__'):
        """
        Retrieve a setting by its key.
        :param key: The key identifying the setting.
        :type key: str
        :param default: If no such setting exists, returns this value instead.
        :returns: The value, or the default value if the key is not found.
        """
        setting = self.findOne({'key': key})
        if setting is None:
            if default is '__default__':
                default = self.getDefault(key)
            return default
        else:
            return setting['value']

    def set(self, key, value):
        """
        Save a setting. If a setting for this key already exists, this will
        replace the existing value.
        :param key: The key identifying the setting.
        :type key: str
        :param value: The object to store for this setting.
        :returns: The document representing the saved Setting.
        """
        setting = self.findOne({'key': key})
        if setting is None:
            setting = {
                'key': key,
                'value': value
            }
        else:
            setting['value'] = value

        return self.save(setting)

