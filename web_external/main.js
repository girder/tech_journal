import events from 'girder/events';
import router from 'girder/router';
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
        start: false,
        parentView: null
    });
    app.start()
        .done(() => {
            // The default layout will always show on the first render (since app.navigateTo isn't
            // called), so trigger a normal navigation to hide it again.
            // TODO: This should use the current location, instead of the home page, to allow direct
            // loading of URLs to work.
            router.navigate('', {trigger: true});
        });
    events.trigger('g:appload.after', app);
});
