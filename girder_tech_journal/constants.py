from string import Template


# Constants for default issue licensing
class TechJournalLicenseDefault:
    licenseDict = {
        'publisherLicense': '''
You are licensing your work to Kitware Inc. under the
Creative Commons Attribution License Version 3.0.

Kitware Inc. agrees to the following:

Kitware is free
    * to copy, distribute, display, and perform the work
    * to make derivative works
    * to make commercial use of the work

Under the following conditions:
"by Attribution" - Kitware must attribute the work in the manner
specified by the author or licensor.

    * For any reuse or distribution, they must make clear to others the license terms of this work.
    * Any of these conditions can be waived if they get permission from the copyright holder.

Your fair use and other rights are in no way affected by the above.

This is a human-readable summary of the Legal Code (the full license) available at
http://creativecommons.org/licenses/by/3.0/legalcode''',

        'readerLicenses': {
            'Attribution Creative Commons': '''
This work is licensed under the Creative Commons 3.0 Unported License.

You are free:
  * to Share - to copy, distribute and transmit the work
  * to Remix - to adapt the work

Under the following conditions:
  * Attribution. You must attribute the work in the manner specified by the author or licensor
   (but not in any way that suggests that they endorse you or your use of the work).

To view a copy of this license, visit http://creativecommons.org/licenses/by-a/3.0/
or send a letter to
Creative Commons, 171 Second Street, Suite 300, San Francisco, California, 94105, USA.''',
            'Attribution-NoDerivs Creative Commons': '''
This work is licensed under the
Creative Commons Attribution-No Derivative Works 3.0 Unported License.

You are free:
  * to Share - to copy, distribute and transmit the work

Under the following conditions:
  * Attribution. You must attribute the work in the manner specified by the author or licensor
   (but not in any way that suggests that they endorse you or your use of the work).
  * No Derivative Works. You may not alter, transform, or build upon this work.

To view a copy of this license, visit http://creativecommons.org/licenses/by-nd/3.0/
or send a letter to
Creative Commons, 171 Second Street, Suite 300, San Francisco, California, 94105, USA.
''',
            'All rights reserved': '''
This work is copyrighted by is owner and cannot be shared, distributed
 or modified without prior consent of the author. ''',
            'Attribution-NonCommercial-NoDerivs Creative Commons': '''
This work is licensed under the
Creative Commons Attribution-Noncommercial-No Derivative Works 3.0 Unported License.

You are free:
  * to Share - to copy, distribute and transmit the work

Under the following conditions:
  * Attribution. You must attribute the work in the manner specified by the author or licensor
   (but not in any way that suggests that they endorse you or your use of the work).
  * Noncommercial. You may not use this work for commercial purposes.
  * No Derivative Works. You may not alter, transform, or build upon this work.

To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-nd/3.0/
or send a letter to
Creative Commons, 171 Second Street, Suite 300, San Francisco, California, 94105, USA.''',
            'Attribution-NonCommercial': '''
This work is licensed under the Creative Commons Attribution-Noncommercial 3.0 Unported License.

You are free:
  * to Share - to copy, distribute and transmit the work
  * to Remix - to adapt the work

Under the following conditions:
  * Attribution. You must attribute the work in the manner specified by the author or licensor
   (but not in any way that suggests that they endorse you or your use of the work).
  * Noncommercial. You may not use this work for commercial purposes.

To view a copy of this license, visit http://creativecommons.org/licenses/by-nc/3.0/
or send a letter to
Creative Commons, 171 Second Street, Suite 300, San Francisco, California, 94105, USA.''',
            'Attribution-NonCommercial-ShareAlike Creative Commons': '''
This work is licensed under the
 Creative Commons Attribution-Noncommercial-Share Alike 3.0 Unported License.

You are free:
  * to Share - to copy, distribute and transmit the work
  * to Remix - to adapt the work

Under the following conditions:
  * Attribution. You must attribute the work in the manner specified by the author or licensor
   (but not in any way that suggests that they endorse you or your use of the work).
  * Noncommercial. You may not use this work for commercial purposes.
  * Share Alike. If you alter, transform, or build upon this work,
    you may distribute the resulting work only under the same or similar license to this one.

To view a copy of this license, visit http://creativecommons.org/licenses/by-nc-sa/3.0/
or send a letter to
Creative Commons, 171 Second Street, Suite 300, San Francisco, California, 94105, USA.
''',
            'Attribution-ShareAlike Creative Commons': '''
This work is licensed under the
Creative Commons Attribution-Share Alike 3.0 Unported License.

You are free:
  * to Share - to copy, distribute and transmit the work
  * to Remix - to adapt the work

Under the following conditions:
  * Attribution. You must attribute the work in the manner specified by the author or licensor
   (but not in any way that suggests that they endorse you or your use of the work).
  * Share Alike. If you alter, transform, or build upon this work,
    you may distribute the resulting work only under the same, similar or a compatible license.

To view a copy of this license, visit http://creativecommons.org/licenses/by-sa/3.0/
or send a letter to
 Creative Commons, 171 Second Street, Suite 300, San Francisco, California, 94105, USA.'''
        }
    }


class TechJournalCitations:
    templates = {
        'bibtex': Template('''\
@comment{This file has been generated by the Midas Journal}

@{Open Source Coordination Office0
  Author	= "$authors",
  Title		= "$name",
  Year		= ${date_year},
  Month		= ${date_mon},
  Abstract	= "$description",
  Institution	= "$institution",
}'''),
        'xml': Template('''\
<Publications>
  <Publication>
    <AuthorList>
      <Author>
        $authors
      </Author>
    </AuthorList>
    <Title>$name</Title>
    <Abstract>
      <AbstractText>
        $description
      </AbstractText>
    </Abstract>
    <Institution>$institution</Institution>
    <Year>${date_year}</Year>
    <Month>${date_mon}</Month>
  </Publication>
</Publications>''')
    }
