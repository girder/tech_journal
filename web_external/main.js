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
    const gaKey = process.env.GA_KEY;
    if (gaKey) {
      // Inject the Google Analytics framework.
      let s = document.createElement('script');
      s.type = 'text/javascript';
      s.src = `https://www.googletagmanager.com/gtag/js?id=${gaKey}`;
      document.getElementsByTagName('head')[0].appendChild(s);

      // Launch tracking for this site.
      window.dataLayer = window.dataLayer || [];
      const gtag = function () {
        dataLayer.push(arguments);
      }
      gtag('js', new Date());
      gtag('config', gaKey);
    }

    events.trigger('g:appload.before');
    const app = new App({
        el: 'body',
        parentView: null
    });
    events.trigger('g:appload.after', app);
});
