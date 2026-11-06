# Plant Cover Serif TC

The included Regular and Bold WOFF files are Traditional Chinese UI subsets of
**Noto Serif CJK TC 2.003**, from the Noto CJK project. Noto Serif CJK and Source
Han Serif（思源宋體）are companion releases of the same open-source typeface
development, with different naming and packaging.

Upstream: https://github.com/notofonts/noto-cjk

License: SIL Open Font License 1.1; see `OFL.txt`. The modified subset uses the
family name **Plant Cover Serif TC** and retains upstream copyright and license
metadata. The application's MIT license does not replace the font license.

The subset contains the application's current UI characters and Latin/digit
characters. Unincluded characters fall back to the browser's serif font. When
adding interface text, regenerate with `scripts/subset-fonts.py` and upstream
Regular/Bold TTC files. This optional maintenance step needs FontTools with WOFF
support; normal builds use the committed fonts directly.

Vite serves the local WOFF assets while developing. The standalone build embeds
both fonts as data URLs and includes the license in HTML and in the offline ZIP.
No Google Fonts or other external service is contacted at runtime.
