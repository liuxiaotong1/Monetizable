import {MeshStandardMaterial} from 'three';
// Shared by both companions, homepage dice play and full arena outcomes.
export const DICE_PIP_COLOR=0x392b18;
export function createDiceMaterial(){return new MeshStandardMaterial({color:0xdcb65f,emissive:0xa56d18,emissiveIntensity:.10,metalness:.78,roughness:.26})}
