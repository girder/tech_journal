add_standard_plugin_tests()

# External client static analysis
add_eslint_test(
  tech_journal_external
  "${CMAKE_CURRENT_LIST_DIR}/web_external")
add_puglint_test(
  tech_journal_external
  "${CMAKE_CURRENT_LIST_DIR}/web_external")
add_stylint_test(
  tech_journal_external
  "${CMAKE_CURRENT_LIST_DIR}/web_external")
