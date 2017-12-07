Tech Journal Plugin |build-status| |license-badge|
==================================================

Assumes an certain folder structure so far for the main page display:
The top level collection ID value is what should be used in the configuration page
It will then search for the folders under each, to find all available journal "issues"

From each of those "issues", it will query for a "submission" which is an available folder 
in the "issue".  Eventually, this folder will have metadata for the rest of the information
that needs to be shown.  A sample structure is found in a graphic diagram before, with the Girder
type in parenthesis:

.. parsed-literal::

   OTJ (Collection) --------> 2016 Jan-Jun (folder) -----> Submission 1 (folder)  --> blah.tar
              \                                     \------ Submission 2 (folder) --> Paper.docx
               \
                \   --------> 2016 Jun-Dec (folder) -----> Submission 3 (folder)  --> Paper2.docx


Setup Instructions
------------------

To set up the instance of the Technical Journal plugin, install Girder
following the instructions found on the `Read The Docs`_ documentation.

Once that has been installed and the administrator user has been created,
clone the ``tech_journal`` into the ``plugins`` directory of the
Girder instance.

.. parsed-literal::
  snyder@midas-vm:~/girder$ cd plugins/
  snyder@midas-vm:~/girder/plugins$ git clone git://github.com/girder/tech_journal.git

From there, there are a few more steps to take before you can start using the
plugin, most of which will need to be done by the admin user.

Generate Folder Structure
++++++++++++++++++++++++++

First, generate a "Collection" to represent the total information of the OTJ.
This can be accomplished by clicking on ``Collections`` in the left menu after
siging into the Girder instance and then clicking on the ``Create Collection``
button. Enter a name and a description, then click ``Create``.

This creation of the collection can also be done by utilizing the
``plugins/admin/journal`` page of the OTJ.

**Note**  The description of the collection must contain the string
 `` __journal__ `` to be picked up by certain OTJ pages.

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
Visit the entry point of the plugin by visiting:::

   http://<webroot>/#plugins/journal/journal

Or something like this for a localhost instance:::

  http://localhost:8080/#plugins/journal/journal

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
