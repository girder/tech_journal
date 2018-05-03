# -*- coding: utf-8 -*-

"""Top-level package for tech_journal_tasks."""

__author__ = """OSEHRA"""
__email__ = 'admin@osehra.org'
__version__ = '0.0.0'


from girder_worker import GirderWorkerPluginABC


class TechJournalTasks(GirderWorkerPluginABC):
    def __init__(self, app, *args, **kwargs):
        self.app = app

    def task_imports(self):
        # Return a list of python importable paths to the
        # plugin's path directory
        return ['tech_journal_tasks.tasks']
