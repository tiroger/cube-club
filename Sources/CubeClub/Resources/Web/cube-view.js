(function(root) {
  const {FACES,COLORS}=CubeClubCore;
  const BASES={
    U:{n:[0,1,0],right:[1,0,0],down:[0,0,1]},
    R:{n:[1,0,0],right:[0,0,-1],down:[0,-1,0]},
    F:{n:[0,0,1],right:[1,0,0],down:[0,-1,0]},
    D:{n:[0,-1,0],right:[1,0,0],down:[0,0,-1]},
    L:{n:[-1,0,0],right:[0,0,1],down:[0,-1,0]},
    B:{n:[0,0,-1],right:[-1,0,0],down:[0,-1,0]}
  };
  function rotate(p,axis,a) {
    const c=Math.cos(a),s=Math.sin(a),[x,y,z]=p;
    if(axis===0) return [x,y*c-z*s,y*s+z*c];
    if(axis===1) return [x*c+z*s,y,-x*s+z*c];
    return [x*c-y*s,x*s+y*c,z];
  }
  function faceletGeometry(index) {
    const face=FACES[Math.floor(index/9)], row=Math.floor(index%9/3)-1,col=index%3-1;
    const b=BASES[face];
    const point=(u,v)=>b.n.map((n,i)=>n*1.5+b.right[i]*u+b.down[i]*v);
    return {face,normal:b.n,center:point(col,row),points:[point(col-.47,row-.47),point(col+.47,row-.47),point(col+.47,row+.47),point(col-.47,row+.47)]};
  }
  class CubeView {
    constructor(canvas,cube,options={}) {
      this.canvas=canvas;this.ctx=canvas.getContext('2d');this.cube=cube;this.yaw=-.58;this.pitch=.48;this.labels=true;this.animation=null;this.disposed=false;
      this.drag=null;
      this.resizeObserver=new ResizeObserver(()=>this.draw());this.resizeObserver.observe(canvas);
      canvas.addEventListener('pointerdown',e=>{this.drag={x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);});
      canvas.addEventListener('pointermove',e=>{if(!this.drag)return;this.yaw+=(e.clientX-this.drag.x)*.008;this.pitch=Math.max(-1.45,Math.min(1.45,this.pitch+(e.clientY-this.drag.y)*.008));this.drag={x:e.clientX,y:e.clientY};this.draw();});
      canvas.addEventListener('pointerup',()=>this.drag=null);canvas.addEventListener('pointercancel',()=>this.drag=null);
      canvas.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();if(e.key==='Home')this.home();else{this.yaw+=(e.key==='ArrowLeft'?-.2:e.key==='ArrowRight'?.2:0);this.pitch=Math.max(-1.45,Math.min(1.45,this.pitch+(e.key==='ArrowUp'?-.2:e.key==='ArrowDown'?.2:0)));this.draw();}});
      this.draw();
    }
    setCube(cube) {this.cube=cube;this.animation=null;this.draw();}
    home() {this.yaw=-.58;this.pitch=.48;this.draw();}
    destroy() {this.disposed=true;this.resizeObserver.disconnect();}
    async turn(move,duration=650) {
      if(this.animation || this.disposed)return;
      const normal=BASES[move[0]].n, axis=normal.findIndex(v=>v!==0),sign=normal[axis];
      const amount=move.endsWith('2')?2:move.endsWith("'")?-1:1;
      const start=performance.now();
      return new Promise(resolve=>{
        const frame=now=>{
          if(this.disposed){resolve();return;}
          const t=Math.min(1,(now-start)/Math.max(duration,1)),ease=t*t*(3-2*t);
          this.animation={axis,sign,angle:-sign*amount*Math.PI/2*ease};this.draw();
          if(t<1)requestAnimationFrame(frame);else{this.cube.move(move);this.animation=null;this.draw();resolve();}
        };requestAnimationFrame(frame);
      });
    }
    draw() {
      if(this.disposed)return;
      const c=this.canvas,ctx=this.ctx,w=c.clientWidth,h=c.clientHeight;
      if(!w||!h)return;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      if(c.width!==Math.round(w*dpr)||c.height!==Math.round(h*dpr)){c.width=Math.round(w*dpr);c.height=Math.round(h*dpr);}
      ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      const scale=Math.min(w/6.4,h/5.6),view=p=>rotate(rotate(p,1,this.yaw),0,this.pitch);
      const project=p=>{const v=view(p),perspective=8/(8-v[2]);return [w/2+v[0]*scale*perspective,h/2-v[1]*scale*perspective,v[2]];};
      ctx.save();ctx.translate(w/2,h*.88);ctx.scale(1,.2);const grd=ctx.createRadialGradient(0,0,0,0,0,scale*1.7);grd.addColorStop(0,'#193f3430');grd.addColorStop(1,'#193f3400');ctx.fillStyle=grd;ctx.fillRect(-scale*2,-scale*2,scale*4,scale*4);ctx.restore();
      const facelets=this.cube.asString();const polygons=[];
      for(let i=0;i<54;i++){
        const geo=faceletGeometry(i);let points=geo.points,normal=geo.normal,center=geo.center;
        if(this.animation && center[this.animation.axis]*this.animation.sign>.9){const a=this.animation;points=points.map(p=>rotate(p,a.axis,a.angle));normal=rotate(normal,a.axis,a.angle);center=rotate(center,a.axis,a.angle);}
        const n=view(normal),v=view(center);if(n[0]*(-v[0])+n[1]*(-v[1])+n[2]*(8-v[2])<=0)continue;
        polygons.push({points:points.map(project),depth:project(center)[2],color:COLORS[facelets[i]],center:project(center),label:i%9===4?geo.face:null});
      }
      polygons.sort((a,b)=>a.depth-b.depth);
      for(const poly of polygons){
        const p=poly.points;ctx.beginPath();
        // Rounded polygon corners keep the cube soft while preserving real face geometry.
        for(let i=0;i<4;i++){const prev=p[(i+3)%4],cur=p[i],next=p[(i+1)%4];const a=[cur[0]+(prev[0]-cur[0])*.085,cur[1]+(prev[1]-cur[1])*.085],b=[cur[0]+(next[0]-cur[0])*.085,cur[1]+(next[1]-cur[1])*.085];if(i===0)ctx.moveTo(...a);else ctx.lineTo(...a);ctx.quadraticCurveTo(cur[0],cur[1],...b);}ctx.closePath();ctx.lineJoin='round';ctx.lineWidth=scale*.075;ctx.strokeStyle='#25493f';ctx.stroke();ctx.fillStyle=poly.color;ctx.fill();
        if(this.labels&&poly.label){ctx.font=`700 ${Math.round(scale*.24)}px ui-rounded, system-ui`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillStyle='#1d443dc0';ctx.fillText(poly.label,poly.center[0],poly.center[1]);}
      }
    }
  }
  root.CubeGeometry={BASES,faceletGeometry,rotate};root.CubeView=CubeView;
})(typeof globalThis!=='undefined'?globalThis:this);
