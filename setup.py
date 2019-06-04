from setuptools import setup

setup(
    name='girder-tech-journal',
    version='0.1.0',
    description='A Girder plugin for a Technical Journal',
    packages=['girder_tech_journal'],
    install_requires=[
        'girder',
        'celery'
    ],
    entry_points={
      'girder.plugin': [
          'tech_journal = girder_tech_journal:TechJournalPlugin'
      ]
    }
)
