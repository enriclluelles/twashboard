#!/usr/bin/env bash
rm -rf ./public/js/*
# convert commonjs-style to amd

pushd ./public/js > /dev/null
../../node_modules/requirejs/bin/r.js -convert ../../public_src/js .
popd > /dev/null

# trace dependencies and concat deps
# ./node_modules/requirejs/bin/r.js -o assets_config.js
