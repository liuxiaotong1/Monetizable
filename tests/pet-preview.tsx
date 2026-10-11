import React from 'react';
import { createRoot } from 'react-dom/client';
import { SuperCharlieCompanion } from '../src/components/supercharlie-companion';

createRoot(document.getElementById('root')!).render(<>
  <h1>SuperCharlie interaction check</h1>
  <p>Scroll this page. The companion should remain at the viewport edge, without a rectangular image background.</p>
  <div style={{height: '160vh'}}/>
  <h2>End of scroll check</h2>
  <SuperCharlieCompanion message="I found 28 opportunities for you."/>
</>);
