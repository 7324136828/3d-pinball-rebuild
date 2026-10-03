// Native Space Cadet integration and continuous swept collisions, translated to JavaScript.
// MIT attribution is recorded in web-pure/PROVENANCE.md.
import {f,vec,copy,maths,NO_HIT} from './math.js';
export {maths,maths as math} from './math.js';
const active=(flag,component)=>typeof flag==='function'?!!flag():flag===undefined?!!component.ActiveFlag:typeof flag==='object'?!!flag.value:!!flag;
const append=(list,item)=>{if(!list)return; if(list.Add)list.Add(item);else if(!list.includes(item))list.push(item);};
export class Ball {
  constructor(table,radius=.3) {
    this.PinballTable=table;this.Offset=f(radius);this.Position=vec(0,0,radius);this.Acceleration=vec();
    this.InvAcceleration=vec(NO_HIT,NO_HIT);this.RampFieldForce=vec();this.CollisionOffset=vec();
    this.ActiveFlag=1;this.CollisionComp=null;this.EdgeCollisionCount=0;this.Collisions=[];this.TimeDelta=0;this.TimeNow=0;
    this.FieldFlag=1;this.CollisionFlag=0;this.Speed=0;this.RayMaxDistance=0;this.MessageField=0;
  }
  not_again(edge){if(this.EdgeCollisionCount<5)this.Collisions[this.EdgeCollisionCount++]=edge;}
  already_hit(edge){return this.Collisions.slice(0,this.EdgeCollisionCount).includes(edge);}
  Message(code,value=0){if(code===1024){this.Position=vec(0,0,this.Offset);this.CollisionComp=null;this.ActiveFlag=0;this.CollisionFlag=0;this.FieldFlag=1;this.Acceleration=vec();this.Speed=0;this.RayMaxDistance=0;this.EdgeCollisionCount=0;}return 0;}
  Repaint(){if(this.CollisionFlag)this.Position.Z=f(f(f(this.CollisionOffset.X*this.Position.X)+f(this.CollisionOffset.Y*this.Position.Y))+f(this.Offset+this.CollisionOffset.Z));}
  static throw_ball(ball,acceleration,angleMult,speedMult1,speedMult2) {
    const random=()=>ball.PinballTable.random?ball.PinballTable.random():Math.random();
    ball.CollisionComp=null;ball.Acceleration=copy(acceleration);
    let rnd=f(random());maths.RotateVector(ball.Acceleration,f(f(1-f(rnd+rnd))*angleMult));
    rnd=f(random());ball.Speed=f(f(f(1-f(rnd+rnd))*f(speedMult1*speedMult2))+speedMult1);
  }
}
export const throw_ball=Ball.throw_ball;
export class Edge {
  constructor(component,flag,group=1){this.CollisionComponent=component;this.ActiveFlag=flag;this.CollisionGroup=group;this.ProcessedFlag=0;this.WallValue=null;}
  get active(){return active(this.ActiveFlag,this.CollisionComponent);}
  place_in_grid(){if(this.manager)this.manager.place(this);}
}
export class LineEdge extends Edge {
  constructor(component,flag,group,start,end){super(component,flag,group);this.X0=f(start.X);this.Y0=f(start.Y);this.X1=f(end.X);this.Y1=f(end.Y);this.Line=maths.line_init({},this.X0,this.Y0,this.X1,this.Y1);}
  Offset(offset){const ox=f(offset*this.Line.PerpendicularL.X),oy=f(offset*this.Line.PerpendicularL.Y);this.X0=f(this.X0+ox);this.Y0=f(this.Y0+oy);this.X1=f(this.X1+ox);this.Y1=f(this.Y1+oy);maths.line_init(this.Line,this.X0,this.Y0,this.X1,this.Y1);}
  FindCollisionDistance(ray){return maths.ray_intersect_line(ray,this.Line);}
  EdgeCollision(ball,distance){this.CollisionComponent.Collision(ball,copy(this.Line.RayIntersect),copy(this.Line.PerpendicularL),distance,this);}
}
export class CircleEdge extends Edge {
  constructor(component,flag,group,center,radius){super(component,flag,group);this.Circle={Center:copy(center),RadiusSq:f(radius*radius)};}
  FindCollisionDistance(ray){return maths.ray_intersect_circle(ray,this.Circle);}
  EdgeCollision(ball,distance){const position=vec(f(distance*ball.Acceleration.X)+ball.Position.X,f(distance*ball.Acceleration.Y)+ball.Position.Y);const direction=vec(position.X-this.Circle.Center.X,position.Y-this.Circle.Center.Y);maths.normalize_2d(direction);this.CollisionComponent.Collision(ball,position,direction,distance,this);}
}
export class EdgeManager {
  constructor(bounds={minX:-8,minY:-14,width:16,length:29}) {
    this.X=bounds.minX??bounds.X??-8;this.Y=bounds.minY??bounds.Y??-14;this.MaxBoxX=10;this.MaxBoxY=15;
    this.AdvanceX=f((bounds.width??((bounds.maxX??8)-this.X))/10);this.AdvanceY=f((bounds.length??bounds.height??((bounds.maxY??15)-this.Y))/15);
    this.AdvanceXInv=f(1/this.AdvanceX);this.AdvanceYInv=f(1/this.AdvanceY);this.edges=[];this.fields=[];
    this.BoxArray=Array.from({length:150},()=>({EdgeList:[],FieldList:[]}));
  }
  box_x(x){return Math.max(0,Math.min(9,Math.floor(f(f(x-this.X)*this.AdvanceXInv))));}
  box_y(y){return Math.max(0,Math.min(14,Math.floor(f(f(y-this.Y)*this.AdvanceYInv))));}
  add_edge_to_box(x,y,edge){const list=this.BoxArray[x+y*10]?.EdgeList;if(list&&!list.includes(edge))list.push(edge);}
  add_field_to_box(x,y,field){const list=this.BoxArray[x+y*10]?.FieldList;if(list&&!list.includes(field))list.push(field);}
  // Native grid traversal: step to the next X/Y boundary; diagonal ties skip the two touching sidecells.
  visitSegment(x0,y0,x1,y1,visit) {
    let x=this.box_x(x0),y=this.box_y(y0);const endX=this.box_x(x1),endY=this.box_y(y1),sx=x1>x0?1:-1,sy=y1>y0?1:-1;
    visit(x,y);let guard=40;
    const dx=x1-x0,dy=y1-y0;
    while((x!==endX||y!==endY)&&guard-->0){
      let tx=Infinity,ty=Infinity;
      if(x!==endX&&dx)tx=(this.X+(x+(sx>0?1:0))*this.AdvanceX-x0)/dx;
      if(y!==endY&&dy)ty=(this.Y+(y+(sy>0?1:0))*this.AdvanceY-y0)/dy;
      if(tx<=ty)x+=sx;if(ty<=tx)y+=sy;visit(x,y);
    }
  }
  square(region,edge=null,field=null) {
    const minX=region.minX,maxX=region.maxX,minY=region.minY,maxY=region.maxY;
    for(let x=this.box_x(minX);x<=this.box_x(maxX);x++)for(let y=this.box_y(minY);y<=this.box_y(maxY);y++){
      if(edge)this.add_edge_to_box(x,y,edge);if(field)this.add_field_to_box(x,y,field);
    }
  }
  circle(circle,edge=null,field=null) {
    const center=circle.Center,radius=Math.sqrt(circle.RadiusSq)+this.AdvanceX*.001,radiusSq=radius*radius;
    for(let x=Math.max(0,this.box_x(center.X-radius)-1);x<=Math.min(9,this.box_x(center.X+radius)+1);x++)
    for(let y=Math.max(0,this.box_y(center.Y-radius)-1);y<=Math.min(14,this.box_y(center.Y+radius)+1);y++){
      const nx=Math.max(this.X+x*this.AdvanceX,Math.min(center.X,this.X+(x+1)*this.AdvanceX));
      const ny=Math.max(this.Y+y*this.AdvanceY,Math.min(center.Y,this.Y+(y+1)*this.AdvanceY));
      if((center.X-nx)**2+(center.Y-ny)**2<=radiusSq){if(edge)this.add_edge_to_box(x,y,edge);if(field)this.add_field_to_box(x,y,field);}
    }
  }
  place(edge) {
    if(edge instanceof LineEdge)this.visitSegment(edge.X0,edge.Y0,edge.X1,edge.Y1,(x,y)=>this.add_edge_to_box(x,y,edge));
    else if(edge instanceof CircleEdge)this.circle(edge.Circle,edge);
    else if(edge.bounds)this.square(edge.bounds,edge);
  }
  addEdge(edge){edge.manager=this;this.edges.push(edge);append(edge.CollisionComponent.EdgeList,edge);this.place(edge);return edge;}
  addLine(component,group,start,end,{offset=0,wallValue=null,activeFlagFn}={}) {
    const edge=new LineEdge(component,activeFlagFn,group,start,end);if(offset)edge.Offset(offset);edge.WallValue=wallValue;return this.addEdge(edge);
  }
  addCircle(component,group,center,radius,{wallValue=null,activeFlagFn}={}){const edge=new CircleEdge(component,activeFlagFn,group,center,radius);edge.WallValue=wallValue;return this.addEdge(edge);}
  installWall(values,component,flag=()=>component.ActiveFlag,group=1,offset=.3,wallValue=null) {
    if(!values?.length)return null;
    const type=Math.floor(values[0])-1,options={offset,wallValue,activeFlagFn:flag};let edge;
    if(type===0)return this.addCircle(component,group,vec(values[1],values[2]),f(offset+values[3]),options);
    if(type===1)return this.addLine(component,group,vec(values[1],values[2]),vec(values[3],values[4]),options);
    let previous=vec(values[type*2-1],values[type*2]);
    for(let i=0;i<type;i++){
      const center=vec(values[1+2*i],values[2+2*i]),end=i>=type-1?vec(values[1],values[2]):vec(values[3+2*i],values[4+2*i]);
      const cross=f(f((center.X-previous.X)*(end.Y-center.Y))-f((end.X-center.X)*(center.Y-previous.Y)));
      if(offset&&((cross>0&&offset>0)||(cross<0&&offset<0)))this.addCircle(component,group,center,f(offset*1.001),options);
      edge=this.addLine(component,group,center,end,options);previous=center;
    }
    return edge;
  }
  addField(component,mask=-1,region,activeFlagFn=()=>component.ActiveFlag) {
    const field={CollisionComp:component,Mask:mask,Flag2Ptr:activeFlagFn};this.fields.push(field);
    if(region?.type==='circle'||region?.radius!==undefined)this.circle({Center:region.center,RadiusSq:region.radius**2},null,field);
    else this.square(region||{minX:this.X,minY:this.Y,maxX:this.X+this.AdvanceX*10,maxY:this.Y+this.AdvanceY*15},null,field);
    return field;
  }
  FieldEffects(ball,destination) {
    const fields=this.BoxArray[this.box_x(ball.Position.X)+10*this.box_y(ball.Position.Y)].FieldList;
    for(let i=fields.length-1;i>=0;i--){const field=fields[i];if(active(field.Flag2Ptr,field.CollisionComp)&&(ball.FieldFlag&field.Mask)){const force=vec();if(field.CollisionComp.FieldEffect(ball,force))maths.vector_add(destination,force);}}
  }
  FindCollisionDistance(ray,ball,out) {
    let distance=NO_HIT,edge=null;const visited=new Set();
    this.visitSegment(ray.Origin.X,ray.Origin.Y,f(f(ray.Direction.X*ray.MaxDistance)+ray.Origin.X),f(f(ray.Direction.Y*ray.MaxDistance)+ray.Origin.Y),(x,y)=>{
      const list=this.BoxArray[x+10*y]?.EdgeList||[];
      for(let i=list.length-1;i>=0;i--){const item=list[i];if(visited.has(item)||!item.active||!(item.CollisionGroup&ray.FieldFlag)||ball.already_hit(item))continue;visited.add(item);const d=item.FindCollisionDistance(ray);if(d<distance){distance=d;edge=item;}}
    });
    if(out)out.edge=edge;return {distance,edge};
  }
}
export class PhysicsWorld {
  constructor(table,{edgeManager=table.edgeManager}={}){this.table=table;this.edgeManager=edgeManager;this.collisionCount=0;}
  step(timeNow,timeDelta){timeNow=f(timeNow);timeDelta=f(timeDelta);
    for(const ball of this.table.BallList){if(!ball.ActiveFlag)continue;
      if(ball.CollisionComp){ball.TimeDelta=timeDelta;ball.CollisionComp.FieldEffect(ball,vec());}
      else {
        if(this.table.ActiveFlag){const force=vec();this.edgeManager.FieldEffects(ball,force);force.X=f(force.X*timeDelta);force.Y=f(force.Y*timeDelta);
          ball.Acceleration.X=f(ball.Speed*ball.Acceleration.X);ball.Acceleration.Y=f(ball.Speed*ball.Acceleration.Y);maths.vector_add(ball.Acceleration,force);ball.Speed=maths.normalize_2d(ball.Acceleration);
          ball.InvAcceleration.X=ball.Acceleration.X===0?NO_HIT:f(1/ball.Acceleration.X);ball.InvAcceleration.Y=ball.Acceleration.Y===0?NO_HIT:f(1/ball.Acceleration.Y);
        }
        let remaining=timeDelta,now=timeNow;
        for(let count=10;remaining>1e-6&&count;count--){const consumed=this.collide(now,remaining,ball);remaining=f(remaining-consumed);now=f(now+consumed);}
      }
      ball.Repaint();
    }
  }
  collide(timeNow,timeDelta,ball){if(ball.ActiveFlag&&!ball.CollisionComp){
    ball.Speed=Math.min(f(ball.Offset*200),ball.Speed);ball.TimeDelta=timeDelta;ball.TimeNow=timeNow;ball.RayMaxDistance=f(timeDelta*ball.Speed);
    const ray={Origin:copy(ball.Position),Direction:copy(ball.Acceleration),MaxDistance:ball.RayMaxDistance,MinDistance:f(.002),FieldFlag:ball.FieldFlag,TimeNow:timeNow,TimeDelta:timeDelta};
    const {distance,edge}=this.edgeManager.FindCollisionDistance(ray,ball);ball.EdgeCollisionCount=0;
    if(distance>=NO_HIT){ball.RayMaxDistance=f(timeDelta*ball.Speed);maths.vector_add(ball.Position,vec(f(ball.RayMaxDistance*ball.Acceleration.X),f(ball.RayMaxDistance*ball.Acceleration.Y)));}
    else {this.collisionCount++;edge.EdgeCollision(ball,distance);if(ball.Speed>1e-9)return f(Math.abs(distance/ball.Speed));}
  }return timeDelta;}
}
export function installRamp(component,data,manager=component.PinballTable.edgeManager) {
  const table=component.PinballTable,mult=table.GravityDirVectMult||25;
  const planes=data.planes.map(p=>({BallCollisionOffset:vec(...p.coefficients),V1:vec(...p.vertices[0]),V2:vec(...p.vertices[1]),V3:vec(...p.vertices[2]),GravityAngle1:p.gravityAngles[0],GravityAngle2:p.gravityAngles[1],FieldForce:vec(Math.cos(p.gravityAngles[1])*Math.sin(p.gravityAngles[0])*mult,Math.sin(p.gravityAngles[1])*Math.sin(p.gravityAngles[0])*mult)}));
  component.RampPlane=planes;component.RampPlaneCount=planes.length;component.CollisionGroup=data.collisionGroup;
  const first=data.entry,a=data.exits[0],b=data.exits[1];
  component.Line1=manager.addLine(component,1<<Math.floor(first[0]),vec(first[4],first[5]),vec(first[2],first[3]));
  const closest1=maths.find_closest_edge(planes,planes.length,a.slice(3,7)),closest2=maths.find_closest_edge(planes,planes.length,b.slice(3,7));
  component.Line2=manager.addLine(component,data.collisionGroup,closest1.lineStart,closest1.lineEnd);
  component.Line3=manager.addLine(component,data.collisionGroup,closest2.lineStart,closest2.lineEnd);
  component.Wall1PointFirst=1<<Math.floor(a[0]);component.Wall1PointLast=a[7];component.Wall2PointFirst=1<<Math.floor(b[0]);component.Wall2PointLast=b[7];
  let minX=NO_HIT,minY=NO_HIT,maxX=-NO_HIT,maxY=-NO_HIT;
  for(const plane of planes){const points=[plane.V1,plane.V2,plane.V3];
    minX=Math.min(...points.map(p=>p.X),minX);
    // Preserve original ramp field grid bounds calculations, including their documented X-min typo.
    minY=Math.min(...points.map(p=>p.Y),minX);maxX=Math.max(...points.map(p=>p.X),minX);maxY=Math.max(...points.map(p=>p.Y),minX);
    for(let i=0;i<3;i++){const p=points[i],q=points[(i+1)%3];let group=data.collisionGroup;
      if(p===closest1.lineEnd&&q===closest1.lineStart)group=a[1]?component.Wall1PointFirst:0;
      else if(p===closest2.lineEnd&&q===closest2.lineStart)group=b[1]?component.Wall2PointFirst:0;
      if(group)manager.addLine(component,group,p,q,{wallValue:plane});
    }
  }
  component.Field=manager.addField(component,data.collisionGroup,{minX,minY,maxX,maxY});return component;
}
export {Ball as TBall,LineEdge as TLine,CircleEdge as TCircle,Edge as TEdgeSegment,EdgeManager as TEdgeManager};

export class FlipperEdge extends Edge {
  constructor(component,flag,group,table,origin,tipRest,tipRaised,extendTime,retractTime,collisionMult,elasticity,smoothness) {
    super(component,flag,group);
    Object.assign(this,{Elasticity:elasticity,Smoothness:smoothness,BmpCoef1:extendTime,BmpCoef2:retractTime,CollisionMult:collisionMult});
    this.T1Src=copy(tipRest);this.T2Src=copy(tipRaised);this.RotOrigin=vec(origin.X,origin.Y);
    this.CirclebaseRadius=f(origin.Z+table.CollisionCompOffset);this.CirclebaseRadiusMSq=f((this.CirclebaseRadius*1.01)**2);this.CirclebaseRadiusSq=f(this.CirclebaseRadius**2);
    this.CircleT1Radius=f(tipRest.Z+table.CollisionCompOffset);this.CircleT1RadiusMSq=f((this.CircleT1Radius*1.01)**2);this.CircleT1RadiusSq=f(this.CircleT1Radius**2);
    const dir1=vec(tipRest.X-origin.X,tipRest.Y-origin.Y),dir2=vec(tipRaised.X-origin.X,tipRaised.Y-origin.Y);maths.normalize_2d(dir1);maths.normalize_2d(dir2);
    this.AngleMax=f(Math.acos(Math.max(-1,Math.min(1,maths.DotProduct(dir1,dir2)))));if(maths.cross(dir1,dir2).Z<0)this.AngleMax=f(-this.AngleMax);
    this.FlipperFlag=0;this.Angle1=0;this.Angle2=0;
    this.A2Src=vec(f(-dir1.Y*this.CirclebaseRadius)+origin.X,f(dir1.X*this.CirclebaseRadius)+origin.Y);
    this.A1Src=vec(f(-dir1.Y*this.CircleT1Radius)+tipRest.X,f(dir1.X*this.CircleT1Radius)+tipRest.Y);
    this.B1Src=vec(f(dir1.Y*this.CirclebaseRadius)+origin.X,f(-dir1.X*this.CirclebaseRadius)+origin.Y);
    this.B2Src=vec(f(dir1.Y*this.CircleT1Radius)+tipRest.X,f(-dir1.X*this.CircleT1Radius)+tipRest.Y);
    if(this.AngleMax<0){[this.A1Src,this.B1Src]=[this.B1Src,this.A1Src];[this.A2Src,this.B2Src]=[this.B2Src,this.A2Src];}
    const reach=f(maths.Distance(tipRest,this.RotOrigin)+f(table.CollisionCompOffset+tipRest.Z));this.DistanceDivSq=f(reach*reach);
    const distance=maths.Distance(tipRest,tipRaised);this.CollisionTimeAdvance=f(Math.min(extendTime,retractTime)/f(f(distance/this.CircleT1Radius)+f(distance/this.CircleT1Radius)));
    this.EdgeCollisionFlag=0;this.InputTime=0;this.CollisionFlag1=0;this.CollisionFlag2=0;this.AngleStopTime=0;this.AngleMult=0;
    this.NextBallPosition=vec();this.CollisionDirection=vec();this.CollisionLinePerp=vec();
    this.bounds={minX:Math.min(origin.X-this.CirclebaseRadius,tipRest.X-this.CircleT1Radius,tipRaised.X-this.CircleT1Radius),maxX:Math.max(origin.X+this.CirclebaseRadius,tipRest.X+this.CircleT1Radius,tipRaised.X+this.CircleT1Radius),minY:Math.min(origin.Y-this.CirclebaseRadius,tipRest.Y-this.CircleT1Radius,tipRaised.Y-this.CircleT1Radius),maxY:Math.max(origin.Y+this.CirclebaseRadius,tipRest.Y+this.CircleT1Radius,tipRaised.Y+this.CircleT1Radius)};
    this.set_control_points(0);this.build_edges_in_motion();
  }
  flipper_angle(timeNow) {
    if(!this.FlipperFlag)return this.Angle1;
    let angle=Math.abs(f(f((this.Angle1-this.Angle2)/this.AngleMax)*this.AngleMult));
    angle=angle>=1e-7?f(f(timeNow-this.InputTime)/angle):1;
    angle=Math.min(1,Math.max(0,angle));if(this.FlipperFlag===2)angle=f(1-angle);return f(angle*this.AngleMax);
  }
  SetMotion(code,timeNow) {
    if(code===1){this.Angle2=this.flipper_angle(timeNow);this.Angle1=this.AngleMax;this.AngleMult=this.BmpCoef1;}
    else if(code===2){this.Angle2=this.flipper_angle(timeNow);this.Angle1=0;this.AngleMult=this.BmpCoef2;}
    else if(code===1024){this.FlipperFlag=0;this.Angle1=0;return;}
    if(!this.FlipperFlag)this.InputTime=timeNow;this.FlipperFlag=code;this.AngleStopTime=f(this.AngleMult+this.InputTime);
  }
  set_control_points(timeNow) {
    const angle=this.flipper_angle(timeNow),sin=f(Math.sin(angle)),cos=f(Math.cos(angle));
    for(const name of ['A1','A2','B1','B2','T1'])this[name]=maths.RotatePt(copy(this[name+'Src']),sin,cos,this.RotOrigin);
  }
  build_edges_in_motion() {
    this.lineA=maths.line_init({},this.A1.X,this.A1.Y,this.A2.X,this.A2.Y);
    this.lineB=maths.line_init({},this.B1.X,this.B1.Y,this.B2.X,this.B2.Y);
    this.circlebase={Center:copy(this.RotOrigin),RadiusSq:this.CirclebaseRadiusSq};this.circleT1={Center:copy(this.T1),RadiusSq:this.CircleT1RadiusSq};
  }
  distance_to_flipper(ray,out) {
    let distance=NO_HIT,type=-1;
    const shapes=[[0,this.lineA],[2,this.circlebase],[3,this.circleT1],[1,this.lineB]];
    for(const [id,shape]of shapes){const d=id<2?maths.ray_intersect_line(ray,shape):maths.ray_intersect_circle(ray,shape);if(d<distance){distance=d;type=id;}}
    if(!out||distance>=NO_HIT)return distance;
    if(type<2){const line=type===0?this.lineA:this.lineB;out.Origin=copy(line.RayIntersect);out.Direction=copy(line.PerpendicularL);}
    else {out.Origin=vec(f(distance*ray.Direction.X)+ray.Origin.X,f(distance*ray.Direction.Y)+ray.Origin.Y);const center=type===2?this.circlebase.Center:this.circleT1.Center;out.Direction=vec(out.Origin.X-center.X,out.Origin.Y-center.Y);maths.normalize_2d(out.Direction);}
    return distance;
  }
  is_ball_inside(x,y) {
    const points=[this.A1,this.A2,this.B1,this.B2];
    const inside=points.every((p,i)=>{const q=points[(i+1)%4];return f(f((q.X-p.X)*(y-p.Y))-f((q.Y-p.Y)*(x-p.X)))>=0;});
    if(!inside&&maths.Distance_Squared(vec(x,y),this.RotOrigin)>this.CirclebaseRadiusSq&&maths.Distance_Squared(vec(x,y),this.T1)>=this.CircleT1RadiusSq)return 0;
    const lr=this.AngleMax<0?-1:1;
    const point=this.FlipperFlag===1?(this.AngleMax<0?this.B1:this.B2):this.FlipperFlag===2?(this.AngleMax<0?this.A2:this.A1):this.T1;
    return f(f(f((y-point.Y)*(this.RotOrigin.X-point.X))-f((x-point.X)*(this.RotOrigin.Y-point.Y)))*lr)<0?4:5;
  }
  saveCollision(out,ray,nudge=false){if(!out.Origin)return;this.NextBallPosition=copy(out.Origin);this.CollisionDirection=copy(out.Direction);if(nudge){this.NextBallPosition.X=f(this.NextBallPosition.X-f(ray.Direction.X*1e-5));this.NextBallPosition.Y=f(this.NextBallPosition.Y-f(ray.Direction.Y*1e-5));}}
  FindCollisionDistance(ray) {
    if(ray.TimeNow>this.AngleStopTime)this.FlipperFlag=0;
    if(this.EdgeCollisionFlag){this.EdgeCollisionFlag=0;return NO_HIT;}
    const source={Origin:copy(ray.Origin),Direction:copy(ray.Direction),MaxDistance:ray.MaxDistance,MinDistance:ray.MinDistance},out={};
    if(!this.FlipperFlag){
      this.CollisionFlag1=0;this.CollisionFlag2=0;this.set_control_points(ray.TimeNow);this.build_edges_in_motion();
      const inside=this.is_ball_inside(ray.Origin.X,ray.Origin.Y);
      if(!inside){const d=this.distance_to_flipper(source,out);this.saveCollision(out,source,d===0);return d;}
      if(maths.Distance_Squared(ray.Origin,this.RotOrigin)>=this.CirclebaseRadiusMSq){
        if(maths.Distance_Squared(ray.Origin,this.T1)>=this.CircleT1RadiusMSq){source.Direction=copy(inside===4?this.lineA.PerpendicularL:this.lineB.PerpendicularL);source.Direction.X=-source.Direction.X;source.Direction.Y=-source.Direction.Y;}
        else {source.Direction=vec(this.T1.X-ray.Origin.X,this.T1.Y-ray.Origin.Y);maths.normalize_2d(source.Direction);}
      }else {source.Direction=vec(this.RotOrigin.X-ray.Origin.X,this.RotOrigin.Y-ray.Origin.Y);maths.normalize_2d(source.Direction);}
      source.Origin=vec(ray.Origin.X-f(source.Direction.X*5),ray.Origin.Y-f(source.Direction.Y*5));source.MaxDistance=f(ray.MaxDistance+10);
      if(this.distance_to_flipper(source,out)>=NO_HIT){source.Direction=vec(this.RotOrigin.X-ray.Origin.X,this.RotOrigin.Y-ray.Origin.Y);maths.normalize_2d(source.Direction);source.Origin=vec(ray.Origin.X-f(source.Direction.X*5),ray.Origin.Y-f(source.Direction.Y*5));if(this.distance_to_flipper(source,out)>=NO_HIT)return NO_HIT;}
      this.saveCollision(out,source,true);return 0;
    }
    let x=ray.Origin.X,y=ray.Origin.Y,time=ray.TimeNow;
    const dx=f(ray.Direction.X*this.CollisionTimeAdvance),dy=f(ray.Direction.Y*this.CollisionTimeAdvance),max=f(ray.MaxDistance*this.CollisionTimeAdvance),stop=f(ray.TimeNow+ray.TimeDelta);
    for(let guard=0;time<stop&&guard<1000;guard++){
      this.set_control_points(time);this.build_edges_in_motion();const inside=this.is_ball_inside(x,y);
      if(inside){
        let line;
        if(this.FlipperFlag===1&&inside!==5)line=this.lineA.PerpendicularL;
        else if(this.FlipperFlag===2&&inside!==4)line=this.lineB.PerpendicularL;
        else {
          this.CollisionFlag1=0;this.CollisionFlag2=1;source.Direction=vec(this.RotOrigin.X-x,this.RotOrigin.Y-y);maths.normalize_2d(source.Direction);
          source.Origin=vec(x-f(source.Direction.X*5),y-f(source.Direction.Y*5));source.MaxDistance=f(ray.MaxDistance+10);
          if(this.distance_to_flipper(source,out)>=NO_HIT){this.NextBallPosition=vec(x,y);this.CollisionDirection=vec(-source.Direction.X,-source.Direction.Y);return 0;}
          this.saveCollision(out,source,true);return 0;
        }
        this.CollisionLinePerp=copy(line);this.CollisionFlag2=0;this.CollisionFlag1=1;source.Direction=vec(-line.X,-line.Y);source.MinDistance=f(.002);
        source.Origin=vec(ray.Origin.X-f(source.Direction.X*5),ray.Origin.Y-f(source.Direction.Y*5));source.MaxDistance=f(ray.MaxDistance+10);
        const distance=this.distance_to_flipper(source,out);if(distance>=NO_HIT)return NO_HIT;this.saveCollision(out,source,true);return 0;
      }
      source.Direction=copy(ray.Direction);source.MinDistance=ray.MinDistance;source.Origin=copy(ray.Origin);source.MaxDistance=max;
      const distance=this.distance_to_flipper(source,out);
      if(distance<NO_HIT){this.saveCollision(out,source,true);const line=this.FlipperFlag===2?this.lineB.PerpendicularL:this.lineA.PerpendicularL;this.CollisionFlag1=this.FlipperFlag===2?this.AngleMax<=0:this.AngleMax>0;this.CollisionLinePerp=copy(line);return distance;}
      time=f(time+this.CollisionTimeAdvance);x=f(x+dx);y=f(y+dy);
    }
    return NO_HIT;
  }
  EdgeCollision(ball,distance) {
    this.EdgeCollisionFlag=1;
    const dist=maths.Distance_Squared(this.NextBallPosition,this.RotOrigin);
    if(!this.FlipperFlag||!this.CollisionFlag2||this.CollisionFlag1){
      let boost=0;
      if(this.CollisionFlag1&&this.circlebase.RadiusSq*1.01<dist){const velocity=f(f(Math.sqrt(f(dist/this.DistanceDivSq)))*f(Math.abs(this.AngleMax)/this.AngleMult));const dot=maths.DotProduct(this.CollisionLinePerp,this.CollisionDirection);boost=f((dot>=0?f(dot*velocity):0)*this.CollisionMult);}
      maths.basic_collision(ball,this.NextBallPosition,this.CollisionDirection,this.Elasticity,this.Smoothness,boost<=0?NO_HIT:-1,boost);
    }else {
      const elasticity=this.circlebase.RadiusSq*1.01<dist?f(f(1-Math.sqrt(f(dist/this.DistanceDivSq)))*this.Elasticity):this.Elasticity;
      maths.basic_collision(ball,this.NextBallPosition,this.CollisionDirection,elasticity,this.Smoothness,NO_HIT,0);
    }
  }
}
export {FlipperEdge as TFlipperEdge};
