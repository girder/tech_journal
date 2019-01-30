# girder-tech-journal-gui

## Prerequisites
For any builds of this web application, both NodeJS and Yarn are
required.

### Installing NodeJS
If Girder is already installed, NodeJS will already be available too.

If this is a standalone development environment for front-end only
development, then [NodeJS](https://nodejs.org/) must be installed.

### Installing Yarn
[Yarn](https://yarnpkg.com/en/) can be installed via npm (which itself
is bundled with NodeJS). Since Yarn is often used across many projects,
it may be best to install it globally with:
```
sudo npm install -g yarn
```

Alternatively,
[Yarn's installation docs](https://yarnpkg.com/en/docs/install) may be
consulted for a more native installation which does not depend on npm.

## Building
To build this web application to be served in production or when doing
server-side development, first change the working directory of your
shell to this web application:
```bash
cd ./girder-tech-journal-gui
```

Then install application dependencies and build:
```bash
yarn install
yarn run build
```

This will generate built HTML, JS, and CSS in the `./dist/` subdirectory,
which Girder is set up to serve statically when the `tech_journal`
plugin is enabled.

Finally, visit <http://localhost:8080/tech_journal/> in a Web browser
to use the application.

### Enabling Google Analytics
To enable Google Analytics for the web application, define the
`VUE_APP_GA_KEY` environment variable with the value of the
[tracking ID](https://support.google.com/analytics/answer/7372977)
before running the build.

For example:
```bash
export VUE_APP_GA_TRACKING_ID=UA-000000-2
yarn run build
```

## Development Setup
When developing this web application directly, it will be much more
efficient to have the app rebuild itself automatically when changes are
made. To start this, first ensure the Girder API server is running
locally (with the `girder serve` command), then run:
```bash
yarn install
yarn run serve
```

This will launch a development server at
<http://localhost:8081/tech_journal/>. Use this development server
(instead of the Girder server typically running on port `8080`) during
any ongoing front-end development.

If VueJS single file components
(`*.vue` files) are being edited, the changes will even hot reload in
the browser, without the need to refresh the page.

### Proxying to an external API server
When doing development on the front-end only, it may be desirable to
use an external `tech_journal` API server, instead of running one
locally. This removes the prerequisite that Girder be installed for
development and can allow easy access to a fully populated test
database.

To connect the development server to an external API server, set the
`API_HOST` environment variable to point to the schema and hostname
(without any path components) of an existing `tech_journal` API server.

For example, to use an external API server running at
`http://midas-vm.kitware.com:8080/api/v1`, run:
```bash
export API_HOST=http://midas-vm.kitware.com:8080
yarn run serve
```

## Running Tests
To run static analysis ("linting") tests, run:
```bash
yarn install
yarn run lint
yarn run lint-legacy
```

The `lint` task will only check new VueJS single file components
(`*.vue` files), while the `lint-legacy` task will only check Backbone
files (`*.js` files).
