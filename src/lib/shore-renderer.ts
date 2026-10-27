export interface ShoreRenderer { resize(width:number,height:number):void; draw(seconds:number,shore:number):void; destroy():void; }
// Animate the supplied photograph, never the horizon or the whole camera frame.
// The image remains an unchanged asset. Cover overscan excludes screenshot chrome.
export function createShoreRenderer(canvas:HTMLCanvasElement,image:HTMLImageElement):ShoreRenderer {
  const gl=canvas.getContext('webgl',{alpha:false,antialias:false,depth:false,preserveDrawingBuffer:false,powerPreference:'low-power'});
  if(!gl)return photographFallback(canvas,image);
  const vertex=`attribute vec2 position;void main(){gl_Position=vec4(position,0.0,1.0);}`;
  const fragment=`precision highp float;
uniform sampler2D photograph;
uniform vec2 resolution;
uniform vec2 imageSize;
uniform float seconds;
uniform float shoreline;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){return .57*noise(p)+.28*noise(p*2.03+4.1)+.15*noise(p*4.07+9.3);}
vec2 imageUV(vec2 uv){float cover=max(resolution.x/imageSize.x,resolution.y/imageSize.y)*1.12;vec2 visible=resolution/(imageSize*cover);return (uv-.5)*visible+.5;}
vec3 photo(vec2 uv){return texture2D(photograph,imageUV(uv)).rgb;}
void main(){
  vec2 uv=vec2(gl_FragCoord.x/resolution.x,1.0-gl_FragCoord.y/resolution.y);
  float depth=clamp((uv.y-.18)/.38,0.,1.);
  float water=smoothstep(.185,.24,uv.y)*(1.-smoothstep(.525,.57,uv.y));
  float stableIce=smoothstep(.55,.75,uv.x)*(1.-smoothstep(.28,.33,uv.y));
  water*=1.-.94*stableIce;
  float ripple=sin(uv.y*175.-seconds*1.45+sin(uv.x*19.+seconds*.22)*1.2);
  float cross=sin(uv.y*279.-uv.x*17.-seconds*1.05);
  vec2 displacement=vec2((ripple*.0009+cross*.00045)*depth,(ripple*.00065+cross*.00035)*depth)*water;
  float advance=clamp((shoreline-.545)/.25,0.,1.);
  // Move the photograph's own foam by a few pixels. Keep its real details,
  // instead of drawing an artificial flat sheet or a uniform white wave line.
  float swash=smoothstep(.46,.515,uv.y)*(1.-smoothstep(.59,.67,uv.y));
  float profile=.72+.28*noise(vec2(uv.x*6.4,2.1));
  displacement.y-=advance*.016*swash*profile;
  displacement.x+=sin(uv.x*22.+seconds*.5)*.0005*swash;
  vec3 base=photo(uv+displacement);
  float wetBand=smoothstep(.55,.60,uv.y)*(1.-smoothstep(.79,.83,uv.y));
  float retreat=smoothstep(2.3,4.8,seconds);
  base=mix(base,base*vec3(.97,.99,1.01),wetBand*retreat*.10);
  gl_FragColor=vec4(base,1.);
}`;
  function shader(type:number,source:string){const result=gl!.createShader(type)!;gl!.shaderSource(result,source);gl!.compileShader(result);if(!gl!.getShaderParameter(result,gl!.COMPILE_STATUS))throw new Error('Shore renderer unavailable');return result;}
  let program:WebGLProgram|null=null,buffer:WebGLBuffer|null=null,texture:WebGLTexture|null=null;
  try{
    const vs=shader(gl.VERTEX_SHADER,vertex),fs=shader(gl.FRAGMENT_SHADER,fragment);
    program=gl.createProgram()!;gl.attachShader(program,vs);gl.attachShader(program,fs);gl.linkProgram(program);gl.deleteShader(vs);gl.deleteShader(fs);
    if(!gl.getProgramParameter(program,gl.LINK_STATUS))throw new Error('Shore renderer unavailable');
    gl.useProgram(program);buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,buffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    const position=gl.getAttribLocation(program,'position');gl.enableVertexAttribArray(position);gl.vertexAttribPointer(position,2,gl.FLOAT,false,0,0);
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,image);
    const resolution=gl.getUniformLocation(program,'resolution'),time=gl.getUniformLocation(program,'seconds'),shore=gl.getUniformLocation(program,'shoreline');
    gl.uniform1i(gl.getUniformLocation(program,'photograph'),0);gl.uniform2f(gl.getUniformLocation(program,'imageSize'),image.naturalWidth,image.naturalHeight);
    return {
      resize(width,height){const d=Math.min(devicePixelRatio||1,1.4);canvas.width=Math.round(width*d);canvas.height=Math.round(height*d);gl.viewport(0,0,canvas.width,canvas.height);gl.uniform2f(resolution,canvas.width,canvas.height);},
      draw(seconds,edge){gl.uniform1f(time,seconds);gl.uniform1f(shore,edge);gl.drawArrays(gl.TRIANGLES,0,6);},
      destroy(){gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);},
    };
  }catch{
    gl.deleteTexture(texture);gl.deleteBuffer(buffer);gl.deleteProgram(program);
    // A canvas cannot switch context types; use an adjacent 2D canvas on shader failure.
    const replacement=document.createElement('canvas');replacement.className=canvas.className;replacement.id=canvas.id;canvas.replaceWith(replacement);return photographFallback(replacement,image);
  }
}
function photographFallback(canvas:HTMLCanvasElement,image:HTMLImageElement):ShoreRenderer{
  const ctx=canvas.getContext('2d');let width=0,height=0,scale=1,left=0,top=0;
  return {
    resize(w,h){width=w;height=h;const d=Math.min(devicePixelRatio||1,1.4);canvas.width=Math.round(w*d);canvas.height=Math.round(h*d);ctx?.setTransform(d,0,0,d,0,0);scale=Math.max(w/image.naturalWidth,h/image.naturalHeight)*1.12;left=(w-image.naturalWidth*scale)/2;top=(h-image.naturalHeight*scale)/2;},
    draw(seconds,shore){
      if(!ctx)return;ctx.drawImage(image,left,top,image.naturalWidth*scale,image.naturalHeight*scale);
      const smooth=(a:number,b:number,v:number)=>{const x=Math.max(0,Math.min(1,(v-a)/(b-a)));return x*x*(3-2*x);};
      const advance=Math.max(0,Math.min(1,(shore-.545)/.25));
      for(let y=height*.24;y<height*.67;y+=3){const p=y/height,water=1-smooth(.525,.57,p),shift=Math.sin(y*.21-seconds*1.4)*water*.8,swash=smooth(.46,.515,p)*(1-smooth(.59,.67,p)),flow=advance*height*.016*swash;ctx.drawImage(image,-left/scale,(y-top-flow)/scale,width/scale,3/scale,shift,y,width,3);}
    },destroy(){},
  };
}
