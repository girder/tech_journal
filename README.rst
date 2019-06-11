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

Install pre-requisite programs
++++++++++++++++++++++++++++++

Follow the Girder `System Prerequisites`_ documentation to ensure that all
necessary programs are available for the pip-installed version of Girder.

**Note:** The Technical Journal plugin requires Node.js 8+. When following the
documentation to enable the Node.js APT repository, use:

.. code:: bash

  curl -sL https://deb.nodesource.com/setup_8.x | sudo -E bash -

**Note:** The Technical Journal plugin requires that MongoDB is at least 3.4+. When following the
documentation to install MongoDB, replace '3.2' with '3.4'

.. code:: bash

  echo "deb http://repo.mongodb.org/apt/debian jessie/mongodb-org/3.4 main" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list

or

.. code:: bash

  echo "deb http://repo.mongodb.org/apt/ubuntu xenial/mongodb-org/3.4 multiverse" \
    | sudo tee /etc/apt/sources.list.d/mongodb-org-3.4.list


Set up Technical Journal plugin
+++++++++++++++++++++++++++++++
The plugin can either be installed directly from pip:

.. code:: bash

  pip install girder-tech-journal

Or by cloning this repository

.. code:: bash

  git clone https://github.com/girder/tech_journal
  cd tech_journal
  pip install .

In the git repo directory, follow the Installation_ documentation to create a
virtual environment and install Girder from pypi. Do not install the web client
libraries yet. The following instructions assume you have entered the virtual
environment.

Install yarn

.. code:: bash

  npm install -g yarn

Install web packages:

.. code:: bash

  cd girder-tech-journal-gui
  yarn install

To run the development server:

.. code:: bash

  yarn run serve

To build the standalone web application for production:

.. code:: bash

  yarn run build


Install girder_worker
++++++++++++++++++++++

The submission upload page has the capability to submit a GitHub URL and
have the Tech Journal download the ``master`` branch of the repository
to be made available as the download of the submission.  To do this,
it utilizes the girder_worker_ tool. This is automatically installed when
installing the Tech Journal plugin.


Install RabbitMQ
________________

Follow RabbitMQ_ documentation to install.

After installation, ensure that the service is running

.. parsed-literal::
  service --status-all | grep rabbitmq
    [ + ]  rabbitmq-server


Install Tech Journal Tasks
__________________________

The package found in the ``tech_journal_tasks`` directory will also need
to be installed into the environment prior to starting the ``girder_worker``
program.

This is accomplished by entering the ``tech_journal_tasks`` directory
and executing the setup.py file with the ``install`` directive.

.. code:: bash

  cd tech_journal_tasks
  pip install .

Start girder_worker
___________________

Executing the ``girder_worker`` program will start the task listener. If
one has accepted the default installation for RabbitMQ, there will be no
changes necessary to the girder_worker configuration to allow it to connect
to RabbitMQ.  Start girder_worker with the following command:

.. code:: bash

  girder-worker -l info

When viewing the first set of output, ensure that the ``processGitHub`` and
``surveySubmission`` tasks are listed under the ``[tasks]`` header:

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
    **. tech_journal_tasks.tasks.surveySubmission**

Configure the plugin
++++++++++++++++++++

Open a new terminal and activate the virtual environment.

.. code:: bash

  cd tech_journal
  . ~/girder_env/bin/activate

Build the Girder web client and start the server:

.. code:: bash

  girder build
  girder serve

**Note:** although ordinarily Girder would want to rebuild the newly activated
plugin, you do not need to do that now, since we are building this plugin in a
"standalone" mode, outside the control of Girder's build system

Create Admin User
__________________

Open http://localhost:8080/ in your web browser, and you should see the
Girder welcome page.

The first user to be created in the system is automatically given admin
permission over the instance, so the first thing you should do after starting
your instance for the first time is to register a user. After that succeeds,
you should see a link appear in the navigation bar that says Admin console.

Generate Folder Structure
_________________________

First, generate a "Collection" to represent the total information of the OTJ.
This can be accomplished by clicking on ``Collections`` in the left menu and
then clicking on the ``Create Collection`` button. Enter a name and a
description, then click ``Create``.

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


Enable the Technical Journal plugin
___________________________________


To enable the plugin, head to the ``Admin Console`` and click on the
``Plugins`` link.

A list of the current plugins will be shown, scroll down to the
``Technical Journal Plugin`` and enable it by switching the ``OFF`` slider
to the on position.

Click on the ``Configure Plugin`` icon, which looks like a small gear.

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


Releasing
_________________________

To update the PyPI release:

First increment the version is setup.py. Then run:

.. code:: bash

  cd girder-tech-journal-gui;
  yarn run build;
  cd ..;
  python setup.py sdist;
  tox -e release


.. |build-status| image:: https://circleci.com/gh/girder/tech_journal.png?style=shield
    :target: https://circleci.com/gh/girder/tech_journal
    :alt: Build Status

.. |license-badge| image:: https://img.shields.io/github/license/girder/tech_journal.svg
    :target: https://raw.githubusercontent.com/girder/tech_journal/master/LICENSE
    :alt: License

.. _`System Prerequisites`: https://girder.readthedocs.io/en/stable/prerequisites.html
.. _`Installation`: https://girder.readthedocs.io/en/stable/installation.html
.. _Girder_Worker: https://github.com/girder/girder_worker
.. _RabbitMQ: https://www.rabbitmq.com/download.html
