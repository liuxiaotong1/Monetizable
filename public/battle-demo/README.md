# Restored battle review page

The review page and onboarding embed restore the environment and effects from
outputs/boss-fx-review/scene.js and worlds.js. The embed plays one victory for
the selected companion in account-gated onboarding. It does not alter scoring
or replace actual prediction outcome logic. Assets are referenced from
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

Onboarding: /battle-demo/embed.html?embed=1&hero=female&boss=dragon&locale=fr
The embed posts same-origin ready/complete/error messages. The React parent
checks the frame source and stores one-time completion per account.

Failure review: /battle-demo/index.html?hero=supercharlie&boss=dragon&outcome=loss&locale=zh
The loss branch keeps both arenas, faces the selected companion toward +X
(the boss), adds guard/recoil/recovery via defeat-motion.js, and keeps the boss
standing. Homepage and legacy loss URLs use this same arena embed.

Framing revision: camera-fit.js fits the individual stage geometry, current
actors, hands and dice to the real iframe aspect ratio, including perspective
depth. It reserves edge margins, adjusts the far plane and removes fixed
victory zoom. Outer water/ruin discs use a 4.8-unit radius, retaining the
architecture while avoiding an oversized empty rim. Preview height adapts to
available viewport height. data-frame-extent records the projected edge check.
