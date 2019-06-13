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
import json
from girder_tech_journal import constants
from girder_tech_journal import TechJournal

licenseDict = {
 "0": "Public Domain",
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
submissionTypeDict = {
  "0": "",
  "1": "core",
  "2": "certified",
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
  "None": "MISC",
  "": "MISC"
}

reviewData = {
  "1":"Peer",
  "2":"Final",
  "3":"Completed",

}
discDictionary = {'': {'name': ''}}
questionLists = {}

TechJournal = TechJournal()
def processPeerReview(review):
        # determine what topics are "done"
        totalQs = 0
        nonAnswered = 0
        for topic in review["topics"]:
            questions = review["topics"][topic]["questions"]
            review["topics"][topic]["done"] = True;
            for question in questions:
                totalQs += 1
                if not len(questions[question]['value']):
                    nonAnswered += 1
                    review["topics"][topic]['done'] = False;
        review["done"] = ((totalQs - nonAnswered) / totalQs)  * 100
        return review
def metaDataQuery(cur, entryNo, fieldNo):
    cur.execute("SELECT * FROM metadatavalue WHERE itemrevision_id="+ str(entryNo)+" and metadata_id=" + str(fieldNo))
    returnVal =  cur.fetchone()
    if returnVal and returnVal[2]:
        if fieldNo == "34":
            return licenseDict[returnVal[2].strip()]
        if fieldNo == "41":
            return submissionTypeDict[returnVal[2].strip()]
        if fieldNo == "35":
            return reviewData[returnVal[2].strip()]
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
        return submissionTypeDict['0']
    if fieldNo == "35":
        return reviewData["1"]
    if fieldNo in ['37','38','40']:
        return False
    return ""

def ReadAll(userId, prevAssetDir, dbName, baseParent=None, assetStore=None):
    # Query items from MySQL
    db = MySQLdb.connect(user="root", passwd="root",db="otj")
    cur = db.cursor()

    issueDictionary = {}
    userDictionary = {}
    # Prep Mongo client for insertion
    client = MongoClient('localhost', 27017)
    foldersDB = client[dbName].folder
    assetStoreDB = client[dbName].assetstore
    usersDB = client[dbName].user
    itemDB = client[dbName].item
    fileDB = client[dbName].file
    groupDB = client[dbName].group
    settingDB = client[dbName].setting
    collectionDB = client[dbName].collection
    journalCollectionDB = client[dbName].journal_collection;
    journalDownloadsDB = client[dbName].journal_downloads;
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
      inputCollection = {"creatorId" : ObjectId(userId),
                     "public":True,
                     "created" : datetime.now(),
                     "access" : { "users" : [ { "flags" : [ ], "id" : ObjectId(userId), "level" : 2 } ], "groups" : [ ] }, "creatorId" : ObjectId(userId),
                     "size" : 0,
                     "name": "Migrated OTJ",
                     "_id": ObjectId(),
                     "description": " __journal__ Migrated data from a MYSQL DB"
                    }
      result = collectionDB.insert_one(inputCollection)
      baseParent = inputCollection["_id"]
    #  Create top-level folder for review uploaded files
    inputObject = {"creatorId" : ObjectId(userId),
                   "baseParentType" : "collection",
                   "baseParentId" : ObjectId(baseParent),
                   "parentCollection":"collection",
                   "parentId":ObjectId(baseParent),
                   "public":True,
                   "created" : datetime.now(),
                   "access" : { "users" : [ { "flags" : [ ], "id" : ObjectId(userId), "level" : 2 } ], "groups" : [ ] }, "creatorId" : ObjectId(userId),
                   "size" : 0,
                   "meta" : {}
                  }
    inputObject["name"] = "Review Files"
    inputObject["_id"] = ObjectId()
    inputObject["description"] = "A Folder to contain uploaded files which are added during reviews"
    result = foldersDB.insert_one(inputObject)
    reviewDataFolder = inputObject;

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
                    "admin":True if user[7] == 1 else False,
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
    # Start review transition
    # import Current review question lists
    #+-----------------+--------------+
    #| Field           | Type         |
    #+-----------------+--------------+
    #| questionlist_id | int(11)      |
    #| category_id     | int(11)      |
    #| type            | int(11)      |
    #| name            | varchar(512) |
    #| description     | text         |
    #+-----------------+--------------+
    cur.execute("SELECT * from reviewosehra_questionlist;")
    allQLists = cur.fetchall()
    for qList in allQLists:
      cur.execute("select * from journal_category where category_id=" + str(qList[1]))
      res = cur.fetchone()
      if res:
          catType = str(res[2])
      else:
          catType = "Default"
      qListFormat = {
          "done": 0,
          "questions": {
              "list": {
                  "category_id": catType,
                  "comment": "",
                  "description": qList[4],
                  "name": qList[3],
                  "type":'peer' if qList[2] == 1 else 'final'
              },
              "review_id": "",
              "revision_id": "",
              "topics": {}
          },
          "type": 'peer' if qList[2] == 1 else 'final',
          'user': ""
      }
      #+-----------------+--------------+
      #| Field           | Type         |
      #+-----------------+--------------+
      #| topic_id        | int(11)      |
      #| questionlist_id | int(11)      |
      #| position        | int(11)      |
      #| name            | varchar(512) |
      #| description     | text         |
      #+-----------------+--------------+
      cur.execute("SELECT * from reviewosehra_topic where questionlist_id=%s;" % qList[0])
      qTopics = cur.fetchall()
      for qTopic in qTopics:
        qListFormat["questions"]["topics"][str(qTopic[2])] = {
            "done": False,
            "attachfile":"",
            "comment":"",
            "description":qTopic[4],
            "name":qTopic[3],
            "questions":{}
        }
        #+-------------+------------+
        #| Field       | Type       |
        #+-------------+------------+
        #| question_id | int(11)    |
        #| topic_id    | int(11)    |
        #| position    | int(11)    |
        #| description | text       |
        #| comment     | tinyint(4) |
        #| attachfile  | tinyint(4) |
        #+-------------+------------+
        cur.execute("SELECT * from reviewosehra_question where topic_id=%s" % qTopic[0])
        allQuestions = cur.fetchall()
        for question in allQuestions:
         qListFormat["questions"]["topics"][str(qTopic[2])]['questions'][str(question[0])] = {
            "description": question[3],
            'comment':question[4],
            'commentValue':'',
            'attachfile':question[5],
            'attachfileValue':'',
            'value': [],
        }
      qListDict = {"key": qList[3], "tag": "questionList", 'value':qListFormat}
      questionLists[qListDict['key']] = qListDict
      journalCollectionDB.insert_one(qListDict)
    cur.execute("SELECT * from journal_folder")
    allIssues = cur.fetchall()
    submissionNumber = 0
    for row in allIssues:
      inputObject = {"creatorId" : ObjectId(userId),
                     "baseParentType" : "collection",
                     "baseParentId" : ObjectId(baseParent),
                     "parentCollection":"collection",
                     "parentId":ObjectId(baseParent),
                     "public":True,
                     "created" : datetime.now(),
                     "access" : { "users" : [ { "flags" : [ ], "id" : ObjectId(userId), "level" : 2 } ], "groups" : [ ] }, "creatorId" : ObjectId(userId),
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

      #  Create top-level folder for review uploaded files
      reviewFolderObject = {"creatorId" : ObjectId(userId),
                     "baseParentType" : "collection",
                     "baseParentId" : ObjectId(baseParent),
                     "parentCollection":"folder",
                     "parentId":inputObject["_id"],
                     "public":True,
                     "created" : datetime.now(),
                     "access" : { "users" : [ { "flags" : [ ], "id" : ObjectId(userId), "level" : 2 } ], "groups" : [ ] }, "creatorId" : ObjectId(userId),
                     "size" : 0,
                     "meta" : {}
                    }
      reviewFolderObject["name"] = "Review Files"
      reviewFolderObject["_id"] = ObjectId()
      reviewFolderObject["description"] = "A Folder to contain uploaded files which are added during reviews"
      inputObject["meta"]["reviewUploadDir"] = reviewFolderObject["_id"]
      result = foldersDB.insert_one(inputObject)
      result = foldersDB.insert_one(reviewFolderObject)
      reviewDataFolder = reviewFolderObject;
      # Create groups for each issue
      for val in ["editors", "members"]:
        inputGroup = {
          "_id" : ObjectId(),
          "updated" : datetime.now(),
          "name" : "%s_%s" % (inputObject["name"],val),
          "created" : datetime.now(),
          "creatorId" : ObjectId(userId),
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
                       "targetIssue":"5a295c0782290926a05fef5c",
                       "submissionNumber":str(submissionNumber)
                     }
                    }
      cur.execute("SELECT * FROM item2folder where item_id=" + str(row[0]))
      itemConnection = cur.fetchall()
      if itemConnection[0][1] in issueDictionary:
        inputObject["parentId"] = issueDictionary[itemConnection[0][1]]["_id"]
        inputObject["name"] = row[1]
        inputObject["_id"] = ObjectId()
        inputObject["description"] = row[3]
        inputObject["created"] = row[10]
        inputObject["updated"] = row[2]
        print inputObject["name"]
        result = foldersDB.insert_one(inputObject)
      else:
        inputObject["_id"] = reviewDataFolder["_id"]
      submissionNumber += 1
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
      revisionNumber = 0
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
                  "id" : ObjectId(userId),
                  "level" : 2
                }
              ],
              "groups" : [ ]
            },
            "parentCollection":"folder",
            "creatorId" : ObjectId(userId),
            "parentId":inputObject["_id"],
            "downloadStatistics" : {
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
              "type":0,
              "revisionNumber":str(revisionNumber)
            }
          }
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
          inputRevision["meta"]["type"] = typeDict[str(row[4])]
          inputRevision["meta"]["osehra_core"] = metaDataQuery(cur, revision[0],"41")
          inputRevision["meta"]["github"] = metaDataQuery(cur, revision[0],"36")
          inputRevision["meta"]["has_code"] = metaDataQuery(cur, revision[0],"37")
          inputRevision["meta"]["has_test_code"] = metaDataQuery(cur, revision[0],"40")
          inputRevision["meta"]["source-license"] = metaDataQuery(cur, revision[0],"34")
          inputRevision["meta"]["certification_level"] = metaDataQuery(cur, revision[0],"32")
          inputRevision["meta"]["has_reviews"] = metaDataQuery(cur, revision[0],"38")
          inputRevision["meta"]["categories"] = metaDataQuery(cur, revision[0],"18")
          inputRevision["meta"]["disclaimer"] = metaDataQuery(cur, revision[0],"20")
          inputRevision["meta"]["revisionPhase"] = metaDataQuery(cur, revision[0],"35")
          userVal = metaDataQuery(cur, revision[0],"15")
          if userVal in userDictionary:
              inputRevision["creatorId"] = ObjectId(userDictionary[userVal]["_id"])
          elif revision[5] in userDictionary:
              inputRevision["creatorId"] = ObjectId(userDictionary[revision[5]]["_id"])
          else:
              inputRevision["creatorId"] = ObjectId()
          inputRevision["access"]["users"].append( {
                "flags" : [ ],
                "id" : inputRevision["creatorId"],
                "level" : 2
              })
          inputRevision["name"] = "Revision " + str(revision[2])
          inputRevision["_id"] = ObjectId()
          inputRevision["description"] = revision[4]
          inputRevision["created"] = revision[3]
          if inputRevision["created"] == None:
            inputRevision["created"] = row[2]
          print inputRevision['name']
          # Capture the download and view information
          #| download_id    | bigint(20)   | NO   | PRI | NULL              | auto_increment              |
          #| item_  id        | bigint(20)   | NO   | MUL | NULL              |                             |
          #| user_id        | bigint(20)   | YES  |     | NULL              |                             |
          #| date           | timestamp    | NO   |     | CURRENT_TIMESTAMP | on update CURRENT_TIMESTAMP |
          #| ip_location_id | bigint(20)   | NO   |     | NULL              |                             |
          #| user_agent     | varchar(255) | YES  |     |
          cur.execute("SELECT * FROM statistics_download WHERE item_id="+ str(revision[0]))
          allDownloads = cur.fetchall()
          for download in allDownloads:
            journalDownloadsDB.insert_one({"_id": ObjectId(), 'date': download[3], "item_id": inputObject["_id"]})
          # Capture reviews for submissions
          #+---------------+
          #| Field         |
          #+---------------+
          #| review_id     |
          #| revision_id   |
          #| user_id       |
          #| type          |
          #| content       |
          #| cache_summary |
          #| complete      |
          #+---------------+
          cur.execute("select * from reviewosehra_review where revision_id="+str(revision[0]))
          allreviews = cur.fetchall()
          totalReview = {
              'peer': {"template" : {},
                       "reviews" : []},
              'final': {"template" : {},
                       "reviews" : []}
          }
          for review in allreviews:
            if review[3] == 1:
               reviewJSON = processPeerReview(json.loads(review[4]))
            else:
               reviewJSON = json.loads(review[4])
            incomingReview = {
              'user': userDictionary[review[2]],
              'questions': reviewJSON,
              'type': 'peer' if review[3] == 1 else 'final',
              'done': review[6]
            }
            totalReview[incomingReview['type']]["reviews"].append(incomingReview);
          totalReview['peer']['template'] = TechJournal.findReviews("peer", questionLists, inputRevision)
          totalReview['final']['template'] = TechJournal.findReviews("final", questionLists, inputRevision)
          inputRevision["meta"]['reviews'] = totalReview
          result = foldersDB.insert_one(inputRevision)
          revisionNumber += 1
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
                                         "type":filetypeDict[str(bitstream[9])]
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
    settingDB.insert_one({"_id":ObjectId(),
                          "key":"technical_journal.submission",
                          "value":submissionNumber
                        })
    settingDB.insert_one({"_id":ObjectId(),
                          "key":"technical_journal.reviewUpload",
                          "value":reviewDataFolder['_id']
                        })


if __name__ == '__main__':
    parser = argparse.ArgumentParser(
        description='Midas to Girder data migration script', parents=[])
    parser.add_argument('-ci','--collID', required=False, default=None)
    parser.add_argument('-ar','--assetRoot', required=False, default=None)
    parser.add_argument('-pa','--prevAsset', required=True, default=None)
    parser.add_argument('-u','--user', required=True, default=None)
    parser.add_argument('-db','--dbname', required=False, default="girder")
    result = parser.parse_args()
    ReadAll(result.user, result.prevAsset, result.dbname, result.collID,result.assetRoot)
