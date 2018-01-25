import events from 'girder/events';
import router from 'girder/router';
import App from 'girder/views/App';

import './routes';

$(() => {
    events.trigger('g:appload.before');
    const app = new App({
        el: 'body',
        start: false,
        parentView: null
    });
    app.start()
        .then(() => {
            // The default layout will always show on the first render (since app.navigateTo isn't
            // called), so trigger a normal navigation to hide it again.
            // TODO: This should use the current location, instead of the home page, to allow direct
            // loading of URLs to work.
            router.navigate('plugins/journal', {trigger: true});
        });
    events.trigger('g:appload.after', app);
});
