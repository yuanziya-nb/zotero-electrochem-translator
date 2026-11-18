#!/usr/bin/env sh
set -eu
rm -f electrochem-translator.xpi
zip -r electrochem-translator.xpi manifest.json bootstrap.js content
