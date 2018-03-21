import events from 'girder/events';
import App from 'girder/views/App';

// Import all stylesheets
import './stylesheets/main.styl';
import './stylesheets/index.index.styl';
import './stylesheets/submit.index.styl';
import './stylesheets/submit.upload.styl';
import './stylesheets/view.index.styl';
import './stylesheets/item.comments.styl';

import './routes';

$(() => {
    events.trigger('g:appload.before');
    const app = new App({
        el: 'body',
        parentView: null
    });
    events.trigger('g:appload.after', app);

    if (process.env.GA_KEY) {
      console.log(process.env.GA_KEY);
    }
});
