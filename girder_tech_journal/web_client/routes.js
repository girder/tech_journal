/* eslint-disable import/first */

import events from '@girder/core/events';
import router from '@girder/core/router';
import {exposePluginConfig} from '@girder/core/utilities/PluginUtils';

exposePluginConfig('tech_journal', 'plugins/tech_journal/config');

import ConfigView from './views/config';
router.route('plugins/tech_journal/config', 'techJournalConfig', () => {
    events.trigger('g:navigateTo', ConfigView);
});
