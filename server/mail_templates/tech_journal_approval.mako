<%include file="tech_journal_header.mako"/>

A new submission has been added to the OSEHRA Technical Journal

<div style="font-size: 13px; color: #000000; margin-bottom: 12px;">
<b>Title:</b> ${name} </br>
<b>Authors:</b>${authors}</br>
<b>Abstract:</b>${abstract}</br>
</div>


Review the results of the survey
<a href="http://localhost:8080/tech_journal#plugins/journal/submission/${id}/survey"> here</a>.

<%include file="tech_journal_footer.mako"/>
