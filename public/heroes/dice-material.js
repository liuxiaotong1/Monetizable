import {MeshStandardMaterial} from 'three';
// Shared by both companions, homepage dice play and full arena outcomes.
export const DICE_PIP_COLOR=0xffffff;
export function createDiceMaterial(){return new MeshStandardMaterial({color:0x42cafb,emissive:0x168cff,emissiveIntensity:.3,metalness:.6,roughness:.2})}
