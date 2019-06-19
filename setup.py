from setuptools import setup, Command
from subprocess import check_call
import os


class BuildUICommand(Command):
    description = 'Build the standalone front end and include it in the sdist'
    user_options = []

    def initialize_options(self):
        pass

    def finalize_options(self):
        pass

    def run(self):
        dest = os.path.join(
                os.path.abspath('girder_tech_journal'),
                'external_web_client')

        install = ['yarn', 'install']
        build = ['yarn', 'build']
        copy = ['cp', '-r', 'dist', dest]
        commands = [install, build, copy]

        os.chdir(os.path.abspath('girder-tech-journal-gui'))
        for cmd in commands:
            check_call(cmd)


with open('README.rst') as readme:
    long_description = readme.read()

setup(
    name='girder-tech-journal',
    version='1.0.0',
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
        'celery',
        'girder-worker',
        'girder-oauth'
    ],
    entry_points={
      'girder.plugin': [
          'tech_journal = girder_tech_journal:TechJournalPlugin'
      ]
    },
    cmdclass={
        'build_ui': BuildUICommand
    }
)
