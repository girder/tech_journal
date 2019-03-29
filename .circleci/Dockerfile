FROM girder/girder_test:latest-py2

# Don't use "sudo"
USER root

# Install yarn
RUN npm install --global yarn

# Switch back to normal user
USER circleci
