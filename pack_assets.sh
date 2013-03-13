#!/usr/bin/env bash
./node_modules/.bin/browserify --debug assets/js/app.js > public/js/app.js
./node_modules/.bin/browserify assets/js/vendor.js > public/js/vendor.js
./node_modules/.bin/browserify assets/js/vendor.js > public/js/vendor.js
node compile_templates.js
cd assets/sass && ../../node_modules/.bin/node-sass main.sass
mv ./assets/sass/nodesass.css ./public/css/main.css
