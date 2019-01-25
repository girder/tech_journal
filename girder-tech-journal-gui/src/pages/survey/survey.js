import View from 'girder/views/View';
import { restRequest } from 'girder/rest';

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
            el: this.$el,
            parentView: this,
            searchBoxVal: '',
            appCount: 0
        });
        return this;
    }
});

export default surveyView;
