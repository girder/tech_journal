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
   │   │   └── blah.tar
   │   └── Submission 2 (folder)
   │       └── Paper.docx
   └── 2016 Jun-Dec (folder)
       └── Submission 3 (folder)
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
6. Install the plugin's NPM dependencies: `npm install`.
7. Build the plugin bundle: `npm run build`.
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
