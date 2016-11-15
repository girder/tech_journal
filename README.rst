Tech Journal Plugin
===================

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


