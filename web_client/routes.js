/* eslint-disable import/first */

import events from 'girder/events';
import router from 'girder/router';
import {exposePluginConfig} from 'girder/utilities/PluginUtils';

exposePluginConfig('tech_journal', 'plugins/tech_journal/config');

import ConfigView from './views/config';
router.route('plugins/tech_journal/config', 'techJournalConfig', () => {
    events.trigger('g:navigateTo', ConfigView);
});
