Tech Journal Plugin |build-status| |license-badge|
==================================================

Assumes a certain folder structure so far for the main page display:
The top level collection ID value is what should be used in the configuration page
It will then search for the folders under each, to find all available journal "issues"

From each of those "issues", it will query for a "submission" which is an available folder
in the "issue".  Eventually, this folder will have metadata for the rest of the information
that needs to be shown.  A sample structure is found in a graphic diagram below, with the Girder
type in parenthesis:

.. parsed-literal::

   OTJ (collection)
   ├── 2016 Jan-Jun (folder)
   │   ├── Submission 1 (folder)
   │   │   └── Revision 1
   |   |       └── blah.tar
   │   │   └── Revision 2
   |   |       └── blah_v2.tar
   │   └── Submission 2 (folder)
   │   │   └── Revision 1
   │           └── Paper.docx
   └── 2016 Jun-Dec (folder)
       └── Submission 3 (folder)
           └── Revision 1
               └── Paper2.docx

Setup Instructions
------------------

To set up the Technical Journal plugin, follow these steps.

1. Clone this repository: `git clone https://github.com/girder/tech_journal`.
2. In the git repo directory, create a Python virtual environment: `virtualenv
   venv`.
3. Activate the virtual environment: `. venv/bin/activate`.
4. Install Girder from PyPI: `pip install girder`.
5. Build the Girder web client: `girder-install web`.
6. Install and build the standalone web application: `cd girder-tech-journal-gui && yarn install && yarn run build`
7. Return to the main repo directory: `cd ..`
8. Register the plugin to Girder: `girder-install plugin -s .`. (The `-s` is
   important: it installs the plugin via symlink, since the virtual environment
   is contained within the directory that will be installed as the plugin.)
9. Start Girder: `girder-server`.
10. Navigate to the Girder plugin configuration page and activate the Tech
    Journal plugin.
11. Restart Girder on the command line by hitting Ctrl-C and then re-running
    `girder-server` (note: although ordinarily Girder would want to rebuild the
    newly activated plugin, you do not need to do that now, since we are
    building this plugin in a "standalone" mode, outside the control of Girder's
    build system).
12. (see below)
13. Navigate to http://localhost:8080/tech_journal to launch the application.

Before step 13, there are a few more steps to take before you can start using
the plugin, most of which will need to be done by the admin user. These are
described in the following sections.

Install girder_worker
++++++++++++++++++++++++++

The submission upload page has the capability to submit a GitHub URL and
have the Tech Journal download the ``master`` branch of the repository
to be made available as the download of the submission.  To do this,
it utilizes the girder_worker_ tool.  This requires some additional setup
and installation:

Aquire girder-worker
____________________

The girder-worker code can be installed via the Python PIP package system

.. parsed-literal::

  sudo pip install girder_worker


Install RabbitMQ
________________

Download and install RabbitMQ_

Install Tech Journal Tasks
__________________________

The package found in the ``tech_journal_tasks`` directory will also need
to be installed into the environment prior to starting the girder_worker
program.

This is accomplished by entering the ``tech_journal_tasks`` directory
and executing the setup.py file with the ``install`` directive.  This should
likely be run as sudo

.. parsed-literal::

  girder/plugins/tech_journal$ cd tech_journal_tasks
  tech_journal/tech_journal_tasks$ sudo python setup.py install

Start girder_worker
___________________

Executing the ``girder_worker`` program will start the task listener. If
one has accepted the default installation for RabbitMQ, there will be no
changes necessary to the girder_worker configuration to allow it to connect
to RabbitMQ.  Start girder_worker with the following command:

.. parsed-literal::

  girder-worker -l info

When viewing the first set of output, ensure that the ``ProcessGitHub``
task is listed as one of the registered tasks under the ``[tasks]`` header:

.. parsed-literal::

  snyder@midas-vm:~$ girder-worker -l info
   -------------- celery@midas-vm v4.1.0 (latentcall)
  ---- **** -----
  --- * ***  * -- Linux-4.4.0-121-generic-x86_64-with-Ubuntu-16.04-xenial 2018-05-03 10:57:26
  -- * - **** ---
  - ** ---------- [config]
  - ** ---------- .> app:         girder_worker:0x7ff88d82a610
  - ** ---------- .> transport:   amqp://guest:**@localhost:5672//
  - ** ---------- .> results:     amqp://
  - *** --- * --- .> concurrency: 4 (prefork)
  -- ******* ---- .> task events: OFF (enable -E to monitor tasks in this worker)
  --- ***** -----
   -------------- [queues]
                  .> celery           exchange=celery(direct) key=celery


  [tasks]
    . girder_worker.docker.tasks.docker_run
    . girder_worker.run
    **. tech_journal_tasks.tasks.processGithub**




Generate Folder Structure
++++++++++++++++++++++++++

First, generate a "Collection" to represent the total information of the OTJ.
This can be accomplished by clicking on ``Collections`` in the left menu after
siging into the Girder instance and then clicking on the ``Create Collection``
button. Enter a name and a description, then click ``Create``.

This creation of the collection can also be done by utilizing the
``plugins/admin/journal`` page of the OTJ.

**Note**  The description of the collection must contain the string
``__journal__`` to be picked up by certain OTJ pages.

The "Unique ID" of this folder, which can be found by clicking on the blue
button with  an ``i`` on it, will be used later to configure the Tech Journal
plugin.


Then, generate a folder within that collection to be the first "Issue" that will
be submitted to. This is accomplished by clicking on the ``Collection Actions``
menu and selecting ``Create folder here``.  The ``Collection Actions`` button
can be found to the right of the blue button from above. Enter a name and
description for the first folder and then click "Create" again.

See the above diagram for a simplified representation of what the folder
structure should look like.

Enable the Technical Journal plugin
+++++++++++++++++++++++++++++++++++

To enable the plugin, sign in as an administrator and head to the
``Admin Console``.  From there, click on the ``Plugins`` link.

A list of the current plugins will be shown, scroll down to the
``Technical Journal Plugin`` and enable it by switching the ``OFF`` slider
to the on position.   Scroll to the top and click on the ``Restart Server``
button to rebuild the instance and enable the ``tech_journal`` module

Configure the plugin
++++++++++++++++++++

Once the server has restarted, scroll back to the ``Technical Journal plugin``
entry and click on the ``Configure Plugin`` icon, which looks like a small gear

This will show the 5 fields that are used to configure a Midas instance of
the Technical Journal.  Only the ``Default Journal`` entry will need to be
filled out at this point.  Enter the ``Unique ID`` of the collection that was
generated above and click ``Save Configuration``.

Once that has been saved, the plugin should be configured and ready to be used.
Visit the entry point of the plugin by visiting::

   http://<webroot>/tech_journal

Or something like this for a localhost instance::

  http://localhost:8080/tech_journal

**WARNING**

Some of the links, ``Journal`` and ``Help``, in the menu bar do not point to
valid locations within the plugin yet.  The ``Home`` and ``New Submission``
links will take you to the correct pages.


.. |build-status| image:: https://circleci.com/gh/girder/tech_journal.png?style=shield
    :target: https://circleci.com/gh/girder/tech_journal
    :alt: Build Status

.. |license-badge| image:: https://img.shields.io/github/license/girder/tech_journal.svg
    :target: https://raw.githubusercontent.com/girder/tech_journal/master/LICENSE
    :alt: License

.. _`Read The Docs`: http://girder.readthedocs.io/en/latest/installation.html
.. _Girder_Worker: https://github.com/girder/girder_worker
.. _RabbitMQ: https://www.rabbitmq.com/download.html
