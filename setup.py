from setuptools import setup

with open('README.rst') as readme:
    long_description = readme.read()

setup(
    name='girder-tech-journal',
    version='1.1.0',
    description='A Girder plugin for a Technical Journal',
    long_description=long_description,
    long_description_content_type='text/reStructuredText',
    url='https://github.com/girder/tech_journal',
    maintainer='Kitware, Inc.',
    maintainer_email='kitware@kitware.com',
    include_package_data=True,
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
