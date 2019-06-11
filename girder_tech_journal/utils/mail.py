from girder import events
from girder.utility import mail_utils


def sendEmails(users, subject, text):
    to = (user['email'] for user in users)
    # TODO: Eliminates duplicates; remove once database is fixed
    to = list(set(to))

    events.daemon.trigger('_queueEmails', info={
        'to': to,
        'subject': subject,
        'text': text
    })


def _queueEmails(event):
    to = event.info['to']
    subject = event.info['subject']
    text = event.info['text']

    for userEmail in to:
        mail_utils.sendEmail(
            to=userEmail,
            subject=subject,
            text=text
        )
