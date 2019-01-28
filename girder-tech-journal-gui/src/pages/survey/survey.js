import View from '@girder/core/views/View';
import { restRequest } from '@girder/core/rest';

import MenuBarView from '../../views/menuBar.js';
import SurveyViewTemplate from './journal_survey.pug';

var surveyView = View.extend({

    events: {
    },
    initialize: function (options) {
        restRequest({
            method: 'GET',
            url: `journal/${options.id}/survey`
        }).done((totalDetails) => {
            this.render(totalDetails);
        });
    },
    render: function (details) {
        this.$el.html(SurveyViewTemplate({'info': details}));
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$('#headerBar'),
            parentView: this,
            searchBoxVal: '',
            appCount: 0
        });
        return this;
    }
});

export default surveyView;
