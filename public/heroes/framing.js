// Reserve distinct horizontal lanes for the hero's casting arm and the boss.
// Fit the complete action envelope inside the actual iframe aspect ratio.
export function companionFrame(aspect,heroWidth=1,bossWidth=1.4,solo=0){
 const heroX=-.55,bossX=heroX+heroWidth/2+.26+bossWidth/2;
 const left=heroX-heroWidth/2-.12,right=bossX+bossWidth/2+.14;
 const center=(left+right)/2*(1-solo),width=(right-left)*(1-solo)+1.35*solo;
 const z=Math.max(3.4,(width/2+.12)/(Math.tan(16*Math.PI/180)*Math.max(.25,aspect)));
 return {heroX,bossX,center,z};
}
