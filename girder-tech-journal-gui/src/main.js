import events from '@girder/core/events';
import App from '@girder/core/views/App';
import Vue from 'vue';

// Import all stylesheets
import './stylesheets/main.styl';
import './stylesheets/index.index.styl';
import './stylesheets/submit.index.styl';
import './stylesheets/submit.upload.styl';
import './stylesheets/view.index.styl';
import './stylesheets/item.comments.styl';

import './routes';

// Register MenuBarWidget as a global component
import MenuBarWidget from '@/widgets/MenuBarWidget.vue';
Vue.component(MenuBarWidget.name, MenuBarWidget);

$(() => {
    let gaTrackingId;
    try {
        gaTrackingId = process.env.VUE_APP_GA_TRACKING_ID;
    } catch (e) {}
    if (gaTrackingId) {
        // Inject the Google Analytics framework.
        let s = document.createElement('script');
        s.type = 'text/javascript';
        s.src = `https://www.googletagmanager.com/gtag/js?id=${gaTrackingId}`;
        document.getElementsByTagName('head')[0].appendChild(s);

        // Launch tracking for this site.
        let dataLayer = window.dataLayer;
        dataLayer = dataLayer || [];
        const gtag = function () {
            dataLayer.push(arguments);
        };
        gtag('js', new Date());
        gtag('config', gaTrackingId);
    }

    events.trigger('g:appload.before');
    const app = new App({
        el: 'body',
        parentView: null
    });
    events.trigger('g:appload.after', app);
});
