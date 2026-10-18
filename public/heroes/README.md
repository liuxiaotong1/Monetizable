# Original companions and battle assets
SuperCharlie and Astra: original Monetizable concepts; generated Meshy 6 Lite meshes, CC BY 4.0, credit liuxiaotong268 / Meshy. Astra rigged using Mesh2Motion; supplied skeleton/animations CC0. Original interactive dice and outcome motions authored in hero-source.js.
Market dragon: Ashwing Drake Lite by Literock Studios, original free commercial asset license retained under /heroes/dragon-license.txt. The model was downloaded for Monetizable's battle preview; no redistribution as a standalone asset pack is authorized by this implementation.
Beetle King: SaVVy3DArt, CC BY 4.0, source and attribution in beetle-license.txt. Imported from the approved preview, sampled idle pose before bounds/scale and excluded its invalid eye mesh to retain the upright rig. Never used for AI generation or training.

SuperCharlie face revision (2026-10-18): the original Meshy head topology uses
a native 4K retexture. No portrait overlay or additional facial surface is used.
Original costume PBR maps and skeleton are retained. See
`docs/charlie-native-head-repair.md` and `scripts/restore-charlie-native-face.py`.
The 2D selector uses optimized WebP versions of the original model-reference
artwork (supercharlie-portrait.webp and astra-portrait.webp); no model requests
or artificial preparation timer run during selection.

Home battle framing (2026-10-18): framing.js reserves separate hero and boss
lanes and fits their action envelope to the iframe aspect ratio. Bosses sit
behind the hero plane; victory zoom begins after the boss fades. Outcome copy
occupies a separate row below the canvas. Chinese display name: 查理.

Both companions now share dice-material.js (champagne gold with dark pips) across
homepage and arena views. After a failed call, the arena actor smoothly returns
from facing the boss to a neutral, viewer-facing stance during the final two
seconds; guard and recoil offsets fade out before the scene ends.
