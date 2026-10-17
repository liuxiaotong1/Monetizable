# Restored battle review page

This standalone review page restores the environment and effects from
outputs/boss-fx-review/scene.js and worlds.js. It does not replace the current
production victory iframe or alter scoring. Assets are referenced from
/heroes/; existing commercial license and CC BY attribution are retained.

The two original companions replace the old Yelan mesh. rig-motion.js uses
world-space two-bone IK with each skeleton's rest bending planes, sampled
cubic hand targets, torso counterrotation, stepping and recovery. This is
new authored motion with the approved timing, not an extracted game clip.

Build: npx esbuild public/battle-demo/scene-source.js --bundle --minify
--format=esm --outfile=public/battle-demo/scene.js

Review /battle-demo/index.html?hero=female&boss=dragon or
/battle-demo/index.html?hero=supercharlie&boss=beetle.
Both bosses, both companions, half-speed playback and the scrub timeline
are accessible through visible controls. No model files are duplicated.
