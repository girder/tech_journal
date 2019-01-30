add_standard_plugin_tests()

# External client static analysis
add_puglint_test(
  tech_journal_external
  "${CMAKE_CURRENT_LIST_DIR}/girder-tech-journal-gui/src")
add_stylint_test(
  tech_journal_external
  "${CMAKE_CURRENT_LIST_DIR}/girder-tech-journal-gui/src")
