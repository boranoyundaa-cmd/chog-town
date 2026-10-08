// ===== styles: alternative final-pass shaders for art-style comparison (?style=smooth|paint|flat|comic|mini) =====
// Same scene, same lights, same Chogs; only the post-process (and softer texture/shade filtering in common.js) changes.
const STYLE_PRE = `
precision highp float; varying vec2 vUv;
uniform sampler2D tColor, tDepth, tNormal, tBloom, tMask, tMaskDepth; uniform vec2 res; uniform float dth, ss;
float dAt(vec2 uv, vec2 o){ return texture2D(tDepth, uv+o).r; }
vec3 nAt(vec2 uv, vec2 o){ return texture2D(tNormal, uv+o).rgb*2.-1.; }
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f);
  return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x), mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x), f.y); }
float lum(vec3 c){ return dot(c,vec3(.299,.587,.114)); }
vec2 OUTPX = vec2(1920.,1080.);
// x = depth edge, y = normal edge; w = offset in scene texels (2 texels = 1 output px)
vec2 edgeAt(vec2 uv, float w, float nth){
  vec2 px=w/res; float d=dAt(uv,vec2(0.)); vec3 n=nAt(uv,vec2(0.));
  vec2 a=vec2(px.x,0.), b=vec2(0.,px.y);
  float de=step(dth,dAt(uv,a)-d)+step(dth,dAt(uv,-a)-d)+step(dth,dAt(uv,b)-d)+step(dth,dAt(uv,-b)-d);
  float ne=step(nth,1.-dot(n,nAt(uv,a)))+step(nth,1.-dot(n,nAt(uv,-a)))+step(nth,1.-dot(n,nAt(uv,b)))+step(nth,1.-dot(n,nAt(uv,-b)));
  float fade=1.-smoothstep(.36,.46,d);
  de=clamp(de,0.,1.)*fade; ne=clamp(ne,0.,1.)*(1.-de)*fade;
  return vec2(de,ne);
}
// cheap screen-space ambient occlusion from the depth buffer (depth is linear in world units / 259)
float ssao(float r){
  vec2 px=r/res; float d=dAt(vUv,vec2(0.)); float o=0.;
  for(int i=0;i<8;i++){ float a=float(i)*.785398; float dd=(d-dAt(vUv,vec2(cos(a),sin(a))*px))*259.;
    o+=smoothstep(.15,1.2,dd)*(1.-smoothstep(2.5,7.,dd)); }
  return o/8.;
}
vec3 tone(vec3 c){ c=mix(c,c*c*(3.-2.*c),.22); vec3 over=max(c-.74,0.); return min(c,.74)+over/(1.+over*2.4); }
float vig(float k){ return 1.-k*pow(length(vUv-.5)*1.3,2.4); }
`;

const STYLE_FRAG = {};

// Smooth stylised 3D (Animal-Crossing-like): full resolution, soft toon ramp, thin coloured outline, AO, glow.
STYLE_FRAG.smooth = `
void main(){
  vec3 c=texture2D(tColor,vUv).rgb;
  vec2 e=edgeAt(vUv,2.6,.5);
  c*=1.-ssao(10.)*.5;
  c=mix(c,c*vec3(.34,.24,.42),e.x*.8);
  c=mix(c,c*vec3(.74,.66,.84),e.y*.35);
  float l=lum(c);
  c=mix(vec3(l),c,1.14);
  c=mix(c*vec3(.92,.86,1.06), c*vec3(1.06,1.02,.94), smoothstep(.1,.7,l));
  c+=texture2D(tBloom,vUv).rgb*.3;
  c=tone(c)*vig(.22);
  gl_FragColor=vec4(c,1.);
}`;

// Painted storybook (gouache): Kuwahara brush strokes, wobbly broken ink line, paper grain.
STYLE_FRAG.paint = `
vec4 kq(vec2 uv, vec2 sg, float s){
  vec3 m=vec3(0.); float m2=0.;
  for(int i=0;i<4;i++) for(int j=0;j<4;j++){
    vec3 c=texture2D(tColor, uv+sg*vec2(float(i),float(j))*s/res).rgb; m+=c; m2+=dot(c,c); }
  m/=16.; return vec4(m, abs(m2/16.-dot(m,m)));
}
void main(){
  vec2 wob=(vec2(vnoise(vUv*OUTPX/24.), vnoise(vUv*OUTPX/24.+7.7))-.5)*4./res;
  vec2 uv=vUv+wob;
  vec4 a=kq(uv,vec2(1.,1.),2.4), b=kq(uv,vec2(-1.,1.),2.4), d=kq(uv,vec2(1.,-1.),2.4), f=kq(uv,vec2(-1.,-1.),2.4);
  vec4 best=a; if(b.w<best.w) best=b; if(d.w<best.w) best=d; if(f.w<best.w) best=f;
  vec3 c=best.rgb;
  float l=lum(c); c=mix(vec3(l),c,1.02);
  c=mix(c,vec3(.97,.92,.84),.12);                       // pigment on warm paper
  vec2 e=edgeAt(uv,3.,.55);
  float broken=mix(.3,.9,smoothstep(.2,.65,vnoise(vUv*OUTPX/7.)));
  float line=clamp(e.x*broken+e.y*.25*broken,0.,1.);
  c=mix(c,mix(vec3(.2,.1,.2),c*.3,.4),line*.8);
  float g=hash(floor(vUv*OUTPX)), fib=vnoise(vUv*OUTPX*vec2(.9,.12));
  c*=.93+.07*g+.06*fib;
  c+=texture2D(tBloom,vUv).rgb*.16;
  c=tone(c)*vig(.28);
  gl_FragColor=vec4(c,1.);
}`;

// Flat poster (Monument-Valley-like): depth-aware blur removes surface texture without softening silhouettes,
// then hard brightness steps (hue kept), no outlines, pastel lift.
STYLE_FRAG.flat = `
void main(){
  float d0=dAt(vUv,vec2(0.)); vec3 n0=nAt(vUv,vec2(0.));
  vec3 c=vec3(0.); float ws=0.;
  for(int i=-3;i<=3;i++) for(int j=-3;j<=3;j++){
    vec2 o=vec2(float(i),float(j))*2.6/res;
    float w=exp(-abs(dAt(vUv,o)-d0)*259.*3.)*exp(-(1.-dot(n0,nAt(vUv,o)))*6.);
    c+=texture2D(tColor,vUv+o).rgb*w; ws+=w; }
  c/=ws;
  float l=lum(c), x=l*5.;
  float lq=(floor(x)+smoothstep(.42,.58,fract(x)))/5.;
  c*=(lq+.05)/(l+.05);
  float l2=lum(c); c=mix(vec3(l2),c,1.1);
  c=mix(c,vec3(.98,.94,.9),.08);
  c*=.97+.03*hash(floor(vUv*OUTPX));
  c=tone(c)*vig(.14);
  gl_FragColor=vec4(c,1.);
}`;

// Ink comic: thick ink outline, halftone dots in the shadows, few flat colour levels, paper tint.
STYLE_FRAG.comic = `
void main(){
  vec3 c=texture2D(tColor,vUv).rgb;
  float l=lum(c);
  float x=l*4.;
  float lq=(floor(x)+smoothstep(.4,.6,fract(x)))/4.;
  vec3 q=c*(lq+.05)/(l+.05);
  q=mix(vec3(lum(q)),q,1.2);
  vec2 p=mat2(.866,.5,-.5,.866)*(vUv*OUTPX);
  float dist=length(fract(p/6.5)-.5);
  float obj=1.-smoothstep(.36,.46,dAt(vUv,vec2(0.)));   // dots only on the island, not the sky/clouds
  float sh=1.-smoothstep(.08,.4,l);
  float dots=(1.-smoothstep(sh*.62-.05,sh*.62+.05,dist))*obj;
  q=mix(q,q*vec3(.42,.28,.55),dots);
  vec2 e=edgeAt(vUv,4.4,.32);
  float ink=clamp(e.x+e.y*.7,0.,1.);
  q=mix(q,vec3(.1,.06,.15),ink);
  q=mix(q,vec3(.98,.93,.84),.08);
  q*=.95+.05*hash(floor(vUv*OUTPX));
  q=tone(q)*vig(.2);
  gl_FragColor=vec4(q,1.);
}`;

// Miniature diorama: tilt-shift blur, strong AO, saturated toy colours, soft glow.
STYLE_FRAG.mini = `
void main(){
  float t=abs(vUv.y-.55);
  float R=smoothstep(.12,.48,t)*18.;
  vec3 c=vec3(0.);
  for(int i=0;i<24;i++){ float a=float(i)*2.39996; float r=sqrt((float(i)+.5)/24.)*R;
    c+=texture2D(tColor,vUv+vec2(cos(a),sin(a))*r/res).rgb; }
  c/=24.;
  c*=1.-ssao(14.)*.6;
  float l=lum(c);
  c=mix(vec3(l),c,1.32);
  c=mix(c*vec3(.9,.84,1.08), c*vec3(1.08,1.02,.9), smoothstep(.1,.7,l));
  c+=texture2D(tBloom,vUv).rgb*.36;
  c=tone(c)*vig(.3);
  gl_FragColor=vec4(c,1.);
}`;

// Hybrid: smooth base + mini's AO and saturation. Chogs keep a thick ink outline (thicker hulls, see HULL_T);
// the environment gets only a thin, light, warm line so it never competes with the characters. No tilt-shift.
STYLE_FRAG.hybrid = `
bool chogVisible(vec2 uv){ return texture2D(tMask,uv).r>.5 && texture2D(tMaskDepth,uv).r <= dAt(uv,vec2(0.))+.0007; }
void main(){
  vec3 c=texture2D(tColor,vUv).rgb;
  vec4 mk=texture2D(tMask,vUv); float dS=dAt(vUv,vec2(0.));
  float vis=(mk.r>.5 && texture2D(tMaskDepth,vUv).r<=dS+.0007)?1.:0.;      // a Chog pixel that is not hidden
  float face=vis*step(.5,mk.g);
  vec2 e=edgeAt(vUv,ss,.55);
  c*=1.-ssao(6.*ss)*.6*(1.-.9*vis);                                         // no ambient occlusion on Chogs, none at all on faces
  c=mix(c,c*vec3(.5,.38,.58),e.x*.55*(1.-vis));
  c=mix(c,c*vec3(.82,.74,.9),e.y*.18);
  float l=lum(c);
  c=mix(vec3(l),c,1.28);
  c=mix(c*vec3(.92,.86,1.06), c*vec3(1.07,1.02,.92), smoothstep(.1,.7,l));
  c=mix(c,c*1.14,face);                                                     // lift the face a little
  c+=texture2D(tBloom,vUv).rgb*.32;
  // one continuous ink outline around every visible Chog silhouette (hair blades included), about 2.5 px
  if(vis<.5){
    float hit=0.;
    for(int k=1;k<=2;k++){ float rr=float(k)*1.3*ss;
      for(int i=0;i<8;i++){ float a=float(i)*.785398; vec2 uv=vUv+vec2(cos(a),sin(a))*rr/res;
        vec4 m2=texture2D(tMask,uv); if(m2.r>.5 && texture2D(tMaskDepth,uv).r<=dS+.0007) hit=1.; } }
    c=mix(c,vec3(.102,.039,.18),hit*.96);
  }
  c=tone(c)*vig(.2);
  gl_FragColor=vec4(c,1.);
}`;
