import RegisterView from 'girder/views/layout/RegisterView';
import { getCurrentUser } from 'girder/auth';
import { wrap } from 'girder/utilities/PluginUtils';

import JournalLoginView from './journal_register.js';

wrap(RegisterView, 'render', function (render) {
    render.call(this);

    if (!getCurrentUser()) {
        new JournalLoginView({
            el: this.$('.modal-body'),
            parentView: this
        }).render();
    }

    return this;
});
