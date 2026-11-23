#!/bin/sh
# Rechaza rutas absolutas de usuario (D25, D30, D44): lee texto por stdin o, con --repo, revisa los ficheros versionados.
re='/(Users|home)/[A-Za-z0-9._-]+|[A-Za-z]:[\\/]Users[\\/]|/private/(var|tmp)/'
if [ "$1" = "--repo" ]; then
  git grep -nIE "$re" -- . && found=1
else
  grep -nE "$re" && found=1
fi
if [ -n "$found" ]; then
  echo "ERROR: hay una ruta absoluta de usuario. Usa rutas relativas al repositorio." >&2
  exit 1
fi
exit 0
