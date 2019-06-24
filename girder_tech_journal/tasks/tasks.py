from girder_worker.app import app
from girder.models.folder import Folder
from girder.models.item import Item
from girder.models.file import File
import os
import re
import urllib
import zipfile


Journal_SURVEY_EXPRESSIONS = (("Do not [Re]*distribute", []),
                              ("Copyright [0-9\-]*", []),
                              ("(Released|Licensed) ", []),
                              ("All rights reserved", []),
                              ("Deriv[atived]+", [])
                              )

Journal_FILE_EXCLUDES = (".dat", ".dll", ".DAT", ".exe", ".EXE", ".mdf", ".pdb", ".class", ".jpeg",
                         ".jpg", ".png", ".gif", ".bmp", ".docx", ".pdf", ".vsd", ".doc", ".xls", ".xlsx", ".ppt", ".pptx",
                         ".db", ".xml", ".XML")
Journal_UNZIP_EXCLUDES = (".EAP", ".dll", ".docx")


def checkFile(fh, outline):
    while True:
        line = fh.read(1024)
        if not line:
            break
    # for line in fh.read().split('\n'):
        for entry in Journal_SURVEY_EXPRESSIONS:
            if re.search(entry[0], line, re.I):
                entry[1].append((outline, line))


@app.task
def processGithub(path, **kwargs):
    githubArray = path.split("/")
    url = "https://github.com/%s/%s/archive/master.zip" % (
        githubArray[3], githubArray[4])
    openedPage = urllib.request.urlretrieve(url, "githubzip.zip")
    return os.path.join(os.getcwd(), "githubzip.zip")


@app.task
def surveySubmission(folder, **kwargs):
    for item in Folder().childItems(folder):
        for uploadedFile in Item().childFiles(item):
            with File().open(uploadedFile) as fh:
                outline = uploadedFile['name']
                filename, file_extension = os.path.splitext(outline)
                if file_extension in Journal_FILE_EXCLUDES:
                    continue
                if zipfile.is_zipfile(fh) and (file_extension not in Journal_UNZIP_EXCLUDES):
                    with zipfile.ZipFile(fh) as zippedFile:
                        for file in zippedFile.namelist():
                            zipfilename, zipfile_extension = os.path.splitext(
                                file)
                            if zipfile_extension not in Journal_FILE_EXCLUDES:
                                checkFile(zippedFile.open(file), "TEST")
                else:
                    checkFile(fh, outline)
    with open(os.path.join("SurveyResult.txt"), "w") as outfile:
        outfile.write("Begin Report")
        for entry in Journal_SURVEY_EXPRESSIONS:
            if len(entry[1]):
                outfile.write("**********************\nFound results for\n")
                outfile.write(entry[0]+"\n")
                outfile.write("**********************\n")
                for item in entry[1]:
                    outfile.write(item[0]+"\n     " + item[1]+"\n")
        outfile.write("\n\nEnd Report")
    return os.path.join(os.getcwd(), "SurveyResult.txt")
