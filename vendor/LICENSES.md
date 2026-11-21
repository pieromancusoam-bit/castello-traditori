# Licenze delle librerie in /vendor

Le librerie sono scaricate una volta dal registro npm, con integrità verificata (sha512),
e non vengono mai caricate da CDN durante il gioco.

| File | Libreria | Versione | Fonte | Licenza |
| --- | --- | --- | --- | --- |
| `peerjs-1.5.5.min.js` | PeerJS (build `dist/peerjs.min.js`) | 1.5.5 | https://www.npmjs.com/package/peerjs | MIT |
| `qrcode-generator-2.0.4.mjs` | qrcode-generator (build `dist/qrcode.mjs`) | 2.0.4 | https://www.npmjs.com/package/qrcode-generator | MIT |

## Font in /assets/fonts

| File | Font | Fonte | Licenza |
| --- | --- | --- | --- |
| `grenze-gotisch-latin.woff2` | Grenze Gotisch (sottoinsieme latino, variabile 100–900) | Google Fonts (fonts.gstatic.com, v20) | SIL Open Font License 1.1, testo in `assets/fonts/OFL-GrenzeGotisch.txt` |

Per aggiornare: scarica la nuova versione, rinomina il file con il nuovo numero di versione,
aggiorna `index.html` / `js/ui/qr.js` e questa tabella.

---

## PeerJS — licenza MIT

```
Copyright (c) 2015 Michelle Bu and Eric Zhang, http://peerjs.com

(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining
a copy of this software and associated documentation files (the
"Software"), to deal in the Software without restriction, including
without limitation the rights to use, copy, modify, merge, publish,
distribute, sublicense, and/or sell copies of the Software, and to
permit persons to whom the Software is furnished to do so, subject to
the following conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE
LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

## qrcode-generator — licenza MIT

```
Copyright (c) 2009 Kazuhiko Arase

URL: http://www.d-project.com/

Licensed under the MIT license:
  http://www.opensource.org/licenses/mit-license.php

The word 'QR Code' is registered trademark of DENSO WAVE INCORPORATED
  http://www.denso-wave.com/qrcode/faqpatent-e.html
```
