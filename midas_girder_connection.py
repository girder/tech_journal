from pymongo import MongoClient
import pymongo
import argparse
import mimetypes
import hashlib
from datetime import datetime
from bson.objectid import ObjectId
import subprocess
import shutil
import MySQLdb
import sys
import os
from server import constants

licenseDict = {
 "0": "Not Defined",
 "1": "Apache 2.0",
 "2": "Public Domain",
 "3": "Other",
 "4": "GPL",
 "5": "LGPL",
 "6": "BSD",
 "": "Public Domain"
}
typeDict = {
  "0": "GENERAL",
  "1": "PUBLICATION",
  "2": "TUTORIAL",
  "3": "SOFTWARE",
  "4": "PLUGIN",
  "5": "DATASET",
  "": "GENERAL"
}

filetypeDict = {
  "1": "THUMBNAIL",
  "2": "SOURCECODE",
  "8": "TESTING_SOURCECODE",
  "3": "PAPER",
  "4": "DATA",
  "5": "MISC",
  "6": "GITHUB",
  "7": "TECHNICAL",
  "": "MISC"
}

discDictionary = {'': {'name': ''}}

def metaDataQuery(cur, entryNo, fieldNo):
    cur.execute("SELECT * FROM metadatavalue WHERE itemrevision_id="+ str(entryNo)+" and metadata_id=" + str(fieldNo))
    returnVal =  cur.fetchone()
    if returnVal and returnVal[2]:
        if fieldNo == "34":
            return licenseDict[returnVal[2].strip()]
        if fieldNo == "41":
            return typeDict[returnVal[2].strip()]
        if fieldNo == "18":
            retArray = []
            # 18 is the list of categories, which has mixed data for languages and VistA packages
            # split the value and capture each value in the string
            #  < 10 indicates a license string, > 10 a package name
            catVals = returnVal[2].split(" ")
            for entry in catVals:
                cur.execute("select * from journal_category where category_id=" + str(entry))
                res = cur.fetchone()
                if res:
                    retArray.append(res[2])
            return retArray
        if fieldNo == "20" and int(returnVal[2]) > 0:
          return discDictionary[int(returnVal[2])]['key']
        return returnVal[2]
    if fieldNo == "34":
        return licenseDict['']
    if fieldNo == "41":
        return typeDict['']

    return ""

def ReadAll( prevAssetDir, baseParent=None, assetStore=None,):
    # Query items from MySQL
    db = MySQLdb.connect(user="root", passwd="root",db="otj")
    cur = db.cursor()

    issueDictionary = {}
    userDictionary = {}
    # Prep Mongo client for insertion
    client = MongoClient('localhost', 27017)
    foldersDB = client.girder.folder
    assetStoreDB = client.girder.assetstore
    usersDB = client.girder.user
    itemDB = client.girder.item
    fileDB = client.girder.file
    groupDB = client.girder.group
    collectionDB = client.girder.collection
    journalCollectionDB = client.girder.journal_collection;
    # =============================================
    # Import and create all category lists
    # =============================================
    # +-------------+--------------+
    # | Field       | Type         |
    # +-------------+--------------+
    # | category_id | bigint(20)   |
    # | parent_id   | bigint(20)   |
    # | name        | varchar(255) |
    # +-------------+--------------+
    cur.execute("SELECT * FROM journal_category")
    allcats = cur.fetchall()
    catValueDict = {}  # Dictionary of name -> values
    catNumDict = {}    # Dictionary of num -> name
    for catObj in allcats:
      if catObj[1] == -1:  # Those marked with -1 are category topics
        catValueDict[catObj[2]] = []
        catNumDict[catObj[0]] = catObj[2]
      else:
        # use both dicts to append the value to the correct entry
        catValueDict[ catNumDict[ catObj[1] ] ].append(catObj[2])
    for val in catValueDict:
      inCatObj = { "_id" : ObjectId(),
                    "tag" : "categories",
                    "value" : catValueDict[val],
                    "key" : val }
      journalCollectionDB.insert_one(inCatObj)
    cur.execute("SELECT * FROM user")
    allusers = cur.fetchall()
    if not assetStoreDB.count({"root":assetStore}):
      inputAssetStore = {"_id" : ObjectId(),
                         "name" : "generatedAssetStore",
                         "created" : datetime.now(),
                         "perms" : 384,
                         "type" : 0,
                         "current" : True,
                         "root" : assetStore}
      assetStoreDB.insert_one(inputAssetStore)
    else:
      inputAssetStoreQuery = assetStoreDB.find({"root":assetStore})
      inputAssetStore = inputAssetStoreQuery.next()
    if not baseParent:
      inputCollection = {"creatorId" : ObjectId("579f725a82290968da666b16"),
                     "public":True,
                     "created" : datetime.now(),
                     "access" : { "users" : [ { "flags" : [ ], "id" : ObjectId("579f725a82290968da666b16"), "level" : 2 } ], "groups" : [ ] }, "creatorId" : ObjectId("579f725a82290968da666b16"),
                     "size" : 0,
                     "name": "Migrated OTJ",
                     "_id": ObjectId(),
                     "description": " __journal__ Migrated data from a MYSQL DB"
                    }
      result = collectionDB.insert_one(inputCollection)
      baseParent = inputCollection["_id"]
    # ====================================================
    #Import users to allow authorship to be maintained when inserted later
    #+---------------------------------------+
    #| Field                                 |
    #+---------------------------------------+
    #| user_id                               |
    #| firstname                             |
    #| company                               |
    #| thumbnail                             |
    #| lastname                              |
    #| email                                 |
    #| privacy                               |
    #| admin                                 |
    #| folder_id                             |
    #| creation                              |
    #| view                                  |
    #| uuid                                  |
    #| city                                  |
    #| country                               |
    #| website                               |
    #| biography                             |
    #| dynamichelp                           |
    #| hash_alg                              |
    #| salt                                  |
    #| journalmodule_notification_submission |
    #| journalmodule_notification_review     |
    #| journalmodule_notification_comments   |
    #+---------------------------------------+

    # ====================================================
    for user in allusers:
      inputUser = { "_id":ObjectId(),
                    "status":"disabled",
                    "firstName":user[1],
                    "created":user[9],
                    "admin":user[7],
                    "lastName":user[4],
                    "public":True,
                    "emailVerified":False,
                    "login":"%s.%s" % (user[1],user[4]) ,
                    "email":user[5],
                    "notificationStatus": {
                        'NewSubmissionEmail': user[19],
                        'NewReviewsEmail': user[20],
                        'NewCommentEmail': user[21],
                    }
                  }
      usersDB.insert_one(inputUser)
      userDictionary[user[0]] = inputUser
    # ====================================================
    # Bring over all in journal_folder to capture all existing
    # issues
    # +-------------------+
    # | Field             |
    # +-------------------+
    # | not_used_id       |
    # | folder_id         |
    # | paperdue_date     |
    # | decision_date     |
    # | publication_date  |
    # | logo              |
    # | defaultpolicy     |
    # | short_description |
    # | related_link      |
    # | introductory_text |
    # | authorLicense     |
    # | readerLicense     |
    # +-------------------+
    # ====================================================

    # =====================================================
    # Import the existing disclaimers and ensure that they
    # can be found with by the submissions later
    # +---------------+------------+
    # | Field         | Type       |
    # +---------------+------------+
    # | disclaimer_id | bigint(20) |
    # | name          | text       |
    # | description   | text       |
    # +---------------+------------+
    #=====================================================

    cur.execute("SELECT * FROM journal_disclaimer")
    allDisc = cur.fetchall()
    for disc in allDisc:
      inputDisc = { "_id":ObjectId(),
                    "tag":"disclaimer",
                    "key":disc[1],
                    "value":disc[2]
                  }
      journalCollectionDB.insert_one(inputDisc)
      discDictionary[disc[0]] = inputDisc
    # End Disclaimers
    cur.execute("SELECT * from journal_folder")
    allIssues = cur.fetchall()
    for row in allIssues:
      inputObject = {"creatorId" : ObjectId("579f725a82290968da666b16"),
                     "baseParentType" : "collection",
                     "baseParentId" : ObjectId(baseParent),
                     "parentCollection":"collection",
                     "parentId":ObjectId(baseParent),
                     "public":True,
                     "created" : datetime.now(),
                     "access" : { "users" : [ { "flags" : [ ], "id" : ObjectId("579f725a82290968da666b16"), "level" : 2 } ], "groups" : [ ] }, "creatorId" : ObjectId("579f725a82290968da666b16"),
                     "size" : 0,
                     "meta" : {}
                    }

      # Capture folder_id and look up the correct name in the folder table
      folder_id  = row[1]
      cur.execute("SELECT * from folder WHERE folder_id=" + str(folder_id))
      foundFolder = cur.fetchall()
      inputObject["name"] = foundFolder[0][4]
      inputObject["_id"] = ObjectId()
      inputObject["description"] = row[7]
      inputObject["meta"]["paperDue"] = str(row[2])
      inputObject["meta"]["authorLicense"] = str(row[10])
      inputObject["meta"]["publisherLicense"] = str(row[11])
      inputObject["meta"]["__issue__"] = True
      result = foldersDB.insert_one(inputObject)

      # Create groups for each issue
      for val in ["editors", "members"]:
        inputGroup = {
          "_id" : ObjectId(),
          "updated" : datetime.now(),
          "name" : "%s_%s" % (inputObject["name"],val),
          "created" : datetime.now(),
          "creatorId" : ObjectId("579f725a82290968da666b16"),
          "requests" : [ ],
          "public" : False,
          "description" : "Group %s for issue %s " % (val, inputObject["name"])
        }
        result = groupDB.insert_one(inputGroup)
      print inputObject["name"]
      issueDictionary[folder_id] = inputObject
    # ====================================================
    # Bring over all Folders and all revisions within those folders for
    # each issue above
    #
    # +---------------
    #| Field          |
    #+----------------+
    #| item_id        |
    #| name           |
    #| date_update    |
    #| description    |
    #| type           |
    #| view           |
    #| download       |
    #| sizebytes      |
    #| privacy_status |
    #| uuid           |
    #| date_creation  |
    #| thumbnail_id   |
    #
    # ====================================================
    cur.execute("SELECT * FROM item")
    allitems = cur.fetchall()
    for row in allitems:
      inputObject = {
                     "baseParentType" : "collection",
                     "baseParentId" : ObjectId(baseParent),
                     "parentCollection":"folder",
                     "public":True,
                     "curation" : {
                       "status":"APPROVED",
                       "enabled": True
                     },
                     "meta": {
                       "comments":[],
                       "related":"",
                       "targetIssue":"5a295c0782290926a05fef5c"
                     }
                    }
      cur.execute("SELECT * FROM item2folder where item_id=" + str(row[0]))
      itemConnection = cur.fetchall()

      inputObject["parentId"] = issueDictionary[itemConnection[0][1]]["_id"]
      inputObject["name"] = row[1]
      inputObject["_id"] = ObjectId()
      inputObject["description"] = row[3]
      inputObject["created"] = row[10]
      inputObject["updated"] = row[2]
      print inputObject["name"]
      result = foldersDB.insert_one(inputObject)
      # ====================================================
      # Capture each revision that matches an object from above
      #| itemrevision_id
      #| item_id
      #| revision
      #| date
      #| changes
      #| user_id
      #| uuid
      #| license_id |
      # ====================================================
      cur.execute("SELECT * FROM itemrevision WHERE item_id="+ str(row[0]))
      allrevisions = cur.fetchall()

      for revision in allrevisions:
          inputRevision =   {
            "updated" :datetime.now(),
            "baseParentId" : ObjectId(baseParent),
            "size" : 0,
            "baseParentType" : "collection",
            "access" : {
              "users" : [
                {
                  "flags" : [ ],
                  "id" : ObjectId("579f725a82290968da666b16"),
                  "level" : 2
                }
              ],
              "groups" : [ ]
            },
            "parentCollection":"folder",
            "creatorId" : ObjectId("579f725a82290968da666b16"),
            "parentId":inputObject["_id"],
            "downloadStatistics" : {
                "completed" : 0,
                "views" : row[5]
            },
            "public" : True,
            "curation" : {
              "status":"APPROVED",
              "enabled": True
            },
            "meta": {
              "CorpCLA":"yes",
              "permission":"yes",
              "type":0
            }
          }
          if revision[5] in userDictionary.keys():
            inputRevision["creatorId"] = userDictionary[revision[5]]["_id"]
            inputRevision["access"]["users"].append( {
                  "flags" : [ ],
                  "id" : userDictionary[revision[5]]["_id"],
                  "level" : 2
                })
            #inputRevision["meta"]["authors"] = [userDictionary[revision[5]]["firstName"] + " " + userDictionary[revision[5]]["lastName"]]
          else:
            inputRevision["creatorId"] = row[9]
            inputRevision["access"]["users"].append( {
                  "flags" : [ ],
                  "id" : row[9],
                  "level" : 2
                })
            #inputRevision["meta"]["authors"] = ["OTJ User"]
          '''
          Metadata connections:
          +-------------+---------------------+
          | metadata_id | qualifier           |
          +-------------+---------------------+
          |           1 | author              |
          |           2 | uploaded            |
          |           3 | issued              |
          |           4 | created             |
          |           5 | citation            |
          |           6 | uri                 |
          |           7 | pubmed              |
          |           8 | doi                 |
          |           9 | general             |
          |          10 | provenance          |
          |          11 | sponsorship         |
          |          12 | publisher           |
          |          13 | keyword             |
          |          14 | ocis                |
          |          15 | submitter           |
          |          16 | insitution          |
          |          17 | authors             |
          |          18 | categories          |
          |          19 | copyright           |
          |          20 | disclaimer          |
          |          21 | tags                |
          |          22 | related_work        |
          |          23 | grant               |
          |          24 | handle              |
          |          25 | enable              |
          |          26 | issue               |
          |          27 | community           |
          |          28 | old_id              |
          |          29 | old_revision        |
          |          30 | logo                |
          |          31 | has_old_review      |
          |          32 | certification_level |
          |          33 | approval_status     |
          |          34 | source_license      |
          |          35 | reviewPhase         |
          |          36 | github              |
          |          37 | has_code            |
          |          38 | has_reviews         |
          |          39 | attribution_policy  |
          |          40 | has_test_code       |
          |          41 | submission_type     |
          |          42 | revision_id         |
          |          43 | revision_notes      |
          +-------------+---------------------+
          '''
          inputRevision["meta"]["authors"] = metaDataQuery(cur, revision[0],"17").replace(" --- ",' ').split(" ;;; ")
          inputRevision["meta"]["institution"] = metaDataQuery(cur, revision[0],"16")
          inputRevision["meta"]["keyword"] = metaDataQuery(cur, revision[0],"13")
          inputRevision["meta"]["tags"] = metaDataQuery(cur, revision[0],"21").split(" --- ")
          inputRevision["meta"]["copyright"] = metaDataQuery(cur, revision[0],"19")
          inputRevision["meta"]["grant"] = metaDataQuery(cur, revision[0],"23")
          inputRevision["meta"]["type"] = metaDataQuery(cur, revision[0],"41")
          inputRevision["meta"]["github"] = metaDataQuery(cur, revision[0],"36")
          inputRevision["meta"]["has_code"] = metaDataQuery(cur, revision[0],"37")
          inputRevision["meta"]["has_test_code"] = metaDataQuery(cur, revision[0],"40")
          inputRevision["meta"]["source-license"] = metaDataQuery(cur, revision[0],"34")
          inputRevision["meta"]["certification_level"] = metaDataQuery(cur, revision[0],"32")
          inputRevision["meta"]["has_reviews"] = metaDataQuery(cur, revision[0],"38")
          inputRevision["meta"]["categories"] = metaDataQuery(cur, revision[0],"18")
          inputRevision["meta"]["disclaimer"] = metaDataQuery(cur, revision[0],"20")
          userVal = metaDataQuery(cur, revision[0],"15")
          if userVal in userDictionary.keys():
              inputRevision["creatorId"] = ObjectId(userDictionary[userVal]["_id"])
          elif revision[5] in userDictionary.keys():
              inputRevision["creatorId"] = ObjectId(userDictionary[revision[5]]["_id"])
          else:
              inputRevision["creatorId"] = ObjectId()
          inputRevision["name"] = "Revision " + str(revision[2])
          inputRevision["_id"] = ObjectId()
          inputRevision["description"] = revision[4]
          inputRevision["created"] = revision[3]
          if inputRevision["created"] == None:
            inputRevision["created"] = row[2]
          print inputRevision['name']
          # Capture the download and view information
          cur.execute("SELECT * FROM statistics_download WHERE item_id="+ str(revision[0]))
          allDownloads = cur.fetchall()
          inputRevision['downloadStatistics']['completed'] = len(allDownloads)

          result = foldersDB.insert_one(inputRevision)
          # ====================================================
          # Capture all objects within each revision
          # ====================================================
          #
          # +---------------
          #| Field          |
          #+----------------+
          #| bitstream_id
          #| itemrevision_id
          #| name
          #| mimetype
          #| sizebytes
          #| checksum
          #| path
          #| assetstore_id
          #| date
          #| journalmodule_type
          cur.execute("SELECT * FROM bitstream WHERE itemrevision_id="+ str(revision[0]))
          allbitstreams = cur.fetchall()
          for bitstream in allbitstreams:
              if bitstream[5]:
                assetDir = os.path.join(bitstream[5][0:2], bitstream[5][2:4],bitstream[5])
                prevAssetLoc = os.path.join(prevAssetDir,assetDir)
                if os.path.exists(prevAssetLoc):
                  newassetPath = ''
                  newChecksum = ''
                  p = subprocess.Popen("/usr/bin/sha512sum "+prevAssetLoc, stdout=subprocess.PIPE, shell=True)
                  (output, err) = p.communicate()
                  p_status = p.wait()
                  (newChecksum, oldpath)=output.split('  ')
                  newAssetDir = os.path.join(assetStore,newChecksum[0:2],newChecksum[2:4])
                  if not os.path.exists(newAssetDir):
                      os.makedirs(newAssetDir)
                  newAssetPath = os.path.join(newChecksum[0:2],newChecksum[2:4],newChecksum)
                  newAssetLoc = os.path.join(newAssetDir,newChecksum)
                  shutil.copy(prevAssetLoc,newAssetLoc)
                  filename, file_extension = os.path.splitext(bitstream[2])
                  inputBitStream = {
                                 "_id":ObjectId(),
                                     "lowerName":"",
                                     "description":"",
                                     "updated":datetime.now(),
                                     "baseParentType":"collection",
                                     "name":bitstream[2],
                                     "meta": {
                                         "type":filetypeDict(bitstream[9])
                                     },
                                     "baseParentId" : ObjectId(baseParent),
                                     "creatorId":inputRevision["creatorId"],
                                     "folderId":inputRevision["_id"],
                                     "size":bitstream[4],
                                     "created" : bitstream[8]
                  }
                  result = itemDB.insert_one(inputBitStream)
                  # Take item and generate file for each one
                  inputFile = { "_id" : ObjectId(),
                                "mimeType" : mimetypes.guess_type(bitstream[2])[0],
                                "itemId" : inputBitStream["_id"],
                                "exts" : [file_extension.replace(".","")],
                                "name" : bitstream[2],
                                "created" : bitstream[8],
                                "assetstoreId" : inputAssetStore['_id'],
                                "creatorId" : inputRevision["creatorId"],
                                "path" : newAssetPath,
                                "sha512" : newChecksum,
                                "size":bitstream[4]}
                  print inputFile['name']
                  result = fileDB.insert_one(inputFile)



if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Midas to Girder data migration script', parents=[])
    parser.add_argument('-ci','--collID', required=False, default=None)
    parser.add_argument('-ar','--assetRoot', required=False, default=None)
    parser.add_argument('-pa','--prevAsset', required=True, default=None)
    result = parser.parse_args()
    ReadAll(result.prevAsset, result.collID,result.assetRoot)
