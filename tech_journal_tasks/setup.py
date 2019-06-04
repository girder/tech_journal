from setuptools import setup, find_packages

with open('README.rst', 'r') as fh:
    long_desc = fh.read()

setup(
    name='tech_journal_tasks',
    version='0.0.0',
    description='Class to contain girder-worker tasks for the tech_journal plugin of Girder',
    long_description=long_desc,
    author='OSEHRA',
    author_email='admin@osehra.org',
    license='Apache Software License 2.0',
    classifiers=[
        'Development Status :: 2 - Pre-Alpha',
        'License :: OSI Approved :: Apache Software License',
        'Topic :: Scientific/Engineering',
        'Intended Audience :: Science/Research',
        'Natural Language :: English',
        'Programming Language :: Python'
    ],
    install_requires=[
        'girder_worker',
        'girder_worker_utils'
        # TODO: Add additional packages required by both
        # producer and consumer side installations
    ],
    extras_require={
        'girder': [
            # TODO: Add dependencies here that are required for the
            # package to work on the producer (Girder) side.
        ],
        'worker': [
            # TODO: Add dependencies here that are required for the
            # package to work on the consumer (Girder Worker) side.
        ]
    },
    include_package_data=True,
    entry_points={
        'girder_worker_plugins': [
            'tech_journal_tasks = tech_journal_tasks:TechJournalTasks',
        ]
    },
    packages=find_packages(),
    zip_safe=False
)
