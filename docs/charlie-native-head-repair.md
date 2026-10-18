# Charlie original model audit and native head repair — 2026-10-18

The original Meshy textured export already contained head albedo, roughness/metallic and normal maps. Facial detail was weak and the fringe occluded one eye. This was not a completely uncolored face or a missing browser texture.

The rejected portrait projection and replacement face shell were removed, along with both scripts that generated them.

## Provider source

- Existing original Charlie asset selected in the authenticated Meshy workspace, not a newly generated character.
- Retexture: Meshy 7 Flagship, text input, PBR enabled, 4K selected.
- Used 10 existing free account credits (100 → 90), no subscription/purchase.
- Download: `Meshy_AI_Celestial_Navigator_1018131921_texture.glb`.
- Preserved raw export: `outputs/charlie-original-audit/charlie-native-retextured.glb`.
- SHA256: `e5a888b26555182c94307f3eb34708ff606d0612c95fac607192d6f3e01f2bbc`.
- Existing Meshy CC BY 4.0 license and legal credits remain applicable.

Exact prompt (negative constraints included):

> SuperCharlie, the same adult male anime hero. Preserve existing ivory long coat, black navy vest, champagne gold embroidery, black gloves, dark tousled hair and all costume details. Repair the original head UV texture: crisp natural turquoise irises, dark pupils, white sclera, defined eyelids and eyebrows, clear subtle lips, natural warm skin shading, clean nose contours. Align facial features accurately with the existing sculpted eye sockets, nose and mouth. Symmetric facial coloring. Hair remains dark, skin is matte, gold trim is metallic. No face photograph, no flat portrait decal, no painted hair over skin, no glasses, no mask, no extra face, no change to geometry or costume. Professional game character PBR albedo, roughness and normal maps.

## Integration

`restore-charlie-native-face.py` uses the native retexture UVs only on original head triangles (centroid y > 1.495). Costume triangles keep their original UVs and all original PBR images. The provider split some UV vertices but did not change positions. Exact source positions and original skin weights are used. Head albedo remains 4K, re-encoded for web delivery. Skin is non-metallic. Original skeleton remains intact.

Static comparison confirmed all 223,288 original triangles, exact geometric positions, original weights and bones. No replacement facial surface, billboard, portrait image or extra facial triangles. Typecheck/build passed. Actual WebGL reviewed from front, three-quarter and battle settlement.

Remaining source quality limits: original sculpt has stylized low-detail nose geometry, and fringe still partially covers one eye. Native retexturing improves color definition; it does not constitute manual facial retopology or a new facial rig.
