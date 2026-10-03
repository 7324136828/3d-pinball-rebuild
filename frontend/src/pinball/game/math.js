// Equations ported from SpaceCadetPinball maths.cpp (MIT); see LICENSE and PROVENANCE.
export const NO_HIT = 1e9;
export const f = Math.fround;
export const vec = (X=0,Y=0,Z=0) => ({X:f(X),Y:f(Y),Z:f(Z)});
export const copy = a => vec(a.X,a.Y,a.Z || 0);
const sq = a => f(a*a);
export function normalize_2d(a) {
  const mag=f(Math.sqrt(f(sq(a.X)+sq(a.Y))));
  if(mag) { a.X=f(f(1/mag)*a.X); a.Y=f(f(1/mag)*a.Y); }
  return mag;
}
export function ray_intersect_circle(ray,circle) {
  const lx=f(circle.Center.X-ray.Origin.X), ly=f(circle.Center.Y-ray.Origin.Y);
  const tca=f(f(ly*ray.Direction.Y)+f(lx*ray.Direction.X));
  if(tca<0) return NO_HIT;
  const lmag=f(sq(ly)+sq(lx));
  if(lmag<circle.RadiusSq) return f(tca-Math.sqrt(f(f(circle.RadiusSq-lmag)+sq(tca))));
  const thc=f(f(circle.RadiusSq-lmag)+sq(tca));
  if(thc<0) return NO_HIT;
  const t=f(tca-Math.sqrt(thc));
  return t<0 || t>ray.MaxDistance ? NO_HIT : t;
}
export function line_init(line,x0,y0,x1,y1) {
  line.Direction=vec(x1-x0,y1-y0); normalize_2d(line.Direction);
  line.PerpendicularL=vec(line.Direction.Y,-line.Direction.X);
  line.PreComp1=f(-f(line.Direction.Y*x0)+f(line.Direction.X*y0));
  const axis=Math.abs(line.Direction.X)>=1e-9?'X':'Y';
  if(axis==='Y') line.Direction.X=0;
  const a=axis==='X'?x0:y0,b=axis==='X'?x1:y1;
  line.OriginX=Math.min(a,b); line.OriginY=Math.max(a,b); line.RayIntersect=vec();
  return line;
}
export function ray_intersect_line(ray,line) {
  const dot=f(f(line.PerpendicularL.Y*ray.Direction.Y)+f(ray.Direction.X*line.PerpendicularL.X));
  if(dot>=0) return NO_HIT;
  const result=f(-f(f(f(ray.Origin.X*line.PerpendicularL.X)+f(ray.Origin.Y*line.PerpendicularL.Y))+line.PreComp1)/dot);
  if(result<-(ray.MinDistance||0) || result>ray.MaxDistance) return NO_HIT;
  const p=line.RayIntersect;
  p.X=f(f(result*ray.Direction.X)+ray.Origin.X); p.Y=f(f(result*ray.Direction.Y)+ray.Origin.Y);
  const coordinate=line.Direction.X===0?p.Y:p.X;
  return coordinate>=line.OriginX && coordinate<=line.OriginY ? result : NO_HIT;
}
export function cross(a,b,dst=vec()) {
  dst.X=f(f(b.Z*a.Y)-f(b.Y*a.Z)); dst.Y=f(f(b.X*a.Z)-f(a.X*b.Z)); dst.Z=f(f(a.X*b.Y)-f(b.X*a.Y)); return dst;
}
export const magnitude=a=>f(Math.sqrt(f(f(sq(a.X)+sq(a.Y))+sq(a.Z||0))));
export function vector_add(a,b) { a.X=f(a.X+b.X);a.Y=f(a.Y+b.Y);return a; }
export function basic_collision(ball,nextPosition,direction,elasticity,smoothness,threshold,boost) {
  ball.Position.X=f(nextPosition.X);ball.Position.Y=f(nextPosition.Y);
  let proj=f(-f(f(direction.Y*ball.Acceleration.Y)+f(direction.X*ball.Acceleration.X)));
  if(proj<0) proj=f(-proj);
  else {
    const dx=f(proj*direction.X),dy=f(proj*direction.Y);
    ball.Acceleration.X=f(f(f(dx+ball.Acceleration.X)*smoothness)+f(dx*elasticity));
    ball.Acceleration.Y=f(f(f(dy+ball.Acceleration.Y)*smoothness)+f(dy*elasticity));
    normalize_2d(ball.Acceleration);
  }
  const projSpeed=f(proj*ball.Speed);
  const speed=f(ball.Speed-f(f(1-elasticity)*projSpeed));ball.Speed=speed;
  if(projSpeed>=threshold) {
    ball.Acceleration.X=f(f(speed*ball.Acceleration.X)+f(direction.X*boost));
    ball.Acceleration.Y=f(f(speed*ball.Acceleration.Y)+f(direction.Y*boost));
    ball.Speed=normalize_2d(ball.Acceleration);
  }
  return projSpeed;
}
export const Distance_Squared=(a,b)=>f(sq(f(a.Y-b.Y))+sq(f(a.X-b.X)));
export const Distance=(a,b)=>f(Math.sqrt(Distance_Squared(a,b)));
export const DotProduct=(a,b)=>f(f(a.Y*b.Y)+f(a.X*b.X));
export function RotatePt(p,sin,cos,origin) {
  const dx=f(p.X-origin.X),dy=f(p.Y-origin.Y);
  p.X=f(f(f(dx*cos)-f(dy*sin))+origin.X);p.Y=f(f(f(dx*sin)+f(dy*cos))+origin.Y);return p;
}
export function RotateVector(v,angle) {
  const s=f(Math.sin(angle)),c=f(Math.cos(angle));
  // Preserve the original's use of the newly assigned X in the Y expression.
  v.X=f(f(c*v.X)-f(s*v.Y));v.Y=f(f(s*v.X)+f(c*v.Y));return v;
}
export function find_closest_edge(planes,count,wall) {
  const a=vec(wall.X0??wall[0],wall.Y0??wall[1]),b=vec(wall.X1??wall[2],wall.Y1??wall[3]);
  let best=NO_HIT,result={lineEnd:null,lineStart:null};
  for(const plane of planes.slice(0,count)) {
    const points=[plane.V1,plane.V2,plane.V3];
    for(let i=0;i<3;i++) {
      const v1=points[i],v2=points[(i+1)%3],distance=f(Distance(a,v1)+Distance(b,v2));
      if(distance<best){best=distance;result={lineEnd:v1,lineStart:v2};}
    }
  }
  return result;
}
export const maths={normalize_2d,ray_intersect_circle,line_init,ray_intersect_line,cross,magnitude,vector_add,basic_collision,Distance_Squared,Distance,DotProduct,RotatePt,RotateVector,find_closest_edge,SinCos:angle=>({sin:f(Math.sin(angle)),cos:f(Math.cos(angle))}),vswap:(a,b)=>{const c=copy(a);Object.assign(a,b);Object.assign(b,c);}};
export const math=maths;
