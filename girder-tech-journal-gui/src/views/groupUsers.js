import View from 'girder/views/View';
import router from 'girder/router';
import SearchWidget from 'girder/views/widgets/SearchFieldWidget.js';
import { restRequest } from 'girder/rest';
// import { getCurrentUser } from 'girder/auth';

import MenuBarView from './menuBar.js';
import editGroupUsersTemplate from '../templates/journal_groupusers.pug';
import editGroupUserEntryTemplate from '../templates/journal_groupusers_entry.pug';

var EditGroupUsersView = View.extend({

    events: {
        'click .edObj': function (event) {
            event.preventDefault();
            console.log(event);
            restRequest({
                type: 'DELETE',
                url: `group/${this.edId}/member`
            });
        },
        'click .memObj': function (event) {
            event.preventDefault();
            restRequest({
                type: 'DELETE',
                url: `group/${this.memId}/member`
            });
        },
        'submit #createJournalForm': function (event) {
            event.preventDefault();
            var values = {issueName: this.$('#name')[0].value,
                issueDescription: this.$('#description')[0].value
            };
            this._createJournal(values);
            router.navigate('#plugins/journal/admin', {trigger: true});
        }

    },
    initialize: function (id) {
        restRequest({
            type: 'GET',
            url: `${id.type}/${id.id}`
        }).done((jrnInfo) => {
            this.getGroupMembers(jrnInfo);
            return this;
        });
    },
    render: function (editorList, memberList) {
        this.$el.html(editGroupUsersTemplate());
        if (this.edId.length === 0) {
            this.$('.viewMain').hide();
            this.$('.noGroup').show();
        } else {
            editorList.forEach(function (member) {
                member['text'] = `${member.firstName} ${member.lastName} (${member.email})`;
                $('#editorListTable tbody').append(editGroupUserEntryTemplate({'item': member, 'classVal': 'edObj'}));
            });
            memberList.forEach(function (member) {
                member['text'] = `${member.firstName} ${member.lastName} (${member.email})`;
                $('#memberListTable tbody').append(editGroupUserEntryTemplate({'item': member, 'classVal': 'edObj'}));
            });
            this.searchWidgetEd = new SearchWidget({
                placeholder: 'Start typing a name...',
                types: ['user'],
                parentView: this
            }).on('g:resultClicked', this.addEditor, this);
            this.searchWidgetEd.setElement(this.$('.invitationSearchEditor')).render();

            this.searchWidgetMem = new SearchWidget({
                placeholder: 'Start typing a name...',
                types: ['user'],
                parentView: this
            }).on('g:resultClicked', this.addMember, this);
            this.searchWidgetMem.setElement(this.$('.invitationSearchMember')).render();
        }
        new MenuBarView({ // eslint-disable-line no-new
            el: this.$el,
            parentView: this
        });
        return this;
    },
    getGroupMembers(issueObject) {
        this.edId = '';
        this.memInfo = '';
        restRequest({
            type: 'GET',
            url: `group/`,
            data: {
                'text': `"${issueObject.name}_editors"`
            }
        }).done((editInfo) => {
            restRequest({
                type: 'GET',
                url: `group/`,
                data: {
                    'text': `"${issueObject.name}_members"`
                }
            }).done((memInfo) => {
                this.editInfo = editInfo;
                this.memInfo = memInfo;
                if (this.editInfo.length > 0) {
                    this.edId = this.editInfo[0]['_id'];
                    this.memId = this.memInfo[0]['_id'];
                    restRequest({
                        type: 'GET',
                        url: `group/${this.edId}/member`
                    }).done((edMembers) => {
                        restRequest({
                            type: 'GET',
                            url: `group/${this.memId}/member`
                        }).done((members) => {
                            this.render(edMembers, members);
                            return this;
                        });
                    });
                } else {
                    this.render([]);
                }
            });
        });
    },
    addEditor(selection) {
        this.$('#editorListTable tbody').append(editGroupUserEntryTemplate({'item': selection}));
        restRequest({
            type: 'POST',
            url: `group/${this.edId}/invitation`,
            data: {
                userId: selection.id,
                force: true
            }
        });
        this.searchWidgetEd.resetState();
    },
    addMember(selection) {
        this.$('#memberListTable tbody').append(editGroupUserEntryTemplate({'item': selection}));
        restRequest({
            type: 'POST',
            url: `group/${this.memId}/invitation`,
            data: {
                userId: selection.id,
                force: true
            }
        });
        this.searchWidgetEd.resetState();
    }
});

export default EditGroupUsersView;
