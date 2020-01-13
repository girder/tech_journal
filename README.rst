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

Follow the Girder `Installation Quickstart`_ documentation to ensure that all
necessary programs are available for the pip-installed version of Girder. Stop
before the Girder section and do *NOT* install Girder yet. It is recommended,
and this document will assume, that a Python virtual environment has been
created.

Set up Technical Journal plugin
+++++++++++++++++++++++++++++++


First, remember to activate the virtual environment for Girder with:

.. code:: bash

  source girder_env/bin/activate

Depending on the desired usage, the plugin should be set up in different
ways:

Install from PyPI via PIP
__________________________


The plugin can either be installed using the PIP tool, which
will provide pre-built and non-editable versions of the Tech Journal pages.

.. code:: bash

  pip install girder-tech-journal

Local Development Environment
_____________________________

For production instances with modifications or development environments, we
recommend that the Tech Journal be installed in "editable", ``-e``,  mode:

.. code:: bash

  git clone https://github.com/girder/tech_journal
  cd tech_journal
  pip install -e .

Build Tech Journal pages
************************

To build the Tech Journal pages, first install the ``yarn`` program

.. code:: bash

  npm install -g yarn

Install web packages:

.. code:: bash

  cd tech_journal/girder-tech-journal-gui
  yarn install

Serve Tech Journal pages
************************
To build the standalone web application for production:

If you've cloned the repo and are developing for the plugin, there is a custom
command in ``setup.py`` that will automate installing yarn packages, building
the frontend for production, and copying the dist folder to the proper location.
To use this, run:

.. code:: bash

  python setup.py build_ui


To run the development server, which will compile and  reload the web pages as
changes are detected within the repository, use the command:

.. code:: bash

  yarn run serve

This "serve" command will use port ``8081`` by default.

**WARNING**

If you run ``girder serve`` in development mode, the standalone frontend **will not** be served at ``/tech_journal``.
This is because it is expected that the frontend will be served on its own (E.g. ``yarn run serve``) in order
to see the changes being made. If for some reason you need to serve the frontend at ``/tech_journal``, you will need
to run ``girder serve`` in production mode. However be aware that in this case it is serving the pre-built files,
and thus no changes will take affect until you rebuild the frontend (E.g. by running ``python setup.py build_ui``).


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



Start girder_worker
___________________

Executing the ``girder_worker`` program will start the task listener. If
one has accepted the default installation for RabbitMQ, there will be no
changes necessary to the girder_worker configuration to allow it to connect
to RabbitMQ. Open a new terminal and activate the virtual environment.
Then start girder_worker with the following command:

.. code:: bash

  girder-worker -l info

When viewing the first set of output, ensure that the ``processGitHub`` and
``surveySubmission`` tasks are listed under the ``[tasks]`` header:

.. parsed-literal::

  snyder@midas-vm:~$ girder-worker -l info
  <....>

  [tasks]
    . girder_worker.docker.tasks.docker_run
    . girder_worker.run
    . **tech_journal_tasks.tasks.processGithub**
    . **tech_journal_tasks.tasks.surveySubmission**

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
you should see a link appear in the navigation bar on the right that
says ``Admin Console``, indicating that the user is an administrator.

Generate Folder Structure
_________________________

First, generate a "Collection" to represent the total information of the OTJ.
This can be accomplished by clicking on ``Collections`` in the left menu and
then clicking on the ``Create Collection`` button. Enter a name and a
description, then click ``Create``.

**Note**  The description of the collection must contain the string
``__journal__`` to be picked up by certain OTJ pages.

The "Unique ID" of this folder, which can be found by clicking on the blue
button with  an ``i`` on it, will be used later to configure the Tech Journal
plugin.


Configure the Technical Journal plugin
______________________________________

To set some local information for the the plugin, head to the ``Admin Console``
and click on the ``Plugins`` link and look for the ``Tech Journal`` option.

Click on the ``Configure Plugin`` icon, which looks like a small gear, for the
``Tech Journal`` selection.

This will show the fields that are used to configure an instance of
the Technical Journal. Only two entries have an effect on the current code.

Default Journal
***************

Enter the ``Unique ID`` of the collection that was generated above.

Use Review Infrastructure
*************************

Check the box of this option to allow users to submit reviews on each
submission within the Tech Journal.  Question Lists can be created from the
``Review Questions`` options in the ``Admin`` menu of the Tech Journal pages.

Save
****

Finally, click ``Save Configuration`` to apply the settings.

View Pages
__________
Once that has been saved, the plugin should be configured and ready to be used.
Visit the entry point of the plugin by visiting::

   http://<webroot>/tech_journal

Or something like this for a localhost instance::

  http://localhost:8080/tech_journal

For an instance which used the ``yarn run serve`` command, the pages should
be found at::

  http://localhost:8081/tech_journal


Releasing
_________

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

.. _`Installation Quickstart`: https://girder.readthedocs.io/en/stable/installation-quickstart.html
.. _`Installation`: https://girder.readthedocs.io/en/stable/installation.html
.. _Girder_Worker: https://github.com/girder/girder_worker
.. _RabbitMQ: https://www.rabbitmq.com/download.html
