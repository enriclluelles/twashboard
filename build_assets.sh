#!/usr/bin/env bash

rm -rf ./public/js/*
mkdir -p ./public/js

pushd ./public/js > /dev/null
../../node_modules/requirejs/bin/r.js -convert ../../assets/js .
popd > /dev/null

# trace dependencies and concat deps
# ./node_modules/requirejs/bin/r.js -o assets_config.js
