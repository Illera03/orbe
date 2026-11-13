# Licencias de UNESCO y Smithsonian (hito M0, tarea B2)

Fecha de consulta: 2026-11-13.

Cómo se consultó: whc.unesco.org y volcano.si.edu responden 403 a las peticiones automáticas, así que las
páginas se leyeron en la copia del Internet Archive más reciente a esa fecha (se indica cada instantánea).
Conviene que alguien confirme el texto en la página en vivo antes de cerrar la decisión.

## 1. Lista del patrimonio mundial de la UNESCO

- **Términos:** <https://whc.unesco.org/en/syndication/> (instantánea del 2026-10-31), sección "Terms and
  Conditions of Use". Esa misma página es la que ofrece las descargas XML, XLS, XLSX, KML y GeoRSS de la lista,
  con sus coordenadas. Política general: <https://whc.unesco.org/en/disclaimer/> (instantánea del 2026-11-06),
  que remite a <https://www.unesco.org/en/terms-use>.
- **Cita literal:** "Any republication, online or in any other form, of any UNESCO/WHC data requires prior
  written authorization." Añade que el permiso se concede "for personal, non-commercial use, without fee",
  que "No modifications may be made to the content", que "You may not sell, license, or otherwise assign the
  use of any of the material" y que, fuera de las secciones sindicadas, hace falta una licencia XML que
  "will imply a fee".
- **Licencia o condiciones:** todos los derechos reservados. Ninguna licencia abierta cubre los datos de la lista.
- **Uso comercial:** no. Solo uso personal y no comercial, y siempre con autorización escrita previa.
- **Redistribuir datos derivados en un repositorio público:** no sin autorización escrita. Además prohíbe
  modificar el contenido, lo que choca con normalizar o recortar los datos en el pipeline.
- **Atribución exigida:** un enlace a <https://whc.unesco.org> y a la página del sitio, más este aviso literal:
  "Copyright © 1992 - [current year] UNESCO/World Heritage Centre. All rights reserved."
- **Ambigüedad:** la página de políticas indica que el contenido "© UNESCO" va bajo CC BY-SA 3.0 IGO, pero lo
  hace en una tabla sobre imágenes y documentos, sin decir que se aplique a las descargas de la lista. Las
  condiciones específicas de las descargas son las de sindicación, que son más restrictivas. No se debe
  suponer que la CC BY-SA 3.0 IGO cubre el XML o el XLS.
- **Veredicto: no apto / consultar a Jorge.**

**Alternativa abierta:** Wikidata, con las propiedades "World Heritage Site ID" (P757) y "heritage designation"
(P1435) y coordenadas en P625. Licencia CC0. Según <https://www.wikidata.org/wiki/Wikidata:Licensing>
(consultada en vivo el 2026-11-13): "All structured data (i.e. the main, Property, Lexeme, and EntitySchema
namespaces) is released into the public domain under Creative Commons Zero". No exige atribución, aunque se
puede citar "Wikidata" por cortesía. La cobertura y la exactitud se validarían en el pipeline. Mostrar el
identificador de la UNESCO y enlazar a su ficha no supone republicar sus datos.

## 2. Smithsonian Global Volcanism Program (volcanes del Holoceno y del Pleistoceno)

- **Términos:** <https://volcano.si.edu/gvp_termsofuse.cfm> (instantánea del 2026-11-06), que remite a los
  Smithsonian Terms of Use. Cita formal: <https://volcano.si.edu/gvp_votw.cfm> (instantánea del 2026-11-06) y
  <https://volcano.si.edu/gvp_cite.cfm> (instantánea del 2026-11-06).
- **Cita literal (a favor):** sobre la base de datos Volcanoes of the World, de la que salen las listas del
  Holoceno y del Pleistoceno: "The database compilation is a product of employees of the United States, and
  falls under (2)". El caso (2) es contenido que "was never eligible for copyright protection because it was
  created by an employee of the United States as part of his or her official duties".
- **Cita literal (en contra):** la misma página dice "The Smithsonian invites visitors to use its online
  content for personal, educational and other non-commercial purposes" y "You may not use the Content for
  commercial purposes", y exige permiso escrito previo para usos comerciales.
- **Licencia o condiciones:** la base de datos es una obra del Gobierno federal de EE. UU., sin derechos de
  autor según la propia página, pero se publica bajo unos términos de uso generales que restringen el uso
  comercial del "Content".
- **Uso comercial: ambiguo.** Por derechos de autor parece libre: la página dice que la base de datos nunca
  fue protegible y la cláusula no comercial va ligada a contenido protegido. Pero el texto no exceptúa la base
  de datos de esa cláusula de forma explícita, y aceptar los términos de uso podría obligar por vía contractual.
  Esa duda la debe resolver Jorge, o un correo al GVP pidiendo confirmación escrita.
- **Redistribuir datos derivados en un repositorio público:** permitido para uso no comercial, con la cita.
  Para un uso con posible monetización, la misma ambigüedad.
- **Atribución exigida:** cita general "Global Volcanism Program, Smithsonian Institution" con enlace a
  <https://volcano.si.edu/>. Cita formal de la base de datos (la versión cambia, hay que tomarla de
  gvp_votw.cfm en cada descarga): "Global Volcanism Program, 2026. [Database] Volcanoes of the World (v. 5.4.0;
  7 Aug 2026). Distributed by Smithsonian Institution, compiled by Venzke, E.
  https://doi.org/10.5479/si.GVP.VOTW5-2026.5.4". Además: "You may not remove any copyright, trademark, or
  other proprietary notices including attribution information".
- **Veredicto: apto con condiciones** (cita formal con DOI y enlace) mientras Orbe no tenga uso comercial.
  Antes de monetizar, **consultar a Jorge** y pedir confirmación escrita al GVP.

**Alternativa abierta:** Wikidata (elementos con "instance of" (P31) volcán (Q8072) o sus subclases y
coordenadas en P625), bajo CC0 como se indica arriba. Cubre peor que la base de datos del GVP: suele faltar
la fecha de la última erupción, el tipo de volcán según la clasificación del GVP y el número de volcán. No se
ha verificado la licencia de otras alternativas, como la base de datos de volcanes de NOAA NCEI.
