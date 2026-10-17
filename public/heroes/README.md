# Original companions and battle assets
SuperCharlie and Astra: original Monetizable concepts; generated Meshy 6 Lite meshes, CC BY 4.0, credit liuxiaotong268 / Meshy. Astra rigged using Mesh2Motion; supplied skeleton/animations CC0. Original interactive dice and outcome motions authored in hero-source.js.
Market dragon: Ashwing Drake Lite by Literock Studios, original free commercial asset license retained under /heroes/dragon-license.txt. The model was downloaded for Monetizable's battle preview; no redistribution as a standalone asset pack is authorized by this implementation.
Beetle King: SaVVy3DArt, CC BY 4.0, source and attribution in beetle-license.txt. Imported from the approved preview, sampled idle pose before bounds/scale and excluded its invalid eye mesh to retain the upright rig. Never used for AI generation or training.

SuperCharlie face revision (2026-10-17): reprojected facial detail from the
approved original Monetizable model-reference artwork onto existing facial UV
islands. Geometry, skeleton, skin weights and non-face PBR textures are retained.
Rebuild with scripts/repair-charlie-face.py using bundled Python (numpy/Pillow).
The 2D selector uses optimized WebP versions of the original model-reference
artwork (supercharlie-portrait.webp and astra-portrait.webp); no model requests
or artificial preparation timer run during selection.
