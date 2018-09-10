from girder_worker.app import app
import os
import urllib

@app.task
def processGithub(path, **kwargs):
  githubArray = path.split("/")
  url = "https://github.com/%s/%s/archive/master.zip" % (githubArray[3],githubArray[4])
  openedPage = urllib.urlretrieve(url,"githubzip.zip")
  print openedPage
  return os.path.join(os.getcwd(),"githubzip.zip")

