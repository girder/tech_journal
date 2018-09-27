import View from 'girder/views/View';

import JournalLoginViewTemplate from './journal_login.pug';
import JournalTermsTemplate from './journal_terms.pug';

var journalLoginView = View.extend({
    events: {
        'click .termOfService': function (event) {
            this.$('.terms').html(JournalTermsTemplate());
        },
        'click .closeTerms': function (event) {
            this.$('.terms').html('');
        }
    },
    render: function () {
        this.$el.append(JournalLoginViewTemplate());
        return this;
    }
});

export default journalLoginView;
