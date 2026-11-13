#!/bin/sh
# Lee texto por stdin y falla si contiene alguna atribución prohibida (ver patterns.txt).
dir=$(dirname "$0")
if grep -iEf "$dir/patterns.txt"; then
  echo "ERROR: el texto contiene una atribución prohibida (ver .githooks/patterns.txt)." >&2
  exit 1
fi
exit 0
