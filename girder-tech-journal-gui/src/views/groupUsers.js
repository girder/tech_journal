import View from '@girder/core/views/View';
import router from '@girder/core/router';
import SearchWidget from '@girder/core/views/widgets/SearchFieldWidget.js';
import { restRequest } from '@girder/core/rest';
// import { getCurrentUser } from '@girder/core/auth';

import MenuBarView from './menuBar.js';
import editGroupUsersTemplate from '../templates/journal_groupusers.pug';
import editGroupUserEntryTemplate from '../templates/journal_groupusers_entry.pug';

var EditGroupUsersView = View.extend({

    events: {
        'click .edObj': function (event) {
            event.preventDefault();
            console.log(event);
            restRequest({
                method: 'DELETE',
                url: `group/${this.edId}/member`
            });
        },
        'click .memObj': function (event) {
            event.preventDefault();
            restRequest({
                method: 'DELETE',
                url: `group/${this.memId}/member`
            });
        },
        'submit #createJournalForm': function (event) {
            event.preventDefault();
            var values = {issueName: this.$('#name')[0].value,
                issueDescription: this.$('#description')[0].value
            };
            this._createJournal(values);
            router.navigate('#admin', {trigger: true});
        }

    },
    initialize: function (id) {
        restRequest({
            method: 'GET',
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
            el: this.$('#headerBar'),
            parentView: this
        });
        return this;
    },
    getGroupMembers(issueObject) {
        this.edId = '';
        this.memInfo = '';
        restRequest({
            method: 'GET',
            url: `group/`,
            data: {
                'text': `"${issueObject.name}_editors"`
            }
        }).done((editInfo) => {
            restRequest({
                method: 'GET',
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
                        method: 'GET',
                        url: `group/${this.edId}/member`
                    }).done((edMembers) => {
                        restRequest({
                            method: 'GET',
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
            method: 'POST',
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
            method: 'POST',
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
