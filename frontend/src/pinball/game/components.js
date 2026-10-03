// Component behavior ported from the MIT SpaceCadetPinball reconstruction.
// The numeric messages, state machines, scoring and timer callbacks are kept
// compatible with the original table's mission controller.
export class ObjList extends Array {
  GetCount() { return this.length; }
  Get(index) { return this[index] ?? null; }
  Add(item) { this.push(item); return item; }
  Delete(item) { const index = this.indexOf(item); if (index >= 0) this.splice(index, 1); }
}
export const vec = (array = []) => ({ X: array[0] || 0, Y: array[1] || 0, Z: array[2] || 0 });
function initNative(object, name) {
  for (const [field, length, type] of nativeFields[name] || []) {
    if (field in object) continue;
    object[field] = length ? Array.from({ length }, () => field === 'PlayerData' ? {MessageField:0,BmpIndex:0,BmpIndex1:0,BmpIndex2:0,FlasherActive:0,MessageField2:0,Timer1Time:0} : 0) : /vector_type/.test(type) ? vec() : /circle_type/.test(type) ? {Center:vec(),RadiusSq:0} : 0;
  }
}
export class TPinballComponent {
  constructor(table, groupIndex, loadVisuals = true) {
    this.PinballTable = table; this.runtime = table?.runtime;
    this.GroupIndex = groupIndex; this.GroupName = table?.runtime.loader.query_name(groupIndex) || null;
    this.MessageField = 0; this.UnusedBaseFlag = 0; this.ActiveFlag = 0; this.Control = null;
    this.Scores = new Array(8).fill(0);
    this.ListBitmap = new ObjList(); this.ListZMap = new ObjList(); this.RenderSprite = { Bmp: null, runtime: this.runtime };
    table?.ComponentList.Add(this);
    if (loadVisuals && groupIndex >= 0) {
      const count = this.runtime.loader.query_visual_states(groupIndex);
      for (let index = 0; index < count; index++) {
        const visual = this.runtime.loader.query_visual(groupIndex, index);
        if (visual.Bitmap) this.ListBitmap.Add({ ...visual.Bitmap, XPosition:visual.Bitmap.x,YPosition:visual.Bitmap.y,Width:visual.Bitmap.width,Height:visual.Bitmap.height,frame: index, groupIndex: groupIndex + index });
        if (visual.ZMap) this.ListZMap.Add({ ...visual.ZMap, frame: index });
      }
      this.RenderSprite.Bmp = this.ListBitmap.Get(0);
    }
  }
  Message(code) { this.MessageField = code === 1024 ? 0 : code; return 0; }
  put_scoring(index, score) { this.Scores[Number(index)] = score; }
  get_scoring(index) { return this.Scores[Number(index)] || 0; }
  port_draw() {}
}
export class TCollisionComponent extends TPinballComponent {
  constructor(table, groupIndex, createWall = true) {
    super(table, groupIndex); this.EdgeList = new ObjList(); this.ActiveFlag = 1;
    this.UnusedBaseFlag = this.GroupName !== null ? 1 : 0;
    const visual = groupIndex > 0 ? this.runtime.loader.query_visual(groupIndex, 0) : this.runtime.loader.default_vsi();
    this.Threshold = visual.Kicker.Threshold; this.Elasticity = visual.Elasticity; this.Smoothness = visual.Smoothness;
    this.Boost = visual.Kicker.Boost; this.HardHitSoundId = visual.Kicker.HardHitSoundId; this.SoftHitSoundId = visual.SoftHitSoundId;
    if (createWall && groupIndex > 0) table.edgeManager.installWall(this.runtime.loader.query_float_attribute(groupIndex,0,600), this, () => this.ActiveFlag, visual.CollisionGroup, table.CollisionCompOffset, 0);
  }
  DefaultCollision(ball, position, direction) {
    const {maths,loader} = this.runtime;
    if (this.PinballTable.TiltLockFlag) { maths.basic_collision(ball,position,direction,this.Elasticity,this.Smoothness,1e9,0); return 0; }
    const speed = maths.basic_collision(ball,position,direction,this.Elasticity,this.Smoothness,this.Threshold,this.Boost);
    if (speed <= this.Threshold) { if (speed > .2 && this.SoftHitSoundId) loader.play_sound(this.SoftHitSoundId); return 0; }
    if (this.HardHitSoundId) loader.play_sound(this.HardHitSoundId); return 1;
  }
  Collision(ball,position,direction) {
    const {maths,loader}=this.runtime;
    if (this.PinballTable.TiltLockFlag) { maths.basic_collision(ball,position,direction,this.Elasticity,this.Smoothness,1e9,0); return; }
    const speed=maths.basic_collision(ball,position,direction,this.Elasticity,this.Smoothness,this.Threshold,this.Boost);
    const sound = speed <= this.Threshold ? (speed > .2 ? this.SoftHitSoundId : 0) : this.HardHitSoundId;
    if(sound)loader.play_sound(sound);
  }
  FieldEffect() { return 0; }
}
export class TLight extends TPinballComponent {
  constructor(table,id) {
    super(table,id); initNative(this,'TLight');
    this.Flasher = {runtime:this.runtime,Sprite:this.RenderSprite,BmpArr:[null,this.ListBitmap.Get(0)],Unknown3:0,Unknown4:0,TimerDelay:[0,0],Timer:0,BmpIndex:0};
    this.FlasherDelay=[0,0]; this.Reset();
    this.FlasherDelay[0]=this.Flasher.TimerDelay[0]=this.runtime.loader.query_float_attribute(id,0,900)?.[0] || .1;
    this.FlasherDelay[1]=this.Flasher.TimerDelay[1]=this.runtime.loader.query_float_attribute(id,0,901)?.[0] || .1;
  }
}
export class TLightGroup extends TPinballComponent {
  constructor(table,id) {
    super(table,id,false); initNative(this,'TLightGroup'); this.List = new ObjList();
    this.Timer1TimeDefault = id > 0 ? this.runtime.loader.query_float_attribute(id,0,903)?.[0] || 0 : 0;
    TLightGroup.prototype.Reset.call(this);
    if(id>0)for(const componentId of this.runtime.loader.query_iattribute(id,1027)){const component=table.find_component(componentId); if(component)this.List.Add(component);}
  }
}
export class TLightBargraph extends TLightGroup {
  constructor(table,id) { super(table,id); initNative(this,'TLightBargraph'); this.TimerTimeArray=this.runtime.loader.query_float_attribute(id,0,904); this.Reset(); }
}
export class TBumper extends TCollisionComponent {
  constructor(table,id) { super(table,id); initNative(this,'TBumper'); this.TimerTime=this.runtime.loader.query_float_attribute(id,0,407)[0];const v=this.runtime.loader.query_visual(id);this.SoundIndex4=v.SoundIndex4;this.SoundIndex3=v.SoundIndex3;this.OriginalThreshold=this.Threshold; }
}
export class TPopupTarget extends TCollisionComponent {
  constructor(table,id) {super(table,id);initNative(this,'TPopupTarget');this.TimerTime=this.runtime.loader.query_float_attribute(id,0,407)[0];}
}
export class TGate extends TCollisionComponent {
  constructor(table,id) {super(table,id);initNative(this,'TGate');const v=this.runtime.loader.query_visual(id);this.SoundIndex4=v.SoundIndex4;this.SoundIndex3=v.SoundIndex3;this.runtime.control?.handler(1024,this);}
}
export class TBlocker extends TCollisionComponent {
  constructor(table,id) {super(table,id);initNative(this,'TBlocker');const v=this.runtime.loader.query_visual(id);this.SoundIndex4=v.SoundIndex4;this.SoundIndex3=v.SoundIndex3;this.TurnOnMsgValue=55;this.TurnOffMsgValue=5;this.Threshold=1e9;this.ActiveFlag=0;this.RenderSprite.Bmp=null;}
}
export class TKickback extends TCollisionComponent {
  // Native TKickback's firing-state int shadows the base collision flag.
  // Keep the authored collider enabled while its launch timer is idle.
  constructor(table,id) {super(table,id);initNative(this,'TKickback');this.KickbackActiveFlag=0;this.TimerTime=.69999999;this.TimerTime2=.1;this.Threshold=1e9;}
}
export class TSoloTarget extends TCollisionComponent {
  constructor(table,id) {super(table,id);initNative(this,'TSoloTarget');this.TimerTime=.1;this.SoundIndex4=this.runtime.loader.query_visual(id).SoundIndex4;this.Message(50,0);}
}
export class TWall extends TCollisionComponent {
  constructor(table,id) {super(table,id);initNative(this,'TWall');this.BmpPtr=this.ListBitmap.Get(0);this.RenderSprite.Bmp=null;}
}
export class TFlagSpinner extends TCollisionComponent {
  constructor(table,id) {
    super(table,id,false);initNative(this,'TFlagSpinner');const v=this.runtime.loader.query_visual(id), end=vec(v.FloatArr), start=vec(v.FloatArr.slice(2));
    table.edgeManager.addLine(this,v.CollisionGroup,start,end);this.PrevCollider=table.edgeManager.addLine(this,v.CollisionGroup,end,start);
    this.SpeedDecrement=this.runtime.loader.query_float_attribute(id,0,1202,.64999998);this.MaxSpeed=this.runtime.loader.query_float_attribute(id,0,1200,50000);this.MinSpeed=this.runtime.loader.query_float_attribute(id,0,1201,5);
  }
}
export class TRollover extends TCollisionComponent {
  constructor(table,id,createWall) {super(table,id,createWall ?? false);initNative(this,'TRollover');if(createWall===undefined)this.build_walls(id);}
  build_walls(id) {const group=this.runtime.loader.query_visual(id).CollisionGroup;this.PinballTable.edgeManager.installWall(this.runtime.loader.query_float_attribute(id,0,600),this,()=>this.ActiveFlag,group,0,600);this.PinballTable.edgeManager.installWall(this.runtime.loader.query_float_attribute(id,0,603),this,()=>this.RolloverFlag,group,0,603);}
}
export class TLightRollover extends TRollover {
  constructor(table,id) {super(table,id,false);initNative(this,'TLightRollover');this.RenderSprite.Bmp=null;this.build_walls(id);this.FloatArr=this.runtime.loader.query_float_attribute(id,0,407)[0];}
}
export class TTripwire extends TRollover {
  constructor(table,id) {super(table,id,true);initNative(this,'TTripwire');}
}
export class TOneway extends TCollisionComponent {
  constructor(table,id) {
    super(table,id,false);initNative(this,'TOneway');const v=this.runtime.loader.query_visual(id);if(v.FloatArrCount===2){const p2=vec(v.FloatArr),p1=vec(v.FloatArr.slice(2));table.edgeManager.addLine(this,v.CollisionGroup,p2,p1,{offset:table.CollisionCompOffset});this.Line=table.edgeManager.addLine(this,v.CollisionGroup,p1,p2,{offset:-table.CollisionCompOffset*.8});}
  }
}
export class THole extends TCollisionComponent {
  constructor(table,id) {
    super(table,id,false);initNative(this,'THole');const l=this.runtime.loader,v=l.query_visual(id);
    this.Unknown4=.05;this.Unknown3=l.query_float_attribute(id,0,407,.25);this.GravityMult=l.query_float_attribute(id,0,701,.2);this.GravityPull=l.query_float_attribute(id,0,305)[0];
    this.Circle={Center:vec(v.FloatArr),RadiusSq:v.FloatArr[2]*v.FloatArr[2]};const radiusSq=l.query_float_attribute(id,0,306)[0]*v.FloatArr[2] || .001;
    table.edgeManager.addCircle(this,v.CollisionGroup,this.Circle.Center,radiusSq);this.ZSetValue=l.query_float_attribute(id,0,408)[2];this.FieldFlag=Math.floor(l.query_float_attribute(id,0,1304)[0]);
    this.Field=table.edgeManager.addField(this,v.CollisionGroup,{type:'circle',center:this.Circle.Center,radius:v.FloatArr[2]});
  }
}
export class TSink extends TCollisionComponent {
  constructor(table,id) {super(table,id);initNative(this,'TSink');const l=this.runtime.loader,v=l.query_visual(id);this.BallAcceleration={...v.Kicker.ThrowBallAcceleration};this.ThrowAngleMult=v.Kicker.ThrowBallAngleMult;this.ThrowSpeedMult1=v.Kicker.Boost;this.ThrowSpeedMult2=v.Kicker.ThrowBallMult*.01;this.SoundIndex4=v.SoundIndex4;this.SoundIndex3=v.SoundIndex3;this.BallPosition=vec(l.query_float_attribute(id,0,601));this.TimerTime=l.query_float_attribute(id,0,407)[0];}
}
export class TKickout extends TCollisionComponent {
  constructor(table,id,someFlag) {
    super(table,id,false);initNative(this,'TKickout');const l=this.runtime.loader,v=l.query_visual(id);this.NotSomeFlag=!someFlag;if(!someFlag)this.ActiveFlag=0;this.TimerTime1=1.5;this.TimerTime2=.05;this.FieldMult=l.query_float_attribute(id,0,305)[0];
    this.Circle={Center:vec(v.FloatArr),RadiusSq:v.FloatArr[2]*v.FloatArr[2]};const radiusSq=l.query_float_attribute(id,0,306)[0]*v.FloatArr[2] || .001;table.edgeManager.addCircle(this,v.CollisionGroup,this.Circle.Center,radiusSq);
    this.CollisionBallSetZ=l.query_float_attribute(id,0,408)[2];this.ThrowSpeedMult2=v.Kicker.ThrowBallMult*.01;this.BallAcceleration={...v.Kicker.ThrowBallAcceleration};this.ThrowAngleMult=v.Kicker.ThrowBallAngleMult;this.ThrowSpeedMult1=v.Kicker.Boost;
    this.Field=table.edgeManager.addField(this,v.CollisionGroup,{type:'circle',center:this.Circle.Center,radius:v.FloatArr[2]});
  }
}
export class TRamp extends TCollisionComponent {
  constructor(table,id) {super(table,id,false);initNative(this,'TRamp');this.CollisionGroup=this.runtime.loader.query_visual(id).CollisionGroup;this.BallFieldMult=this.runtime.loader.query_float_attribute(id,0,701,.2);this.RampFlag1=Math.trunc(this.runtime.loader.query_float_attribute(id,0,1305,0));table.physics.installRamp(this,table.geometry.ramps.find(ramp=>ramp.groupIndex===id));}
}
export class TTimer extends TPinballComponent {
  constructor(table,id) {super(table,id);initNative(this,'TTimer');}
}
export class TComponentGroup extends TPinballComponent {
  constructor(table,id) {super(table,id,false);initNative(this,'TComponentGroup');this.List=new ObjList();for(const index of this.runtime.loader.query_iattribute(id,1027)){const component=table.find_component(index);if(component)this.List.Add(component);}}
}
export class TSound extends TPinballComponent {
  constructor(table,id) {super(table,id);initNative(this,'TSound');this.SoundIndex=this.runtime.loader.query_visual(id).SoundIndex4;}
}
export class TPlunger extends TCollisionComponent {
  constructor(table,id) {super(table,id);initNative(this,'TPlunger');const v=this.runtime.loader.query_visual(id);this.Boost=0;this.SoundIndexP1=v.SoundIndex4;this.SoundIndexP2=v.SoundIndex3;this.Threshold=1e9;this.MaxPullback=100;this.Elasticity=.5;this.Smoothness=.5;this.PullbackIncrement=Math.trunc(100/(this.ListBitmap.GetCount()*8));this.Unknown4F=.025;const position=this.runtime.loader.query_float_attribute(id,0,601);table.PlungerPositionX=position[0];table.PlungerPositionY=position[1];}
}
export class TFlipper extends TCollisionComponent {
  constructor(table,id) {
    super(table,id,false);initNative(this,'TFlipper');const l=this.runtime.loader,v=l.query_visual(id);this.HardHitSoundId=v.SoundIndex4;this.SoftHitSoundId=v.SoundIndex3;
    this.FlipperEdge=new table.physics.FlipperEdge(this,()=>this.ActiveFlag,v.CollisionGroup,table,vec(l.query_float_attribute(id,0,800)),vec(l.query_float_attribute(id,0,801)),vec(l.query_float_attribute(id,0,802)),l.query_float_attribute(id,0,804)[0],l.query_float_attribute(id,0,805)[0],l.query_float_attribute(id,0,803)[0],this.Elasticity,this.Smoothness);
    table.edgeManager.addEdge(this.FlipperEdge);
    this.BmpCoef1=this.FlipperEdge.BmpCoef1/(this.ListBitmap.GetCount()-1);this.BmpCoef2=this.FlipperEdge.BmpCoef2/(this.ListBitmap.GetCount()-1);
    this.ExtendAnimationFrameTime=this.BmpCoef1;this.RetractAnimationFrameTime=this.BmpCoef2;
  }
}
export class TDemo extends TCollisionComponent {
  constructor(table,id) {
    super(table,id,false);initNative(this,'TDemo');this.ActiveFlag=0;this.UnusedBaseFlag=0;table.Demo=this;const l=this.runtime.loader,v=l.query_visual(id),times=l.query_float_attribute(id,0,407)||[.2,.1,.2,.1];[this.FlipTimerTime1,this.FlipTimerTime2,this.UnFlipTimerTime1,this.UnFlipTimerTime2]=times;
    this.Edge1=table.edgeManager.installWall(l.query_float_attribute(id,0,1400),this,()=>this.ActiveFlag,v.CollisionGroup,0,1400);table.edgeManager.installWall(l.query_float_attribute(id,0,1401),this,()=>this.ActiveFlag,v.CollisionGroup,0,1401);this.Edge2=table.edgeManager.installWall(l.query_float_attribute(id,0,1402),this,()=>this.ActiveFlag,v.CollisionGroup,0,1402);table.edgeManager.installWall(l.query_float_attribute(id,0,1403),this,()=>this.ActiveFlag,v.CollisionGroup,0,1403);this.Edge3=table.edgeManager.installWall(l.query_float_attribute(id,0,1404),this,()=>this.ActiveFlag,v.CollisionGroup,table.CollisionCompOffset,1404);
  }
}
export class TTableLayer extends TCollisionComponent {
  constructor(table) {
    super(table,-1,false);const l=this.runtime.loader,v=l.query_visual(l.query_handle('table'));
    table.SoundIndex1=v.SoundIndex4;table.SoundIndex2=v.SoundIndex3;table.SoundIndex3=v.Kicker.HardHitSoundId;
    [table.GravityDirVectMult,table.GravityAngleX,table.GravityAnglY]=table.geometry.table.gravity;
    this.GraityDirX=Math.cos(table.GravityAnglY)*Math.sin(table.GravityAngleX)*table.GravityDirVectMult;this.GraityDirY=Math.sin(table.GravityAnglY)*Math.sin(table.GravityAngleX)*table.GravityDirVectMult;this.GraityMult=table.geometry.table.drag;
    this.Threshold=v.Kicker.Threshold;this.Boost=15;
    const b=table.geometry.bounds;this.Unknown1F=b.minX;this.Unknown2F=b.minY;this.Unknown3F=b.maxX;this.Unknown4F=b.maxY;
    for(const line of table.geometry.table.geometry.lines)table.edgeManager.addLine(this,v.CollisionGroup,vec(line.slice(2)),vec(line));
    this.Field=table.edgeManager.addField(this,-1,{minX:b.minX,minY:b.minY,maxX:b.maxX,maxY:b.maxY});
  }
  FieldEffect(ball,destination) {destination.X=this.GraityDirX-(.5-this.PinballTable.random()+ball.Acceleration.X)*ball.Speed*this.GraityMult;destination.Y=this.GraityDirY-ball.Acceleration.Y*ball.Speed*this.GraityMult;return 1;}
}
export class TDrain extends TCollisionComponent {
  constructor(table,id) {super(table,id);this.Timer=0;this.TimerTime=this.runtime.loader.query_float_attribute(id,0,407)[0];}
  Message(code) {if(code===1024){if(this.Timer)this.runtime.timer.kill(this.Timer);this.Timer=0;this.PinballTable.BallInSink=0;}return 0;}
  Collision(ball) {ball.Message(1024,0);this.PinballTable.BallInSink=1;this.Timer=this.runtime.timer.set(this.TimerTime,this,TDrain.TimerCallback);this.runtime.control.handler(63,this);}
  static TimerCallback(id,drain) {drain.runtime.control.handler(60,drain);}
}
export class TTextBox extends TPinballComponent {
  constructor(table,id) {super(table,id);this.Timer=0;this.Message1=null;this.Message2=null;this.Text='';}
  Message() {return 0;}
  Clear() {if(this.Timer&&this.Timer!==-1)this.runtime.timer.kill(this.Timer);this.Timer=0;this.Message1=this.Message2=null;this.Text='';}
  Display(text,time) {
    if(!text)return;const now=this.runtime.pb.time_now;
    if(this.Message1&&this.Message2.Text===text){Object.assign(this.Message2,{Time:time,Start:now});if(this.Message1===this.Message2){if(this.Timer&&this.Timer!==-1)this.runtime.timer.kill(this.Timer);this.Timer=time===-1?-1:this.runtime.timer.set(time,this,TTextBox.TimerExpired);}return;}
    if(this.Timer===-1)this.Clear();const message={Text:text,Time:time,Start:now,NextMessage:null};if(this.Message1)this.Message2.NextMessage=message;else this.Message1=message;this.Message2=message;if(!this.Timer)this.Draw();
  }
  Draw() {
    this.Text='';while(this.Message1){const m=this.Message1,left=m.Time-(this.runtime.pb.time_now-m.Start);if(m.Time===-1&&!m.NextMessage){this.Timer=-1;this.Text=m.Text;return;}if(m.Time!==-1&&left>=-2){this.Timer=this.runtime.timer.set(Math.max(left,.25),this,TTextBox.TimerExpired);this.Text=m.Text;return;}this.Message1=m.NextMessage;}
    this.Message2=null;
  }
  static TimerExpired(id,box){box.Timer=0;if(box.Message1){box.Message1=box.Message1.NextMessage;box.Draw();box.runtime.control?.handler(60,box);}}
}

export const componentTypes = {1000:TWall,1010:TWall,1001:TPlunger,1002:TLight,1003:TFlipper,1004:TFlipper,1005:TBumper,1006:TPopupTarget,1007:TDrain,1011:TBlocker,1012:TKickout,1013:TGate,1014:TKickback,1015:TRollover,1016:TOneway,1017:TSink,1018:TFlagSpinner,1019:TSoloTarget,1020:TLightRollover,1021:TRamp,1022:THole,1023:TDemo,1024:TTripwire,1026:TLightGroup,1028:TComponentGroup,1029:TKickout,1030:TLightBargraph,1031:TSound,1032:TTimer,1033:TTextBox};
const scoreMultipliers = [1,2,3,5,10];
export class TPinballTable extends TPinballComponent {
  constructor(geometry,runtime,physics) {
    super(null,-1,false); this.runtime=runtime;this.geometry=geometry;this.physics=physics;runtime.physics=physics;runtime.maths=physics.maths;
    runtime.control ||= {handler(){},table_control_handler(){}};runtime.random ||= Math.random;
    runtime.render ||= {sprite_set_bitmap(sprite,bitmap){if(sprite)sprite.Bmp=bitmap;},sprite_set(sprite,bitmap){if(sprite)sprite.Bmp=bitmap;}};
    runtime.score ||= {set(display,value){display.Score=value;display.DirtyFlag=true;},update(){},erase(display){display.Score=-1;}};
    initNative(this,'TPinballTable');
    this.ComponentList=new ObjList();this.BallList=new ObjList();this.edgeManager=new physics.EdgeManager(geometry.bounds);
    this.random=()=>runtime.random();this.ActiveFlag=1;this.MaxBallCount=3;this.CollisionCompOffset=geometry.ball.radius;
    this.XOffset=0;this.YOffset=0;this.Width=600;this.Height=416;
    this.PlayerScores=Array.from({length:4},()=>({ScoreStruct:{Score:0,DirtyFlag:true},Score:0,ScoreE9Part:0,Unknown2:0,BallCount:3,ExtraBalls:0,BallLockedCounter:0}));
    this.CurScoreStruct=this.PlayerScores[0].ScoreStruct;this.ScoreBallcount={Score:1};this.ScorePlayerNumber1={Score:1};
    const ball=new physics.Ball(this,geometry.ball.radius);ball.ActiveFlag=0;ball.GroupIndex=-1;ball.GroupName=null;ball.runtime=runtime;ball.RenderSprite={Bmp:null};this.ComponentList.Add(ball);this.BallList.Add(ball);
    new TTableLayer(this);this.LightGroup=new TLightGroup(this,0);
    for(const component of geometry.components) {
      const Constructor=componentTypes[component.typeId];if(!Constructor)throw new Error(`Unsupported table component ${component.typeId}: ${component.name}`);
      const object=component.typeId===1012||component.typeId===1029 ? new Constructor(this,component.groupIndex,component.typeId===1012) : new Constructor(this,component.groupIndex);
      if(component.typeId===1001)this.Plunger=object;
      if(component.typeId===1003)this.FlipperL=object;
      if(component.typeId===1004)this.FlipperR=object;
      if(component.typeId===1007)this.Drain=object;
      if(component.typeId===1002)this.LightGroup.List.Add(object);
    }
    runtime.pinball.InfoTextBox=this.find_component('info_text_box');runtime.pinball.MissTextBox=this.find_component('mission_text_box');
  }
  find_component(identifier) {return this.ComponentList.find(component => typeof identifier==='string'?component.GroupName===identifier:component.GroupIndex===identifier) || null;}
}

TLight.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	let bmpIndex;

	switch (code)
	{
	case 1024:
		this.Reset();
		for (let index = 0; index < this.PinballTable.PlayerCount; ++index)
		{
			let playerPtr = this.PlayerData[index];
			playerPtr.FlasherActive = this.FlasherActive;
			playerPtr.BmpIndex2 = this.BmpIndex2;
			playerPtr.BmpIndex1 = this.BmpIndex1;
			playerPtr.MessageField = this.MessageField;
		}
		break;
	case 1020:
		{
			let playerPtr = this.PlayerData[this.PinballTable.CurrentPlayer];
			playerPtr.FlasherActive = this.FlasherActive;
			playerPtr.BmpIndex2 = this.BmpIndex2;
			playerPtr.BmpIndex1 = this.BmpIndex1;
			playerPtr.MessageField = this.MessageField;

			this.Reset();

			playerPtr = this.PlayerData[Math.trunc(Math.floor(value))];
			this.FlasherActive = playerPtr.FlasherActive;
			this.BmpIndex2 = playerPtr.BmpIndex2;
			this.BmpIndex1 = playerPtr.BmpIndex1;
			this.MessageField = playerPtr.MessageField;
			if (this.BmpIndex2)
			{
				this.Message(11, (this.BmpIndex2));
			}
			if (this.BmpIndex1)
				this.Message(1, 0.0);
			if (this.FlasherActive)
				this.Message(4, 0.0);
			break;
		}
	case 0:
		this.BmpIndex1 = 0;
		if (this.FlasherActive == 0 && !this.FlasherFlag1 && !this.FlasherFlag2)
			render.sprite_set_bitmap(this.RenderSprite, this.Flasher.BmpArr[0]);
		break;
	case 1:
		this.BmpIndex1 = 1;
		if (this.FlasherActive == 0 && !this.FlasherFlag1 && !this.FlasherFlag2)
			render.sprite_set_bitmap(this.RenderSprite, this.Flasher.BmpArr[1]);
		break;
	case 2:
		return this.BmpIndex1;
	case 3:
		return this.FlasherActive;
	case 4:
		this.schedule_timeout(0.0);
		if (!this.FlasherActive || !this.Flasher.Timer)
		{
			this.FlasherActive = 1;
			this.FlasherFlag2 = 0;
			this.FlasherFlag1 = 0;
			this.TurnOffAfterFlashingFg = 0;
			TLight.flasher_start(this.Flasher, this.BmpIndex1);
		}
		break;
	case 5:
		this.Flasher.TimerDelay[0] = value * this.FlasherDelay[0];
		this.Flasher.TimerDelay[1] = value * this.FlasherDelay[1];
		break;
	case 6:
		this.Flasher.TimerDelay[0] = this.FlasherDelay[0];
		this.Flasher.TimerDelay[1] = this.FlasherDelay[1];
		break;
	case 7:
		if (!this.FlasherActive)
			TLight.flasher_start(this.Flasher, this.BmpIndex1);
		this.FlasherActive = 1;
		this.FlasherFlag2 = 0;
		this.TurnOffAfterFlashingFg = 0;
		this.FlasherFlag1 = 0;
		this.schedule_timeout(value);
		break;
	case 8:
		if (!this.FlasherFlag1)
		{
			if (this.FlasherActive)
			{
				TLight.flasher_stop(this.Flasher, 0);
				this.FlasherActive = 0;
			}
			else
			{
				render.sprite_set_bitmap(this.RenderSprite, this.Flasher.BmpArr[0]);
			}
			this.FlasherFlag1 = 1;
			this.FlasherFlag2 = 0;
		}
		this.schedule_timeout(value);
		break;
	case 9:
		if (!this.FlasherFlag2)
		{
			if (this.FlasherActive)
			{
				TLight.flasher_stop(this.Flasher, 1);
				this.FlasherActive = 0;
			}
			else
			{
				render.sprite_set_bitmap(this.RenderSprite, this.Flasher.BmpArr[1]);
			}
			this.FlasherFlag2 = 1;
			this.FlasherFlag1 = 0;
		}
		this.schedule_timeout(value);
		break;
	case 11:
		this.BmpIndex2 = Math.trunc(Math.floor(value));
		if (this.BmpIndex2 > this.ListBitmap.GetCount())
			this.BmpIndex2 = this.ListBitmap.GetCount();
		bmpIndex = 0;
		if (this.BmpIndex2 < 0)
			this.BmpIndex2 = 0;
		this.Flasher.BmpArr[0] = null;
		this.Flasher.BmpArr[1] = this.ListBitmap.Get(this.BmpIndex2);
		if (this.FlasherActive == 0)
		{
			if (!this.FlasherFlag1)
			{
				if (this.FlasherFlag2)
					bmpIndex = 1;
				else
					bmpIndex = this.BmpIndex1;
			}
		}
		else
		{
			bmpIndex = this.Flasher.BmpIndex;
		}
		render.sprite_set_bitmap(this.RenderSprite, this.Flasher.BmpArr[bmpIndex]);
		break;
	case 12:
		bmpIndex = this.BmpIndex2 + 1;
		if (bmpIndex > this.ListBitmap.GetCount())
			bmpIndex = this.ListBitmap.GetCount();
		this.Message(11, (bmpIndex));
		break;
	case 13:
		bmpIndex = this.BmpIndex2 - 1;
		if (bmpIndex < 0)
			bmpIndex = 0;
		this.Message(11, (bmpIndex));
		break;
	case 14:
		if (this.Timer1)
			timer.kill(this.Timer1);
		this.Timer1 = 0;
		if (this.FlasherActive != 0)
			TLight.flasher_stop(this.Flasher, -1);
		this.FlasherActive = 0;
		this.FlasherFlag1 = 0;
		this.FlasherFlag2 = 0;
		render.sprite_set_bitmap(this.RenderSprite, this.Flasher.BmpArr[this.BmpIndex1]);
		break;
	case 15:
		this.TurnOffAfterFlashingFg = 0;
		if (this.Timer2)
			timer.kill(this.Timer2);
		this.Timer2 = 0;
		this.Message(1, 0.0);
		this.Message(7, value);
		break;
	case 16:
		if (this.Timer2)
			timer.kill(this.Timer2);
		this.Timer2 = 0;
		this.Message(7, value);
		this.TurnOffAfterFlashingFg = 1;
		break;
	case 17:
		this.Message(Math.trunc(Math.floor(value)) != 0, 0.0);
		return this.BmpIndex1;
	case 18:
		this.Message(17, value);
		this.Message(14, 0.0);
		return this.BmpIndex1;
	case 19:
		this.Message(1, 0.0);
		this.Message(14, 0.0);
		break;
	case 20:
		this.Message(0, 0.0);
		this.Message(14, 0.0);
		break;
	case 21:
		this.Message(17, (this.BmpIndex1 == 0));
		return this.BmpIndex1;
	case 22:
		this.Message(18, (this.BmpIndex1 == 0));
		return this.BmpIndex1;
	case 23:
		this.MessageField = Math.trunc(Math.floor(value));
		break;
	default:
		break;
	}

	return 0;

};

TLight.prototype.Reset = function() {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.Timer1)
		timer.kill(this.Timer1);
	if (this.Timer2)
		timer.kill(this.Timer2);
	if (this.FlasherActive)
		TLight.flasher_stop(this.Flasher, -1);
	this.Unknown20F = 1.0;
	this.Timer1 = 0;
	this.Timer2 = 0;
	this.BmpIndex1 = 0;
	this.BmpIndex2 = 0;
	this.FlasherFlag1 = 0;
	this.FlasherFlag2 = 0;
	this.FlasherActive = 0;
	this.TurnOffAfterFlashingFg = 0;
	render.sprite_set_bitmap(this.RenderSprite, null);
	this.Flasher.Sprite = this.RenderSprite;
	this.Flasher.BmpArr[0] = null;
	if (this.ListBitmap)
		this.Flasher.BmpArr[1] = this.ListBitmap.Get(0);
	this.Flasher.Unknown4 = 0;
	this.Flasher.Unknown3 = 0;
	this.MessageField = 0;

};

TLight.prototype.schedule_timeout = function(time) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	this.Flasher.TimerDelay[0] = this.FlasherDelay[0];
	this.Flasher.TimerDelay[1] = this.FlasherDelay[1];
	if (this.Timer1)
		timer.kill(this.Timer1);
	this.Timer1 = 0;
	if (time > 0.0)
		this.Timer1 = timer.set(time, this, TLight.TimerExpired);

};

TLight.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let light = caller;
	if (light.FlasherActive)
		TLight.flasher_stop(light.Flasher, -1);
	render.sprite_set_bitmap(light.RenderSprite, light.Flasher.BmpArr[light.BmpIndex1]);
	light.FlasherFlag1 = 0;
	light.FlasherFlag2 = 0;
	light.FlasherActive = 0;
	light.Timer1 = 0;
	if (light.TurnOffAfterFlashingFg != 0)
	{
		light.TurnOffAfterFlashingFg = 0;
		light.Message(20, 0.0);
	}
	if (light.Control)
		control.handler(60, light);

};

TLight.flasher_stop = function(flash, bmpIndex) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = flash.runtime;

	if (flash.Timer)
		timer.kill(flash.Timer);
	flash.Timer = 0;
	if (bmpIndex >= 0)
	{
		flash.BmpIndex = bmpIndex;
		render.sprite_set_bitmap(flash.Sprite, flash.BmpArr[bmpIndex]);
	}

};

TLight.flasher_start = function(flash, bmpIndex) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = flash.runtime;

	flash.BmpIndex = bmpIndex;
	TLight.flasher_callback(0, flash);

};

TLight.flasher_callback = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let flash = caller;
	let index = 1 - flash.BmpIndex;
	flash.BmpIndex = index;
	render.sprite_set_bitmap(flash.Sprite, flash.BmpArr[index]);
	flash.Timer = timer.set(flash.TimerDelay[flash.BmpIndex], flash, TLight.flasher_callback);

};

TLightGroup.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	switch (code)
	{
	case 1011:
	case 1022:
		break;
	case 1020:
		{
			let playerPtr = this.PlayerData[this.PinballTable.CurrentPlayer];
			playerPtr.MessageField = this.MessageField;
			playerPtr.MessageField2 = this.MessageField2;
			playerPtr.Timer1Time = this.Timer1Time;

			this.Reset();

			playerPtr = this.PlayerData[Math.trunc(Math.floor(value))];
			this.MessageField = playerPtr.MessageField;
			this.MessageField2 = playerPtr.MessageField2;
			this.Timer1Time = playerPtr.Timer1Time;
			if (!(this.MessageField == 0))
				TLightGroup.TimerExpired(0, this);
			break;
		}
	case 1024:
		this.Reset();
		for (let index = 0; index < this.PinballTable.PlayerCount; index++)
		{
			let playerPtr = this.PlayerData[index];
			playerPtr.MessageField = this.MessageField;
			playerPtr.MessageField2 = this.MessageField2;
			playerPtr.Timer1Time = this.Timer1Time;
		}
		break;
	case 24:
		{
			let count = this.List.GetCount();
			let lastLight = this.List.Get(count - 1);
			if (lastLight.FlasherActive || lastLight.FlasherFlag2 || lastLight.FlasherFlag1)
				break;
			if (this.MessageField2)
			{
				TLightGroup.prototype.Message.call(this, 34, 0.0);
			}
			this.AnimationFlag = 1;
			this.MessageField2 = code;
			let lightMessageField = lastLight.MessageField;
			let bmpIndex1 = lastLight.BmpIndex1;
			for (let index = count - 1; index > 0; --index)
			{
				let lightCur = this.List.Get(index);
				let lightPrev = this.List.Get(index - 1);
				lightCur.Message(lightPrev.BmpIndex1 != 0, 0.0);
				lightCur.MessageField = lightPrev.MessageField;
			}
			let firstLight = this.List.Get(0);
			firstLight.Message(bmpIndex1 != 0, 0.0);
			firstLight.MessageField = lightMessageField;
			this.reschedule_animation(value);
			break;
		}
	case 25:
		{
			let count = this.List.GetCount();
			let lastLight = this.List.Get(count - 1);
			if (lastLight.FlasherActive || lastLight.FlasherFlag2 || lastLight.FlasherFlag1)
				break;
			if (this.MessageField2)
			{
				TLightGroup.prototype.Message.call(this, 34, 0.0);
			}
			let firstLight = this.List.Get(0);
			this.AnimationFlag = 1;
			this.MessageField2 = code;
			let lightMessageField = firstLight.MessageField;
			let bmpIndex1 = firstLight.BmpIndex1;
			for (let index = 0; index < count - 1; index++)
			{
				let lightCur = this.List.Get(index);
				let lightNext = this.List.Get(index + 1);
				lightCur.Message(lightNext.BmpIndex1 != 0, 0.0);
				lightCur.MessageField = lightNext.MessageField;
			}
			lastLight.Message(bmpIndex1 != 0, 0.0);
			lastLight.MessageField = lightMessageField;
			this.reschedule_animation(value);
			break;
		}
	case 26:
		{
			if (this.AnimationFlag || !this.MessageField2)
				this.start_animation();
			this.MessageField2 = code;
			this.AnimationFlag = 0;
			let count = this.List.GetCount();
			let lastLight = this.List.Get(count - 1);
			let flasherFlag2 = lastLight.FlasherFlag2;
			for (let i = count - 1; i > 0; --i)
			{
				let lightCur = this.List.Get(i);
				let lightPrev = this.List.Get(i - 1);
				lightCur.Message((lightPrev.FlasherFlag2 != 0) + 8, 0.0);
			}
			let firstLight = this.List.Get(0);
			firstLight.Message((flasherFlag2 != 0) + 8, 0);
			this.reschedule_animation(value);
			break;
		}
	case 27:
		{
			if (this.AnimationFlag || !this.MessageField2)
				this.start_animation();
			this.MessageField2 = code;
			this.AnimationFlag = 0;
			let count = this.List.GetCount();
			let firstLight = this.List.Get(0);
			let flasherFlag2 = firstLight.FlasherFlag2;
			for (let i = 0; i < count - 1; i++)
			{
				let lightCur = this.List.Get(i);
				let lightNext = this.List.Get(i + 1);
				lightCur.Message((lightNext.FlasherFlag2 != 0) + 8, 0.0);
			}
			let lastLight = this.List.Get(count - 1);
			lastLight.Message((flasherFlag2 != 0) + 8, 0);
			this.reschedule_animation(value);
			break;
		}
	case 28:
		{
			if (this.AnimationFlag || !this.MessageField2)
				this.start_animation();
			this.MessageField2 = code;
			this.AnimationFlag = 0;
			let count = this.List.GetCount();
			for (let i = 0; i < count - 1; i++)
			{
				if (Math.trunc(random() * 32768) % 100 > 70)
				{
					let light = this.List.Get(i);
					let randVal = (Math.trunc(random() * 32768)) * 0.00003051850947599719 * value * 3.0 + 0.1;
					light.Message(9, randVal);
				}
			}
			this.reschedule_animation(value);
			break;
		}
	case 29:
		{
			if (this.AnimationFlag || !this.MessageField2)
				this.start_animation();
			this.MessageField2 = code;
			this.AnimationFlag = 0;
			let count = this.List.GetCount();
			for (let i = 0; i < count - 1; i++)
			{
				let light = this.List.Get(i);
				let randVal = (Math.trunc(random() * 32768) % 100 > 70);
				light.Message(18, randVal);
			}
			this.reschedule_animation(value);
			break;
		}
	case 30:
		{
			let noBmpInd1Count = 0;
			let countSub1 = this.List.GetCount() - 1;
			if (countSub1 < 0)
				break;

			for (let i = countSub1; i >= 0; i--)
			{
				if (!this.List.Get(i).BmpIndex1)
					++noBmpInd1Count;
			}
			if (!noBmpInd1Count)
				break;

			let randModCount = Math.trunc(random() * 32768) % noBmpInd1Count;
			for (let i = countSub1; i >= 0; i--)
			{
				let light = this.List.Get(i);
				if (!light.BmpIndex1 && randModCount-- == 0)
				{
					light.Message(1, 0.0);
					break;
				}
			}

			if (this.MessageField2)
				this.start_animation();
			break;
		}
	case 31:
		{
			let bmpInd1Count = 0;
			let countSub1 = this.List.GetCount() - 1;
			if (countSub1 < 0)
				break;

			for (let i = countSub1; i >= 0; i--)
			{
				if (this.List.Get(i).BmpIndex1)
					++bmpInd1Count;
			}
			if (!bmpInd1Count)
				break;

			let randModCount = Math.trunc(random() * 32768) % bmpInd1Count;
			for (let i = countSub1; i >= 0; i--)
			{
				let light = this.List.Get(i);
				if (light.BmpIndex1 && randModCount-- == 0)
				{
					light.Message(0, 0.0);
					break;
				}
			}

			if (this.MessageField2)
				this.start_animation();
			break;
		}
	case 32:
		{
			let index = this.next_light_up();
			if (index < 0)
				break;
			this.List.Get(index).Message(1, 0.0);
			if (this.MessageField2)
				this.start_animation();
			return 1;
		}
	case 33:
		{
			let index = this.next_light_down();
			if (index < 0)
				break;
			this.List.Get(index).Message(0, 0.0);
			if (this.MessageField2)
				this.start_animation();
			return 1;
		}
	case 34:
		{
			if (this.Timer)
				timer.kill(this.Timer);
			this.Timer = 0;
			if (this.MessageField2 == 26 || this.MessageField2 == 27 || this.MessageField2 == 28)
				TLightGroup.prototype.Message.call(this, 14, 0.0);
			this.MessageField2 = 0;
			this.AnimationFlag = 0;
			break;
		}
	case 35:
		{
			let index = Math.trunc(Math.floor(value));
			if (index >= this.List.GetCount() || index < 0)
				break;

			let light = this.List.Get(index);
			light.Message(1, 0.0);
			if (this.MessageField2)
				this.start_animation();
			break;
		}
	case 36:
		{
			let index = Math.trunc(Math.floor(value));
			if (index >= this.List.GetCount() || index < 0)
				break;

			let light = this.List.Get(index);
			light.Message(0, 0.0);
			if (this.MessageField2)
				this.start_animation();
			break;
		}
	case 37:
		{
			let bmp1Count = 0;
			let countSub1 = this.List.GetCount() - 1;
			for (let i = countSub1; i >= 0; i--)
			{
				if (this.List.Get(i).BmpIndex1)
					++bmp1Count;
			}
			return bmp1Count;
		}
	case 38:
		return this.List.GetCount();
	case 39:
		return this.MessageField2;
	case 40:
		return this.AnimationFlag;
	case 41:
		{
			let index = this.next_light_up();
			if (index < 0)
				break;
			if (this.MessageField2 || this.AnimationFlag)
				TLightGroup.prototype.Message.call(this, 34, 0.0);
			this.List.Get(index).Message(15, value);
			return 1;
		}
	case 42:
		{
			let index = this.next_light_down();
			if (index < 0)
				break;
			if (this.MessageField2 || this.AnimationFlag)
				TLightGroup.prototype.Message.call(this, 34, 0.0);
			this.List.Get(index).Message(16, value);
			return 1;
		}
	case 43:
		if (this.NotifyTimer)
			timer.kill(this.NotifyTimer);
		this.NotifyTimer = 0;
		if (value > 0.0)
			this.NotifyTimer = timer.set(value, this, TLightGroup.NotifyTimerExpired);
		break;
	case 44:
		{
			let countSub1 = this.List.GetCount() - 1;
			for (let index = countSub1; index >= 0; index--)
			{
				let light = this.List.Get(index);
				if (light.BmpIndex1)
				{
					light.Message(0, 0.0);
					light.Message(16, value);
				}
			}

			break;
		}
	case 45:
		{
			let count = this.List.GetCount();
			control.handler(code, this);
			let index = Math.trunc(Math.floor(value));
			if (index >= 0 && index < count)
			{
				
				for (let i = count - 1; i > index; i--)
				{
					this.List.Get(i).Message(20, 0.0);
				}

				
				for (let i = index; i >= 0; i--)
				{
					this.List.Get(i).Message(19, 0.0);
				}
			}
			break;
		}
	case 46:
		{
			let index = this.next_light_down();
			if (index >= 0)
			{
				this.List.Get(index).Message(4, 0.0);
			}
			break;
		}
	default:
		for (let index = this.List.GetCount() - 1; index >= 0; index--)
		{
			this.List.Get(index).Message(code, value);
		}
		break;
	}
	return 0;

};

TLightGroup.prototype.Reset = function() {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.Timer)
		timer.kill(this.Timer);
	this.Timer = 0;
	if (this.NotifyTimer)
		timer.kill(this.NotifyTimer);
	this.NotifyTimer = 0;
	this.MessageField2 = 0;
	this.AnimationFlag = 0;
	this.Timer1Time = this.Timer1TimeDefault;

};

TLightGroup.prototype.reschedule_animation = function(time) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.Timer)
		timer.kill(this.Timer);
	this.Timer = 0;
	if (time == 0)
	{
		this.MessageField2 = 0;
		this.AnimationFlag = 0;
		return;
	}

	this.Timer1Time = time > 0.0 ? time : this.Timer1TimeDefault;
	this.Timer = timer.set(this.Timer1Time, this, TLightGroup.TimerExpired);

};

TLightGroup.prototype.start_animation = function() {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	for (let index = this.List.GetCount() - 1; index >= 0; --index)
	{
		let light = this.List.Get(index);
		if (light.BmpIndex1)
			light.Message(9, 0.0);
		else
			light.Message(8, 0.0);
	}

};

TLightGroup.prototype.next_light_up = function() {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	for (let index = 0; index < this.List.GetCount(); ++index)
	{
		if (!this.List.Get(index).BmpIndex1)
			return index;
	}
	return -1;

};

TLightGroup.prototype.next_light_down = function() {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	for (let index = this.List.GetCount() - 1; index >= 0; --index)
	{
		if (this.List.Get(index).BmpIndex1)
			return index;
	}
	return -1;

};

TLightGroup.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let group = caller;
	group.Timer = 0;
	group.Message(group.MessageField2, group.Timer1Time);

};

TLightGroup.NotifyTimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let group = caller;
	group.NotifyTimer = 0;
	control.handler(61, group);

};

TLightBargraph.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	switch (code)
	{
	case 37:
		return this.TimeIndex;
	case 45:
		{
			if (this.TimerBargraph)
			{
				timer.kill(this.TimerBargraph);
				this.TimerBargraph = 0;
			}
			let timeIndex = Math.trunc(Math.floor(value));
			let maxCount = 2 * this.List.GetCount();
			if (timeIndex >= maxCount)
				timeIndex = maxCount - 1;
			if (timeIndex >= 0)
			{
				TLightGroup.prototype.Message.call(this, 45, (Math.trunc(timeIndex / 2)));
				if (!(timeIndex & 1))
					TLightGroup.prototype.Message.call(this, 46, 0.0);
				let timeArray = this.TimerTimeArray;
				if (timeArray)
					this.TimerBargraph = timer.set(timeArray[timeIndex], this, TLightBargraph.BargraphTimerExpired);
				this.TimeIndex = timeIndex;
			}
			else
			{
				TLightGroup.prototype.Message.call(this, 20, 0.0);
				this.TimeIndex = 0;
			}
			break;
		}
	case 1011:
		this.Reset();
		break;
	case 1020:
		if (this.TimerBargraph)
		{
			timer.kill(this.TimerBargraph);
			this.TimerBargraph = 0;
		}
		this.PlayerTimerIndexBackup[this.PinballTable.CurrentPlayer] = this.TimeIndex;
		this.Reset();
		this.TimeIndex = this.PlayerTimerIndexBackup[Math.trunc(Math.floor(value))];
		if (this.TimeIndex)
		{
			TLightBargraph.prototype.Message.call(this, 45, (this.TimeIndex));
		}
		break;
	case 1024:
		{
			this.Reset();
			let playerPtrIndex = 0; let playerPtr = this.PlayerTimerIndexBackup[playerPtrIndex];
			for (let index = 0; index < this.PinballTable.PlayerCount; ++index)
			{
				this.PlayerTimerIndexBackup[playerPtrIndex] = this.TimeIndex;

				playerPtr = this.PlayerTimerIndexBackup[++playerPtrIndex];
			}
			TLightGroup.prototype.Message.call(this, 1024, value);
			break;
		}
	default:
		TLightGroup.prototype.Message.call(this, code, value);
		break;
	}
	return 0;

};

TLightBargraph.prototype.Reset = function() {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.TimerBargraph)
	{
		timer.kill(this.TimerBargraph);
		this.TimerBargraph = 0;
	}
	this.TimeIndex = 0;
	TLightGroup.prototype.Reset.call(this);

};

TLightBargraph.BargraphTimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let bar = caller;
	bar.TimerBargraph = 0;
	if (bar.TimeIndex)
	{
		bar.Message(45, (bar.TimeIndex - 1));
		control.handler(60, bar);
	}
	else
	{
		bar.Message(20, 0.0);
		control.handler(47, bar);
	}

};

TBumper.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	switch (code)
	{
	case 11:
		{
			let nextBmp = Math.trunc(Math.floor(value));
			if (2 * nextBmp > this.ListBitmap.GetCount() - 1)
				nextBmp = Math.trunc((this.ListBitmap.GetCount() - 1) / 2);
			if (nextBmp < 0)
				nextBmp = 0;
			if (nextBmp != this.BmpIndex)
			{
				if (nextBmp >= this.BmpIndex)
					loader.play_sound(this.SoundIndex4);
				if (nextBmp < this.BmpIndex)
					loader.play_sound(this.SoundIndex3);
				this.BmpIndex = nextBmp;
				this.Fire();
				control.handler(11, this);
			}
			break;
		}
	case 12:
		{
			let nextBmp = this.BmpIndex + 1;
			let maxBmp = this.ListBitmap.GetCount() - 1;
			if (2 * nextBmp > maxBmp)
				nextBmp = Math.trunc(maxBmp / 2);
			TBumper.prototype.Message.call(this, 11, (nextBmp));
			break;
		}
	case 13:
		{
			let nextBmp = this.BmpIndex - 1;
			if (nextBmp < 0)
				nextBmp = 0;
			TBumper.prototype.Message.call(this, 11, (nextBmp));
			break;
		}
	case 1020:
		{
			let playerPtr = this.PlayerData[this.PinballTable.CurrentPlayer];
			playerPtr.BmpIndex = this.BmpIndex;
			playerPtr.MessageField = this.MessageField;

			playerPtr = this.PlayerData[Math.trunc(Math.floor(value))];
			this.BmpIndex = playerPtr.BmpIndex;
			this.MessageField = playerPtr.MessageField;
			TBumper.prototype.Message.call(this, 11, (this.BmpIndex));
			break;
		}
	case 1024:
		{
			if (this.Timer)
			{
				timer.kill(this.Timer);
				TBumper.TimerExpired(this.Timer, this);
			}
			this.BmpIndex = 0;
			this.MessageField = 0;
			let playerPtrIndex = 0; let playerPtr = this.PlayerData[playerPtrIndex];
			for (let index = 0; index < this.PinballTable.PlayerCount; ++index)
			{
				playerPtr.BmpIndex = 0;
				playerPtr.MessageField = 0;
				playerPtr = this.PlayerData[++playerPtrIndex];
			}
			TBumper.TimerExpired(0, this);
			break;
		}
	default:
		break;
	}

	return 0;

};

TBumper.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.DefaultCollision(ball, nextPosition, direction))
	{
		this.Fire();
		control.handler(63, this);
	}

};

TBumper.prototype.put_scoring = function(index, score) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (index < 4)
		this.Scores[index] = score;

};

TBumper.prototype.get_scoring = function(index) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return index < 4 ? this.Scores[index] : 0;

};

TBumper.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let bump = caller;
	let bmp = bump.ListBitmap.Get(bump.BmpIndex * 2);
	let zMap = bump.ListZMap.Get(bump.BmpIndex * 2);
	bump.Timer = 0;
	render.sprite_set(
		bump.RenderSprite,
		bmp,
		zMap,
		bmp.XPosition - bump.PinballTable.XOffset,
		bmp.YPosition - bump.PinballTable.YOffset);
	bump.Threshold = bump.OriginalThreshold;

};

TBumper.prototype.Fire = function() {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	let bmpIndex = 2 * this.BmpIndex + 1;
	let bmp = this.ListBitmap.Get(bmpIndex);
	let zMap = this.ListZMap.Get(bmpIndex);
	render.sprite_set(
		this.RenderSprite,
		bmp,
		zMap,
		bmp.XPosition - this.PinballTable.XOffset,
		bmp.YPosition - this.PinballTable.YOffset);
	this.Timer = timer.set(this.TimerTime, this, TBumper.TimerExpired);
	this.Threshold = 1000000000.0;

};

TPopupTarget.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	switch (code)
	{
	case 49:
		this.ActiveFlag = 0;
		render.sprite_set_bitmap(this.RenderSprite, null);
		break;
	case 50:
		this.Timer = timer.set(this.TimerTime, this, TPopupTarget.TimerExpired);
		break;
	case 1020:
		this.PlayerMessagefieldBackup[this.PinballTable.CurrentPlayer] = this.MessageField;
		this.MessageField = this.PlayerMessagefieldBackup[Math.trunc(Math.floor(value))];
		TPopupTarget.prototype.Message.call(this, 50 - (this.MessageField != 0), 0.0);
		break;
	case 1024:
		{
			this.MessageField = 0;
			let playerPtrIndex = 0; let playerPtr = this.PlayerMessagefieldBackup[playerPtrIndex];
			for (let index = 0; index < this.PinballTable.PlayerCount; ++index)
			{
				this.PlayerMessagefieldBackup[playerPtrIndex] = 0;
				playerPtr = this.PlayerMessagefieldBackup[++playerPtrIndex];
			}

			if (this.Timer)
				timer.kill(this.Timer);
			TPopupTarget.TimerExpired(0, this);
			break;
		}
	default:
		break;
	}
	return 0;

};

TPopupTarget.prototype.put_scoring = function(index, score) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (index < 3)
		this.Scores[index] = score;

};

TPopupTarget.prototype.get_scoring = function(index) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return index < 3 ? this.Scores[index] : 0;

};

TPopupTarget.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.PinballTable.TiltLockFlag)
	{
		maths.basic_collision(ball, nextPosition, direction, this.Elasticity, this.Smoothness, 1000000000.0, 0.0);
	}
	else if (maths.basic_collision(
		ball,
		nextPosition,
		direction,
		this.Elasticity,
		this.Smoothness,
		this.Threshold,
		this.Boost) > this.Threshold)
	{
		if (this.HardHitSoundId)
			loader.play_sound(this.HardHitSoundId);
		this.Message(49, 0.0);
		control.handler(63, this);
	}

};

TPopupTarget.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let target = caller;
	target.Timer = 0;
	target.ActiveFlag = 1;
	render.sprite_set_bitmap(target.RenderSprite, target.ListBitmap.Get(0));
	if (timerId)
	{
		if (target.SoftHitSoundId)
			loader.play_sound(target.SoftHitSoundId);
	}

};

TGate.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (code != 1020)
	{
		if (code == 53)
		{
			this.ActiveFlag = 0;
			render.sprite_set_bitmap(this.RenderSprite, null);
			loader.play_sound(this.SoundIndex3);
		}
		else if (code == 54 || code == 1024)
		{
			this.ActiveFlag = 1;
			render.sprite_set_bitmap(this.RenderSprite, this.ListBitmap.Get(0));
			if (code == 54)
				loader.play_sound(this.SoundIndex4);
		}
		control.handler(code, this);
	}
	return 0;

};

TBlocker.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	switch (code)
	{
	case 1011:
	case 1020:
	case 1024:
	case 51:
		if (this.Timer)
		{
			timer.kill(this.Timer);
			this.Timer = 0;
		}
		this.MessageField = 0;
		this.ActiveFlag = 0;
		render.sprite_set_bitmap(this.RenderSprite, null);
		if (code == 51)
			loader.play_sound(this.SoundIndex3);
		return 0;
	case 52:
		this.ActiveFlag = 1;
		loader.play_sound(this.SoundIndex4);
		render.sprite_set_bitmap(this.RenderSprite, this.ListBitmap.Get(0));
		break;
	case 59:
		break;
	default:
		return 0;
	}
	if (this.Timer)
		timer.kill(this.Timer);

	let timerTime;
	if (value <= 0.0)
		timerTime = 0.0;
	else
		timerTime = value;
	this.Timer = timer.set(timerTime, this, TBlocker.TimerExpired);
	return 0;

};

TBlocker.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let blocker = caller;
	blocker.Timer = 0;
	control.handler(60, blocker);

};

TKickback.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if ((code == 1011 || code == 1024) && this.Timer)
	{
		timer.kill(this.Timer);
		if (this.ListBitmap)
			render.sprite_set_bitmap(this.RenderSprite, null);
		this.Timer = 0;
		this.KickbackActiveFlag = 0;
		this.Threshold = 1000000000.0;
	}
	return 0;

};

TKickback.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.PinballTable.TiltLockFlag)
	{
		maths.basic_collision(ball, nextPosition, direction, this.Elasticity, this.Smoothness, 0.0,
		                       this.Boost);
	}
	else
	{
		if (!this.KickbackActiveFlag)
		{
			this.Threshold = 1000000000.0;
			this.KickbackActiveFlag = 1;
			this.Timer = timer.set(this.TimerTime, this, TKickback.TimerExpired);
		}
		if (this.DefaultCollision(ball, nextPosition, direction))
			this.KickbackActiveFlag = 0;
	}

};

TKickback.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let kick = caller;

	if (kick.KickbackActiveFlag)
	{
		kick.Threshold = 0.0;
		kick.Timer = timer.set(kick.TimerTime2, kick, TKickback.TimerExpired);
		loader.play_sound(kick.HardHitSoundId);
		if (kick.ListBitmap)
		{
			let bmp = kick.ListBitmap.Get(1);
			let zMap = kick.ListZMap.Get(1);
			render.sprite_set(
				kick.RenderSprite,
				bmp,
				zMap,
				bmp.XPosition - kick.PinballTable.XOffset,
				bmp.YPosition - kick.PinballTable.YOffset);
		}
	}
	else
	{
		if (kick.ListBitmap)
		{
			let bmp = kick.ListBitmap.Get(0);
			let zMap = kick.ListZMap.Get(0);
			render.sprite_set(
				kick.RenderSprite,
				bmp,
				zMap,
				bmp.XPosition - kick.PinballTable.XOffset,
				bmp.YPosition - kick.PinballTable.YOffset);
		}
		kick.Timer = 0;
		control.handler(60, kick);
	}

};

TSoloTarget.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	switch (code)
	{
	case 49:
	case 50:
		this.ActiveFlag = code == 50;
		break;
	case 1024:
		if (this.Timer)
			timer.kill(this.Timer);
		this.Timer = 0;
		this.ActiveFlag = 1;
		break;
	default:
		return 0;
	}

	if (this.ListBitmap)
	{
		let index = 1 - this.ActiveFlag;
		let bmp = this.ListBitmap.Get(index);
		let zMap = this.ListZMap.Get(index);
		render.sprite_set(
			this.RenderSprite,
			bmp,
			zMap,
			bmp.XPosition - this.PinballTable.XOffset,
			bmp.YPosition - this.PinballTable.YOffset);
	}

	return 0;

};

TSoloTarget.prototype.put_scoring = function(index, score) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (index < 1)
		this.Scores[index] = score;

};

TSoloTarget.prototype.get_scoring = function(index) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return index < 1 ? this.Scores[index] : 0;

};

TSoloTarget.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.DefaultCollision(ball, nextPosition, direction))
	{
		this.Message(49, 0.0);
		this.Timer = timer.set(this.TimerTime, this, TSoloTarget.TimerExpired);
		control.handler(63, this);
	}

};

TSoloTarget.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let target = caller;
	target.Message(50, 0.0);
	target.Timer = 0;

};

TWall.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (code == 1024 && this.Timer)
	{
		timer.kill(this.Timer);
		TWall.TimerExpired(this.Timer, this);
	}
	return 0;

};

TWall.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.DefaultCollision(ball, nextPosition, direction))
	{
		if (this.BmpPtr)
		{
			render.sprite_set_bitmap(this.RenderSprite, this.BmpPtr);
			this.Timer = timer.set(0.1, this, TWall.TimerExpired);
		}
		control.handler(63, this);
	}

};

TWall.prototype.put_scoring = function(index, score) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (index < 1)
		this.Scores[index] = score;

};

TWall.prototype.get_scoring = function(index) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return index < 1 ? this.Scores[index] : 0;

};

TWall.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let wall = caller;
	render.sprite_set_bitmap(wall.RenderSprite, null);
	wall.Timer = 0;
	wall.MessageField = 0;

};

TFlagSpinner.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (code == 1024)
	{
		if (this.Timer)
		{
			timer.kill(this.Timer);
			this.Timer = 0;
		}
		this.BmpIndex = 0;
		let bmp = this.ListBitmap.Get(0);
		let zMap = this.ListZMap.Get(0);
		render.sprite_set(
			this.RenderSprite,
			bmp,
			zMap,
			bmp.XPosition - this.PinballTable.XOffset,
			bmp.YPosition - this.PinballTable.YOffset);
	}
	return 0;

};

TFlagSpinner.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	ball.Position.X = nextPosition.X;
	ball.Position.Y = nextPosition.Y;
	ball.RayMaxDistance = ball.RayMaxDistance - coef;
	ball.not_again(edge);

	this.SpinDirection = 2 * (this.PrevCollider != edge) - 1;
	if (ball.Speed == 0.0)
		this.Speed = this.MinSpeed;
	else
		this.Speed = ball.Speed * 20.0;
	if (this.Speed < this.MinSpeed)
		this.Speed = this.MinSpeed;
	if (this.Speed > this.MaxSpeed)
		this.Speed = this.MaxSpeed;
	this.NextFrame();

};

TFlagSpinner.prototype.put_scoring = function(index, score) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (index < 2)
		this.Scores[index] = score;

};

TFlagSpinner.prototype.get_scoring = function(index) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return index < 2 ? this.Scores[index] : 0;

};

TFlagSpinner.prototype.NextFrame = function() {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	this.BmpIndex += this.SpinDirection;
	let bmpIndex = this.BmpIndex;
	let bmpCount = this.ListBitmap.GetCount();
	if (bmpIndex >= bmpCount)
		this.BmpIndex = 0;
	else if (bmpIndex < 0)
		this.BmpIndex = bmpCount - 1;

	if (!this.PinballTable.TiltLockFlag)
	{
		control.handler(63, this);
		if (this.SoftHitSoundId)
			loader.play_sound(this.SoftHitSoundId);
		if (!this.BmpIndex)
			control.handler(62, this);
	}

	let bmp = this.ListBitmap.Get(this.BmpIndex);
	let zMap = this.ListZMap.Get(this.BmpIndex);
	render.sprite_set(
		this.RenderSprite,
		bmp,
		zMap,
		bmp.XPosition - this.PinballTable.XOffset,
		bmp.YPosition - this.PinballTable.YOffset);

	this.Speed *= this.SpeedDecrement;
	if (this.Speed >= this.MinSpeed)
	{
		timer.set(1.0 / this.Speed, this, TFlagSpinner.SpinTimer);
	}

};

TFlagSpinner.SpinTimer = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let spinner = caller;
	spinner.Timer = 0;
	spinner.NextFrame();

};

TRollover.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (code == 1024)
	{
		this.ActiveFlag = 1;
		this.RolloverFlag = 0;
		if (this.ListBitmap)
			render.sprite_set_bitmap(this.RenderSprite, this.ListBitmap.Get(0));
	}
	return 0;

};

TRollover.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	ball.Position.X = nextPosition.X;
	ball.Position.Y = nextPosition.Y;
	ball.RayMaxDistance -= coef;
	ball.not_again(edge);
	let bmp = null;
	if (!this.PinballTable.TiltLockFlag)
	{
		if (this.RolloverFlag)
		{
			timer.set(0.1, this, TRollover.TimerExpired);
			this.ActiveFlag = 0;
		}
		else
		{
			loader.play_sound(this.SoftHitSoundId);
			control.handler(63, this);
		}
		this.RolloverFlag = this.RolloverFlag == 0;
		if (this.ListBitmap)
		{
			if (!this.RolloverFlag)
				bmp = this.ListBitmap.Get(0);
			render.sprite_set_bitmap(this.RenderSprite, bmp);
		}
	}

};

TRollover.prototype.put_scoring = function(index, score) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (index < 2)
		this.Scores[index] = score;

};

TRollover.prototype.get_scoring = function(index) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return index < 2 ? this.Scores[index] : 0;

};

TRollover.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let roll = caller;
	roll.ActiveFlag = 1;

};

TLightRollover.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (code == 1024)
	{
		this.ActiveFlag = 1;
		this.RolloverFlag = 0;
		if (this.Timer)
			timer.kill(this.Timer);
		this.Timer = 0;
		if (this.ListBitmap)
			render.sprite_set_bitmap(this.RenderSprite, null);
	}
	return 0;

};

TLightRollover.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	ball.Position.X = nextPosition.X;
	ball.Position.Y = nextPosition.Y;
	ball.RayMaxDistance -= coef;
	ball.not_again(edge);
	if (!this.PinballTable.TiltLockFlag)
	{
		if (this.RolloverFlag)
		{
			timer.set(0.1, this, TRollover.TimerExpired);
			this.ActiveFlag = 0;
			this.RolloverFlag = this.RolloverFlag == 0;
			if (this.Timer == 0)
				this.Timer = timer.set(this.FloatArr, this, TLightRollover.delay_expired);
		}
		else
		{
			loader.play_sound(this.SoftHitSoundId);
			control.handler(63, this);
			this.RolloverFlag = this.RolloverFlag == 0;
			if (this.ListBitmap)
				render.sprite_set_bitmap(this.RenderSprite, this.ListBitmap.Get(0));
		}
	}

};

TLightRollover.delay_expired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let roll = caller;
	render.sprite_set_bitmap(roll.RenderSprite, null);
	roll.Timer = 0;

};

TTripwire.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	ball.Position.X = nextPosition.X;
	ball.Position.Y = nextPosition.Y;
	ball.RayMaxDistance -= coef;
	ball.not_again(edge);
	if (!this.PinballTable.TiltLockFlag)
	{
		loader.play_sound(this.SoftHitSoundId);
		control.handler(63, this);
	}

};

TOneway.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (edge == this.Line)
	{
		ball.not_again(edge);
		ball.Position.X = nextPosition.X;
		ball.Position.Y = nextPosition.Y;
		ball.RayMaxDistance -= coef;
		if (!this.PinballTable.TiltLockFlag)
		{
			if (this.HardHitSoundId)
				loader.play_sound(this.HardHitSoundId);
			control.handler(63, this);
		}
	}
	else if (this.PinballTable.TiltLockFlag)
	{
		maths.basic_collision(ball, nextPosition, direction, this.Elasticity, this.Smoothness, 1000000000.0, 0.0);
	}
	else if (maths.basic_collision(
		ball,
		nextPosition,
		direction,
		this.Elasticity,
		this.Smoothness,
		this.Threshold,
		this.Boost) > 0.2)
	{
		if (this.SoftHitSoundId)
			loader.play_sound(this.SoftHitSoundId);
	}

};

TOneway.prototype.put_scoring = function(index, score) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (index < 6)
		this.Scores[index] = score;

};

TOneway.prototype.get_scoring = function(index) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return index < 6 ? this.Scores[index] : 0;

};

THole.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (code == 1024 && this.BallCapturedFlag)
	{
		if (this.Timer)
			timer.kill(this.Timer);
		this.Timer = 0;
		this.BallCapturedSecondStage = 1;
	}
	return 0;

};

THole.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (!this.BallCapturedFlag)
	{
		this.BallCapturedSecondStage = 0;
		this.Threshold = 1000000000.0;
		this.BallCapturedFlag = 1;
		ball.CollisionComp = this;
		ball.Position.X = this.Circle.Center.X;
		ball.Position.Y = this.Circle.Center.Y;
		ball.Acceleration.Z = 0.0;
		this.Timer = timer.set(0.5, this, THole.TimerExpired);
		if (!this.PinballTable.TiltLockFlag)
		{
			loader.play_sound(this.HardHitSoundId);
			control.handler(57, this);
		}
	}

};

THole.prototype.FieldEffect = function(ball, vecDst) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	let result;
	let direction = vec();

	if (this.BallCapturedFlag)
	{
		if (this.BallCapturedSecondStage)
		{
			ball.Acceleration.Z -= this.PinballTable.GravityDirVectMult * ball.TimeDelta * this.GravityMult;
			ball.Position.Z += ball.Acceleration.Z;
			if (ball.Position.Z <= this.ZSetValue)
			{
				this.BallCapturedFlag = 0;
				this.BallCapturedSecondStage = 0;
				ball.Position.Z = this.ZSetValue;
				ball.Acceleration.Z = 0.0;
				ball.FieldFlag = this.FieldFlag;
				ball.Acceleration.Y = 0.0;
				ball.CollisionComp = null;
				ball.Acceleration.X = 0.0;
				ball.Speed = 0.0;
				loader.play_sound(this.SoftHitSoundId);
				control.handler(58, this);
			}
		}
		result = 0;
	}
	else
	{
		direction.X = this.Circle.Center.X - ball.Position.X;
		direction.Y = this.Circle.Center.Y - ball.Position.Y;
		if (direction.X * direction.X + direction.Y * direction.Y <= this.Circle.RadiusSq)
		{
			maths.normalize_2d(direction);
			vecDst.X = direction.X * this.GravityPull - ball.Acceleration.X * ball.Speed;
			vecDst.Y = direction.Y * this.GravityPull - ball.Acceleration.Y * ball.Speed;
			result = 1;
		}
		else
		{
			result = 0;
		}
	}
	return result;

};

THole.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let hole = caller;
	hole.Timer = 0;
	hole.BallCapturedSecondStage = 1;

};

TSink.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	switch (code)
	{
	case 56:
		if (value < 0.0)
			value = this.TimerTime;
		this.Timer = timer.set(value, this, TSink.TimerExpired);
		break;
	case 1020:
		this.PlayerMessagefieldBackup[this.PinballTable.CurrentPlayer] = this.MessageField;
		this.MessageField = this.PlayerMessagefieldBackup[Math.trunc(Math.floor(value))];
		break;
	case 1024:
		{
			if (this.Timer)
				timer.kill(this.Timer);
			this.Timer = 0;
			this.MessageField = 0;

			let playerPtrIndex = 0; let playerPtr = this.PlayerMessagefieldBackup[playerPtrIndex];
			for (let index = 0; index < this.PinballTable.PlayerCount; ++index)
			{
				this.PlayerMessagefieldBackup[playerPtrIndex] = 0;

				playerPtr = this.PlayerMessagefieldBackup[++playerPtrIndex];
			}

			break;
		}
	default:
		break;
	}
	return 0;

};

TSink.prototype.put_scoring = function(index, score) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (index < 3)
		this.Scores[index] = score;

};

TSink.prototype.get_scoring = function(index) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return index < 3 ? this.Scores[index] : 0;

};

TSink.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	this.Timer = 0;
	if (this.PinballTable.TiltLockFlag)
	{
		maths.basic_collision(ball, nextPosition, direction, this.Elasticity, this.Smoothness, 1000000000.0, 0.0);
	}
	else
	{
		ball.ActiveFlag = 0;
		render.sprite_set_bitmap(ball.RenderSprite, null);
		loader.play_sound(this.SoundIndex4);
		control.handler(63, this);
	}

};

TSink.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let sink = caller;
	let ball = sink.PinballTable.BallList.Get(0);
	ball.CollisionComp = null;
	ball.ActiveFlag = 1;
	ball.Position.X = sink.BallPosition.X;
	ball.Position.Y = sink.BallPosition.Y;
	physics.Ball.throw_ball(ball, sink.BallAcceleration, sink.ThrowAngleMult, sink.ThrowSpeedMult1,
	                  sink.ThrowSpeedMult2);
	if (sink.SoundIndex3)
		loader.play_sound(sink.SoundIndex3);
	sink.Timer = 0;

};

TKickout.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	switch (code)
	{
	case 55:
		if (this.KickFlag1)
		{
			if (value < 0.0)
				value = this.TimerTime1;
			this.Timer = timer.set(value, this, TKickout.TimerExpired);
		}
		break;
	case 1011:
		if (this.NotSomeFlag)
			this.ActiveFlag = 0;
		break;
	case 1024:
		if (this.KickFlag1)
		{
			if (this.Timer)
				timer.kill(this.Timer);
			TKickout.TimerExpired(0, this);
		}
		if (this.NotSomeFlag)
			this.ActiveFlag = 0;
		break;
	default:
		break;
	}

	return 0;

};

TKickout.prototype.put_scoring = function(index, score) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (index < 5)
		this.Scores[index] = score;

};

TKickout.prototype.get_scoring = function(index) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return index < 5 ? this.Scores[index] : 0;

};

TKickout.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (!this.KickFlag1)
	{
		this.Ball = ball;
		this.Threshold = 1000000000.0;
		this.KickFlag1 = 1;
		ball.CollisionComp = this;
		ball.Position.X = this.Circle.Center.X;
		ball.Position.Y = this.Circle.Center.Y;
		this.OriginalBallZ = ball.Position.Z;
		ball.Position.Z = this.CollisionBallSetZ;		
		if (this.PinballTable.TiltLockFlag)
		{
			this.Message(55, 0.1);
		}
		else
		{
			loader.play_sound(this.SoftHitSoundId);
			control.handler(63, this);
		}
	}

};

TKickout.prototype.FieldEffect = function(ball, dstVec) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	let direction = vec();

	if (this.KickFlag1)
		return 0;
	direction.X = this.Circle.Center.X - ball.Position.X;
	direction.Y = this.Circle.Center.Y - ball.Position.Y;
	if (direction.Y * direction.Y + direction.X * direction.X > this.Circle.RadiusSq)
		return 0;
	maths.normalize_2d(direction);
	dstVec.X = direction.X * this.FieldMult - ball.Acceleration.X * ball.Speed;
	dstVec.Y = direction.Y * this.FieldMult - ball.Acceleration.Y * ball.Speed;
	return 1;

};

TKickout.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let kick = caller;
	if (kick.KickFlag1)
	{
		kick.KickFlag1 = 0;
		kick.Timer = timer.set(kick.TimerTime2, kick, TKickout.ResetTimerExpired);
		if (kick.Ball)
		{		
			kick.Ball.Position.Z = kick.OriginalBallZ;
			physics.Ball.throw_ball(kick.Ball, kick.BallAcceleration, kick.ThrowAngleMult, kick.ThrowSpeedMult1,
			                  kick.ThrowSpeedMult2);
			kick.ActiveFlag = 0;
			kick.Ball = null;
			loader.play_sound(kick.HardHitSoundId);
		}
	}

};

TKickout.ResetTimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let kick = caller;
	if (!kick.NotSomeFlag)
		kick.ActiveFlag = 1;
	kick.Timer = 0;

};

TRamp.prototype.put_scoring = function(index, score) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (index < 4)
		this.Scores[index] = score;

};

TRamp.prototype.get_scoring = function(index) {
 index = Number(index);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return index < 4 ? this.Scores[index] : 0;

};

TRamp.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	ball.not_again(edge);
	ball.Position.X = nextPosition.X;
	ball.Position.Y = nextPosition.Y;
	ball.RayMaxDistance -= coef;

	let plane = edge.WallValue;
	if (plane)
	{
		ball.CollisionFlag = 1;
		ball.CollisionOffset.X = plane.BallCollisionOffset.X;
		ball.CollisionOffset.Y = plane.BallCollisionOffset.Y;
		ball.CollisionOffset.Z = plane.BallCollisionOffset.Z;
		ball.RampFieldForce.X = plane.FieldForce.X;
		ball.RampFieldForce.Y = plane.FieldForce.Y;
		ball.Position.Z = ball.Position.X * ball.CollisionOffset.X + ball.Position.Y * ball.CollisionOffset.Y +
			ball.Offset + ball.CollisionOffset.Z;
		ball.FieldFlag = this.CollisionGroup;
		return;
	}

	if (edge == this.Line1)
	{
		if (!this.PinballTable.TiltLockFlag)
		{
			loader.play_sound(this.SoftHitSoundId);
			control.handler(63, this);
		}
	}
	else
	{
		ball.CollisionFlag = 0;
		if (edge == this.Line2)
		{
			ball.FieldFlag = this.Wall1PointFirst;
			if (!this.RampFlag1)
				return;
			ball.Position.Z = ball.Offset + this.Wall1PointLast;
		}
		else
		{
			ball.FieldFlag = this.Wall2PointFirst;
			if (!this.RampFlag1)
				return;
			ball.Position.Z = ball.Offset + this.Wall2PointLast;
		}
	}

};

TRamp.prototype.FieldEffect = function(ball, vecDst) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	vecDst.X = ball.RampFieldForce.X - ball.Acceleration.X * ball.Speed * this.BallFieldMult;
	vecDst.Y = ball.RampFieldForce.Y - ball.Acceleration.Y * ball.Speed * this.BallFieldMult;
	return 1;

};

TTimer.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (code == 59)
	{
		if (this.Timer)
			timer.kill(this.Timer);
		this.Timer = timer.set(value, this, TTimer.TimerExpired);
	}
	else if (code == 1011 || code == 1022 || code == 1024)
	{
		if (this.Timer)
		{
			timer.kill(this.Timer);
			this.Timer = 0;
		}
	}
	return 0;

};

TTimer.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let localTimer = caller;
	localTimer.Timer = 0;
	control.handler(60, localTimer);

};

TComponentGroup.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (code == 48)
	{
		if (this.Timer)
		{
			timer.kill(this.Timer);
			this.Timer = 0;
		}
		if (value > 0.0)
			this.Timer = timer.set(value, this, TComponentGroup.NotifyTimerExpired);
	}
	else if (code <= 1007 || code > 1011 && code != 1020 && code != 1022)
	{
		for (let i = 0; i < this.List.GetCount(); i++)
		{
			this.List.Get(i).Message(code, value);
		}
	}
	return 0;

};

TComponentGroup.NotifyTimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let compGroup = caller;
	compGroup.Timer = 0;
	control.handler(61, compGroup);

};

TSound.prototype.Play = function() {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	return loader.play_sound(this.SoundIndex);

};

TPlunger.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.PinballTable.TiltLockFlag)
		this.Message(1017, 0.0);
	coef = random() * this.Boost * 0.1 + this.Boost;
	maths.basic_collision(ball, nextPosition, direction, this.Elasticity, this.Smoothness, this.Threshold, coef);

};

TPlunger.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	switch (code)
	{
	case 1004:
		if (!this.PullbackTimer_)
		{
			this.Boost = 0.0;
			this.Threshold = 1000000000.0;
			loader.play_sound(this.HardHitSoundId);
			TPlunger.PullbackTimer(0, this);
		}
		return 0;
	case 1005:
	case 1009:
	case 1010:
		{
			this.Threshold = 0.0;
			if (this.PullbackTimer_)
				timer.kill(this.PullbackTimer_);
			this.PullbackTimer_ = 0;
			if (code == 1005)
				loader.play_sound(this.SoundIndexP2);
			let bmp = this.ListBitmap.Get(0);
			let zMap = this.ListZMap.Get(0);
			render.sprite_set(
				this.RenderSprite,
				bmp,
				zMap,
				bmp.XPosition - this.PinballTable.XOffset,
				bmp.YPosition - this.PinballTable.YOffset);

			timer.set(this.Unknown4F, this, TPlunger.PlungerReleasedTimer);
			break;
		}
	case 1015:
		{
			let ball = this.PinballTable.BallList.Get(0);
			ball.Message(1024, 0.0);
			ball.Position.X = this.PinballTable.PlungerPositionX;
			ball.Position.Y = this.PinballTable.PlungerPositionY;
			ball.ActiveFlag = 1;
			this.PinballTable.BallInSink = 0;
			pb.tilt_no_more();
			control.handler(code, this);
			return 0;
		}
	case 1016:
		if (this.BallFeedTimer_)
			timer.kill(this.BallFeedTimer_);
		this.BallFeedTimer_ = timer.set(0.95999998, this, TPlunger.BallFeedTimer);
		loader.play_sound(this.SoundIndexP1);
		control.handler(code, this);
		return 0;
	case 1017:
		this.Threshold = 0.0;
		this.Boost = (this.MaxPullback);
		timer.set(0.2, this, TPlunger.PlungerReleasedTimer);
		break;
	case 1024:
		{
			if (this.BallFeedTimer_)
				timer.kill(this.BallFeedTimer_);
			this.BallFeedTimer_ = 0;
			this.Threshold = 0.0;
			if (this.PullbackTimer_)
				timer.kill(this.PullbackTimer_);
			this.PullbackTimer_ = 0;
			if (code == 1005)
				loader.play_sound(this.SoundIndexP2);
			let bmp = this.ListBitmap.Get(0);
			let zMap = this.ListZMap.Get(0);
			render.sprite_set(
				this.RenderSprite,
				bmp,
				zMap,
				bmp.XPosition - this.PinballTable.XOffset,
				bmp.YPosition - this.PinballTable.YOffset);

			timer.set(this.Unknown4F, this, TPlunger.PlungerReleasedTimer);
			break;
		}
	default:
		break;
	}
	return 0;

};

TPlunger.BallFeedTimer = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let plunger = caller;
	plunger.PullbackTimer_ = 0;
	plunger.Message(1015, 0.0);

};

TPlunger.PullbackTimer = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let plunger = caller;
	plunger.Boost += (plunger.PullbackIncrement);
	if (plunger.Boost <= (plunger.MaxPullback))
	{
		plunger.PullbackTimer_ = timer.set(plunger.Unknown4F, plunger, TPlunger.PullbackTimer);
	}
	else
	{
		plunger.PullbackTimer_ = 0;
		plunger.Boost = (plunger.MaxPullback);
	}
	let index = Math.trunc(Math.floor(
		(plunger.ListBitmap.GetCount() - 1) *
		(plunger.Boost / (plunger.MaxPullback))));
	let bmp = plunger.ListBitmap.Get(index);
	let zMap = plunger.ListZMap.Get(index);
	render.sprite_set(
		plunger.RenderSprite,
		bmp,
		zMap,
		bmp.XPosition - plunger.PinballTable.XOffset,
		bmp.YPosition - plunger.PinballTable.YOffset);

};

TPlunger.PlungerReleasedTimer = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let plunger = caller;
	plunger.Threshold = 1000000000.0;
	plunger.Boost = 0.0;

};

TFlipper.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (code == 1 || code == 2 || code > 1008 && code <= 1011 || code == 1022)
	{
		let timerTime;
		let command = code;
		if (code == 1)
		{
			control.handler(1, this);
			this.TimerTime = this.ExtendAnimationFrameTime;
			loader.play_sound(this.HardHitSoundId);
		}
		else if (code == 2)
		{
			this.TimerTime = this.RetractAnimationFrameTime;
			loader.play_sound(this.SoftHitSoundId);
		}
		else
		{
			
			command = 2;
			this.TimerTime = this.RetractAnimationFrameTime;
		}

		if (this.MessageField)
		{
			
			let inputDt = value - this.FlipperEdge.InputTime;
			timerTime = inputDt - Math.floor(inputDt / this.TimerTime) * this.TimerTime;
			if (timerTime < 0.0)
				timerTime = 0.0;
		}
		else
		{
			timerTime = this.TimerTime;
		}

		this.MessageField = command;
		this.InputTime = value;
		if (this.Timer)
			timer.kill(this.Timer);
		this.Timer = timer.set(timerTime, this, TFlipper.TimerExpired);
		this.FlipperEdge.SetMotion(command, value);
	}

	if (code == 1020 || code == 1024)
	{
		if (this.MessageField)
		{
			if (this.Timer)
				timer.kill(this.Timer);
			this.BmpIndex = -1;
			this.MessageField = 2;
			TFlipper.TimerExpired(this.Timer, this);
			this.FlipperEdge.SetMotion(code, value);
		}
	}
	return 0;

};

TFlipper.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;


};

TFlipper.TimerExpired = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let flip = caller;
	let bmpCountSub1 = flip.ListBitmap.GetCount() - 1;

	let newBmpIndex = Math.trunc(Math.floor((pb.time_now - flip.InputTime) / flip.TimerTime));
	if (newBmpIndex > bmpCountSub1)
		newBmpIndex = bmpCountSub1;
	if (newBmpIndex < 0)
		newBmpIndex = 0;

	let bmpIndexOutOfBounds = false;
	if (flip.MessageField == 1)
	{
		flip.BmpIndex = newBmpIndex;
		if (flip.BmpIndex >= bmpCountSub1)
		{
			flip.BmpIndex = bmpCountSub1;
			bmpIndexOutOfBounds = true;
		}
	}
	if (flip.MessageField == 2)
	{
		flip.BmpIndex = bmpCountSub1 - newBmpIndex;
		if (flip.BmpIndex <= 0)
		{
			flip.BmpIndex = 0;
			bmpIndexOutOfBounds = true;
		}
	}

	if (bmpIndexOutOfBounds)
	{
		flip.MessageField = 0;
		flip.Timer = 0;
	}
	else
	{
		flip.Timer = timer.set(flip.TimerTime, flip, TFlipper.TimerExpired);
	}

	let bmp = flip.ListBitmap.Get(flip.BmpIndex);
	let zMap = flip.ListZMap.Get(flip.BmpIndex);
	render.sprite_set(
		flip.RenderSprite,
		bmp,
		zMap,
		bmp.XPosition - flip.PinballTable.XOffset,
		bmp.YPosition - flip.PinballTable.YOffset);

};

TDemo.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	switch (code)
	{
	case 1014:
		if (this.RestartGameTimer)
			timer.kill(this.RestartGameTimer);
		this.RestartGameTimer = 0;
		break;
	case 1022:
		if (this.RestartGameTimer)
			timer.kill(this.RestartGameTimer);
		this.RestartGameTimer = 0;
		if (this.ActiveFlag != 0)
			this.RestartGameTimer = timer.set(5.0, this, TDemo.NewGameRestartTimer);
		break;
	case 1024:
		if (this.FlipLeftTimer)
			timer.kill(this.FlipLeftTimer);
		this.FlipLeftTimer = 0;
		if (this.FlipRightTimer)
			timer.kill(this.FlipRightTimer);
		this.FlipRightTimer = 0;

		if (this.FlipLeftFlag != 0)
			TDemo.UnFlipLeft(0, this);
		if (this.FlipRightFlag)
			TDemo.UnFlipRight(0, this);
		if (this.PlungerFlag)
			TDemo.PlungerRelease(0, this);
		break;
	default:
		break;
	}
	return 0;

};

TDemo.prototype.Collision = function(ball, nextPosition, direction, coef, edge) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	ball.not_again(edge);
	ball.Position.X = nextPosition.X;
	ball.Position.Y = nextPosition.Y;
	ball.RayMaxDistance -= coef;

	switch (Math.trunc(edge.WallValue))
	{
	case 1400:
		if (!this.FlipLeftTimer && !this.FlipLeftFlag)
		{
			let time = this.FlipTimerTime1 + this.FlipTimerTime2 - random() * (this.FlipTimerTime2 + this.FlipTimerTime2);
			this.FlipLeftTimer = timer.set(time, this, TDemo.FlipLeft);
		}
		break;
	case 1401:
		TDemo.FlipLeft(0, this);
		break;
	case 1402:
		if (!this.FlipRightTimer && !this.FlipRightFlag)
		{
			let time = this.FlipTimerTime1 + this.FlipTimerTime2 - random() * (this.FlipTimerTime2 + this.FlipTimerTime2);
			this.FlipRightTimer = timer.set(time, this, TDemo.FlipRight);
		}
		break;
	case 1403:
		TDemo.FlipRight(0, this);
		break;
	case 1404:
		if (!this.PlungerFlag)
		{
			this.PinballTable.Message(1004, ball.TimeNow);
			let time = random() + 2.0;
			this.PlungerFlag = timer.set(time, this, TDemo.PlungerRelease);
		}
		break;
	default:
		break;
	}

};

TDemo.PlungerRelease = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let demo = caller;
	demo.PlungerFlag = 0;
	demo.PinballTable.Message(1005, pb.time_next);

};

TDemo.UnFlipRight = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let demo = caller;
	if (demo.FlipRightFlag)
		demo.PinballTable.Message(1003, pb.time_next);
	demo.FlipRightFlag = 0;

};

TDemo.UnFlipLeft = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let demo = caller;
	if (demo.FlipLeftFlag)
		demo.PinballTable.Message(1001, pb.time_next);
	demo.FlipLeftFlag = 0;

};

TDemo.FlipRight = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let demo = caller;
	if (!demo.FlipRightFlag)
	{
		if (demo.FlipRightTimer)
		{
			timer.kill(demo.FlipRightTimer);
			demo.FlipRightTimer = 0;
		}
		demo.PinballTable.Message(1002, pb.time_next);
		demo.FlipRightFlag = 1;
		let time = demo.UnFlipTimerTime1 + demo.UnFlipTimerTime2 - random() *
			(demo.UnFlipTimerTime2 + demo.UnFlipTimerTime2);
		timer.set(time, demo, TDemo.UnFlipRight);
	}

};

TDemo.FlipLeft = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let demo = caller;
	if (!demo.FlipLeftFlag)
	{
		if (demo.FlipLeftTimer)
		{
			timer.kill(demo.FlipLeftTimer);
			demo.FlipLeftTimer = 0;
		}
		demo.PinballTable.Message(1000, pb.time_next);
		demo.FlipLeftFlag = 1;
		let time = demo.UnFlipTimerTime1 + demo.UnFlipTimerTime2 - random() *
			(demo.UnFlipTimerTime2 + demo.UnFlipTimerTime2);
		timer.set(time, demo, TDemo.UnFlipLeft);
	}

};

TDemo.NewGameRestartTimer = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let demo = caller;
	pb.replay_level(1);
	demo.PinballTable.Message(1014, (demo.PinballTable.PlayerCount));
	demo.RestartGameTimer = 0;

};

TPinballTable.prototype.AddScore = function(score) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (this.ScoreSpecial3Flag)
	{
		this.ScoreSpecial3 += score;
		if (this.ScoreSpecial3 > 5000000)
			this.ScoreSpecial3 = 5000000;
	}
	if (this.ScoreSpecial2Flag)
	{
		this.ScoreSpecial2 += score;
		if (this.ScoreSpecial2 > 5000000)
			this.ScoreSpecial2 = 5000000;
	}
	let addedScore = this.ScoreAdded + score * scoreMultipliers[this.ScoreMultiplier];
	this.CurScore += addedScore;
	if (this.CurScore > 1000000000)
	{
		++this.CurScoreE9;
		this.CurScore = this.CurScore - 1000000000;
	}
	scoreRuntime.set(this.CurScoreStruct, this.CurScore);
	return addedScore;

};

TPinballTable.prototype.ChangeBallCount = function(count) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	this.BallCount = count;
	if (count <= 0)
	{
		scoreRuntime.erase(this.ScoreBallcount, 1);
	}
	else
	{
		scoreRuntime.set(this.ScoreBallcount, this.MaxBallCount - count + 1);
		scoreRuntime.update(this.ScoreBallcount);
	}

};

TPinballTable.prototype.tilt = function(time) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	if (!this.TiltLockFlag && !this.BallInSink)
	{
		pinball.InfoTextBox.Clear();
		pinball.MissTextBox.Clear();
		pinball.InfoTextBox.Display(pinball.get_rc_string(35, 0), -1.0);
		loader.play_sound(this.SoundIndex3);
		this.TiltTimeoutTimer = timer.set(30.0, this, TPinballTable.tilt_timeout);

		for (let i = 0; i < this.ComponentList.GetCount(); i++)
		{
			this.ComponentList.Get(i).Message(1011, time);
		}
		this.LightGroup.Message(8, 0);
		this.TiltLockFlag = 1;
		control.table_control_handler(1011);
	}

};

TPinballTable.prototype.Message = function(code, value) {
 code = Number(code);
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = this.runtime;

	let rc_text;
	switch (code)
	{
	case 1000:
		if (!this.TiltLockFlag)
		{
			this.FlipperL.Message(1, value);
		}
		break;
	case 1001:
		if (!this.TiltLockFlag)
		{
			this.FlipperL.Message(2, value);
		}
		break;
	case 1002:
		if (!this.TiltLockFlag)
		{
			this.FlipperR.Message(1, value);
		}
		break;
	case 1003:
		if (!this.TiltLockFlag)
		{
			this.FlipperR.Message(2, value);
		}
		break;
	case 1004:
	case 1005:
		this.Plunger.Message(code, value);
		break;
	case 1008:
	case 1009:
	case 1010:
		for (let i = 0; i < this.ComponentList.GetCount(); i++)
		{
			this.ComponentList.Get(i).Message(code, value);
		}
		break;
	case 1012:
		this.LightGroup.Message(14, 0.0);
		if (this.TiltLockFlag)
		{
			this.TiltLockFlag = 0;
			if (this.TiltTimeoutTimer)
				timer.kill(this.TiltTimeoutTimer);
			this.TiltTimeoutTimer = 0;
		}
		break;
	case 1013:
		this.LightGroup.Message(34, 0.0);
		this.LightGroup.Message(20, 0.0);
		this.Plunger.Message(1016, 0.0);
		if (this.Demo.ActiveFlag)
			rc_text = pinball.get_rc_string(30, 0);
		else
			rc_text = pinball.get_rc_string(26, 0);
		pinball.InfoTextBox.Display(rc_text, -1.0);
		if (this.Demo)
			this.Demo.Message(1014, 0.0);
		break;
	case 1014:
		if (this.EndGameTimeoutTimer)
		{
			timer.kill(this.EndGameTimeoutTimer);
			TPinballTable.EndGame_timeout(0, this);
			pb.mode_change(1);
		}
		if (this.LightShowTimer)
		{
			timer.kill(this.LightShowTimer);
			this.LightShowTimer = 0;
			this.Message(1013, 0.0);
		}
		else
		{
			this.CheatsUsed = 0;
			this.Message(1024, 0.0);
			let ball = this.BallList.Get(0);
			ball.Position.Y = 0.0;
			ball.Position.X = 0.0;
			ball.Position.Z = -0.8;

			let playerCount = Math.trunc(Math.floor(value));
			this.PlayerCount = playerCount;
			if (playerCount >= 1)
			{
				if (playerCount > 4)
					this.PlayerCount = 4;
			}
			else
			{
				this.PlayerCount = 1;
			}

			let plr1Score = this.PlayerScores[0].ScoreStruct;
			this.CurrentPlayer = 0;
			this.CurScoreStruct = plr1Score;
			this.CurScore = 0;
			scoreRuntime.set(plr1Score, 0);
			this.ScoreMultiplier = 0;

			for (let plrIndex = 1; plrIndex < this.PlayerCount; ++plrIndex)
			{
				let scorePtr = this.PlayerScores[plrIndex];
				scoreRuntime.set(scorePtr.ScoreStruct, 0);
				scorePtr.Score = 0;
				scorePtr.ScoreE9Part = 0;
				scorePtr.BallCount = this.MaxBallCount;
				scorePtr.ExtraBalls = this.ExtraBalls;
				scorePtr.BallLockedCounter = this.BallLockedCounter;
				scorePtr.Unknown2 = this.ScoreSpecial3;
			}

			this.BallCount = this.MaxBallCount;
			this.ChangeBallCount(this.BallCount);
			scoreRuntime.set(this.ScorePlayerNumber1, this.CurrentPlayer + 1);
			scoreRuntime.update(this.ScorePlayerNumber1);

			for (let scoreIndex = 4 - this.PlayerCount; scoreIndex > 0; scoreIndex--)
			{
				scoreRuntime.set(this.PlayerScores[scoreIndex].ScoreStruct, -1);
			}
			
			this.ScoreSpecial3Flag = 0;
			this.ScoreSpecial2Flag = 0;
			this.UnknownP71 = 0;
			pinball.InfoTextBox.Clear();
			pinball.MissTextBox.Clear();
			this.LightGroup.Message(28, 0.2);
			let time = loader.play_sound(this.SoundIndex1);
			this.LightShowTimer = timer.set(time, this, TPinballTable.LightShow_timeout);
		}
		break;
	case 1018:
		if (this.ReplayTimer)
			timer.kill(this.ReplayTimer);
		this.ReplayTimer = timer.set(Math.floor(value), this, TPinballTable.replay_timer_callback);
		this.ReplayActiveFlag = 1;
		break;
	case 1021:
		{
			if (this.PlayerCount <= 1)
			{
				let textboxText;
				if (this.Demo.ActiveFlag)
					textboxText = pinball.get_rc_string(30, 0);
				else
					textboxText = pinball.get_rc_string(26, 0);
				pinball.InfoTextBox.Display(textboxText, -1.0);
				break;
			}

			let nextPlayer = (this.CurrentPlayer + 1) % this.PlayerCount;
			let nextScorePtr = this.PlayerScores[nextPlayer];
			if (nextScorePtr.BallCount <= 0)
				break;

			this.PlayerScores[this.CurrentPlayer].Score = this.CurScore;
			this.PlayerScores[this.CurrentPlayer].ScoreE9Part = this.CurScoreE9;
			this.PlayerScores[this.CurrentPlayer].BallCount = this.BallCount;
			this.PlayerScores[this.CurrentPlayer].ExtraBalls = this.ExtraBalls;
			this.PlayerScores[this.CurrentPlayer].BallLockedCounter = this.BallLockedCounter;
			this.PlayerScores[this.CurrentPlayer].Unknown2 = this.ScoreSpecial3;

			this.CurScore = nextScorePtr.Score;
			this.CurScoreE9 = nextScorePtr.ScoreE9Part;
			this.BallCount = nextScorePtr.BallCount;
			this.ExtraBalls = nextScorePtr.ExtraBalls;
			this.BallLockedCounter = nextScorePtr.BallLockedCounter;
			this.ScoreSpecial3 = nextScorePtr.Unknown2;

			this.CurScoreStruct = nextScorePtr.ScoreStruct;
			scoreRuntime.set(this.CurScoreStruct, this.CurScore);
			this.CurScoreStruct.DirtyFlag = true;

			this.ChangeBallCount(this.BallCount);
			scoreRuntime.set(this.ScorePlayerNumber1, nextPlayer + 1);
			scoreRuntime.update(this.ScorePlayerNumber1);

			for (let i = 0; i < this.ComponentList.GetCount(); i++)
			{
				this.ComponentList.Get(i).Message(1020, (nextPlayer));
			}

			let textboxText = null;
			switch (nextPlayer)
			{
			case 0:
				if (this.Demo.ActiveFlag)
					textboxText = pinball.get_rc_string(30, 0);
				else
					textboxText = pinball.get_rc_string(26, 0);
				break;
			case 1:
				if (this.Demo.ActiveFlag)
					textboxText = pinball.get_rc_string(31, 0);
				else
					textboxText = pinball.get_rc_string(27, 0);
				break;
			case 2:
				if (this.Demo.ActiveFlag)
					textboxText = pinball.get_rc_string(32, 0);
				else
					textboxText = pinball.get_rc_string(28, 0);
				break;
			case 3:
				if (this.Demo.ActiveFlag)
					textboxText = pinball.get_rc_string(33, 0);
				else
					textboxText = pinball.get_rc_string(29, 0);
				break;
			default:
				break;
			}

			if (textboxText != null)
				pinball.InfoTextBox.Display(textboxText, -1);
			this.ScoreSpecial3Flag = 0;
			this.ScoreSpecial2Flag = 0;
			this.UnknownP71 = 0;
			this.CurrentPlayer = nextPlayer;
		}
		break;
	case 1022:
		loader.play_sound(this.SoundIndex2);
		pinball.MissTextBox.Clear();
		pinball.InfoTextBox.Display(pinball.get_rc_string(34, 0), -1.0);
		this.EndGameTimeoutTimer = timer.set(3.0, this, TPinballTable.EndGame_timeout);
		break;
	case 1024:
		for (let i = 0; i < this.ComponentList.GetCount(); i++)
		{
			this.ComponentList.Get(i).Message(1024, 0);
		}
		if (this.ReplayTimer)
			timer.kill(this.ReplayTimer);
		this.ReplayTimer = 0;
		if (this.LightShowTimer)
		{
			timer.kill(this.LightShowTimer);
			this.LightGroup.Message(34, 0.0);
		}
		this.LightShowTimer = 0;
		this.ScoreMultiplier = 0;
		this.ScoreAdded = 0;
		this.ScoreSpecial1 = 0;
		this.ScoreSpecial2 = 10000;
		this.ScoreSpecial2Flag = 0;
		this.ScoreSpecial3 = 20000;
		this.ScoreSpecial3Flag = 0;
		this.UnknownP71 = 0;
		this.ExtraBalls = 0;
		this.UnknownP75 = 0;
		this.BallLockedCounter = 0;
		this.MultiballFlag = 0;
		this.UnknownP78 = 0;
		this.ReplayActiveFlag = 0;
		this.ReplayTimer = 0;
		this.TiltLockFlag = 0;
		break;

	default: break;
	}

	control.table_control_handler(code);
	return 0;

};

TPinballTable.EndGame_timeout = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let table = caller;
	table.EndGameTimeoutTimer = 0;
	pb.end_game();

	for (let i = 0; i < table.ComponentList.GetCount(); i++)
	{
		table.ComponentList.Get(i).Message(1022, 0);
	}
	if (table.Demo)
		table.Demo.Message(1022, 0.0);
	control.handler(67, pinball.MissTextBox);
	pinball.InfoTextBox.Display(pinball.get_rc_string(24, 0), -1.0);

};

TPinballTable.LightShow_timeout = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let table = caller;
	table.LightShowTimer = 0;
	table.Message(1013, 0.0);

};

TPinballTable.replay_timer_callback = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let table = caller;
	table.ReplayActiveFlag = 0;
	table.ReplayTimer = 0;

};

TPinballTable.tilt_timeout = function(timerId, caller) {
 
 const { timer, loader, control, pb, pinball, maths, render, physics, random, score: scoreRuntime } = caller.runtime;

	let table = caller;
	let localVector = vec();

	table.TiltTimeoutTimer = 0;
	if (table.TiltLockFlag)
	{
		for (let i = 0; i < table.BallList.GetCount(); i++)
		{
			table.Drain.Collision(table.BallList.Get(i), localVector, localVector, 0.0, null);
		}
	}

};

const nativeFields = {
  "TLight": [
    [
      "gdrv_bitmap8",
      0,
      "struct"
    ],
    [
      "Sprite",
      0,
      "render_sprite_type_struct*"
    ],
    [
      "BmpArr",
      2,
      "gdrv_bitmap8*"
    ],
    [
      "Unknown3",
      0,
      "int"
    ],
    [
      "Unknown4",
      0,
      "int"
    ],
    [
      "TimerDelay",
      2,
      "float"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "BmpIndex",
      0,
      "int"
    ],
    [
      "MessageField",
      0,
      "int"
    ],
    [
      "BmpIndex1",
      0,
      "int"
    ],
    [
      "FlasherActive",
      0,
      "int"
    ],
    [
      "Unknown3",
      0,
      "int"
    ],
    [
      "Unknown4",
      0,
      "int"
    ],
    [
      "BmpIndex2",
      0,
      "int"
    ],
    [
      "Flasher",
      0,
      "flasher_type"
    ],
    [
      "BmpIndex1",
      0,
      "int"
    ],
    [
      "FlasherActive",
      0,
      "int"
    ],
    [
      "FlasherFlag1",
      0,
      "int"
    ],
    [
      "FlasherFlag2",
      0,
      "int"
    ],
    [
      "TurnOffAfterFlashingFg",
      0,
      "int"
    ],
    [
      "BmpIndex2",
      0,
      "int"
    ],
    [
      "FlasherDelay",
      2,
      "float"
    ],
    [
      "Timer1",
      0,
      "int"
    ],
    [
      "Timer2",
      0,
      "int"
    ],
    [
      "Unknown19",
      0,
      "int"
    ],
    [
      "Unknown20F",
      0,
      "float"
    ],
    [
      "PlayerData",
      4,
      "TLight_player_backup"
    ]
  ],
  "TLightGroup": [
    [
      "TLight",
      0,
      "class"
    ],
    [
      "MessageField",
      0,
      "int"
    ],
    [
      "MessageField2",
      0,
      "int"
    ],
    [
      "Timer1Time",
      0,
      "float"
    ],
    [
      "Unknown3",
      0,
      "int"
    ],
    [
      "List",
      0,
      "objlist_class<TLight>*"
    ],
    [
      "Timer1Time",
      0,
      "float"
    ],
    [
      "Timer1TimeDefault",
      0,
      "float"
    ],
    [
      "MessageField2",
      0,
      "int"
    ],
    [
      "AnimationFlag",
      0,
      "int"
    ],
    [
      "NotifyTimer",
      0,
      "int"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "PlayerData",
      4,
      "TLightGroup_player_backup"
    ]
  ],
  "TLightBargraph": [
    [
      "TimerTimeArray",
      0,
      "float*"
    ],
    [
      "TimerBargraph",
      0,
      "int"
    ],
    [
      "TimeIndex",
      0,
      "int"
    ],
    [
      "PlayerTimerIndexBackup",
      4,
      "int"
    ]
  ],
  "TBumper": [
    [
      "MessageField",
      0,
      "int"
    ],
    [
      "BmpIndex",
      0,
      "int"
    ],
    [
      "BmpIndex",
      0,
      "int"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "TimerTime",
      0,
      "float"
    ],
    [
      "OriginalThreshold",
      0,
      "float"
    ],
    [
      "SoundIndex4",
      0,
      "int"
    ],
    [
      "SoundIndex3",
      0,
      "int"
    ],
    [
      "Scores",
      4,
      "int"
    ],
    [
      "PlayerData",
      4,
      "TBumper_player_backup"
    ]
  ],
  "TPopupTarget": [
    [
      "Timer",
      0,
      "int"
    ],
    [
      "TimerTime",
      0,
      "float"
    ],
    [
      "Scores",
      3,
      "int"
    ],
    [
      "PlayerMessagefieldBackup",
      4,
      "int"
    ]
  ],
  "TGate": [
    [
      "SoundIndex4",
      0,
      "int"
    ],
    [
      "SoundIndex3",
      0,
      "int"
    ]
  ],
  "TBlocker": [
    [
      "TurnOnMsgValue",
      0,
      "int"
    ],
    [
      "TurnOffMsgValue",
      0,
      "int"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "SoundIndex4",
      0,
      "int"
    ],
    [
      "SoundIndex3",
      0,
      "int"
    ]
  ],
  "TKickback": [
    [
      "TimerTime",
      0,
      "float"
    ],
    [
      "TimerTime2",
      0,
      "float"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "ActiveFlag",
      0,
      "int"
    ]
  ],
  "TSoloTarget": [
    [
      "Unknown0",
      0,
      "int"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "TimerTime",
      0,
      "float"
    ],
    [
      "SoundIndex4",
      0,
      "int"
    ],
    [
      "Scores",
      1,
      "int"
    ]
  ],
  "TWall": [
    [
      "gdrv_bitmap8",
      0,
      "struct"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "BmpPtr",
      0,
      "gdrv_bitmap8*"
    ],
    [
      "Scores",
      1,
      "int"
    ]
  ],
  "TFlagSpinner": [
    [
      "Speed",
      0,
      "float"
    ],
    [
      "MaxSpeed",
      0,
      "float"
    ],
    [
      "MinSpeed",
      0,
      "float"
    ],
    [
      "SpeedDecrement",
      0,
      "float"
    ],
    [
      "SpinDirection",
      0,
      "int"
    ],
    [
      "BmpIndex",
      0,
      "int"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "PrevCollider",
      0,
      "TEdgeSegment*"
    ],
    [
      "Scores",
      2,
      "int"
    ]
  ],
  "TRollover": [
    [
      "RolloverFlag",
      0,
      "char"
    ],
    [
      "Scores",
      2,
      "int"
    ]
  ],
  "TLightRollover": [
    [
      "FloatArr",
      0,
      "float"
    ],
    [
      "Timer",
      0,
      "int"
    ]
  ],
  "TTripwire": [],
  "TOneway": [
    [
      "TLine",
      0,
      "class"
    ],
    [
      "Line",
      0,
      "TLine*"
    ],
    [
      "Scores",
      6,
      "int"
    ]
  ],
  "THole": [
    [
      "BallCapturedFlag",
      0,
      "int"
    ],
    [
      "BallCapturedSecondStage",
      0,
      "int"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "Unknown3",
      0,
      "float"
    ],
    [
      "Unknown4",
      0,
      "float"
    ],
    [
      "GravityMult",
      0,
      "float"
    ],
    [
      "ZSetValue",
      0,
      "float"
    ],
    [
      "FieldFlag",
      0,
      "int"
    ],
    [
      "GravityPull",
      0,
      "float"
    ],
    [
      "Circle",
      0,
      "circle_type"
    ],
    [
      "Field",
      0,
      "field_effect_type"
    ]
  ],
  "TSink": [
    [
      "Timer",
      0,
      "int"
    ],
    [
      "TimerTime",
      0,
      "float"
    ],
    [
      "BallPosition",
      0,
      "vector_type"
    ],
    [
      "BallAcceleration",
      0,
      "vector_type"
    ],
    [
      "ThrowAngleMult",
      0,
      "float"
    ],
    [
      "ThrowSpeedMult1",
      0,
      "float"
    ],
    [
      "ThrowSpeedMult2",
      0,
      "float"
    ],
    [
      "SoundIndex4",
      0,
      "int"
    ],
    [
      "SoundIndex3",
      0,
      "int"
    ],
    [
      "Scores",
      3,
      "int"
    ],
    [
      "PlayerMessagefieldBackup",
      4,
      "int"
    ]
  ],
  "TKickout": [
    [
      "KickFlag1",
      0,
      "int"
    ],
    [
      "NotSomeFlag",
      0,
      "int"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "TimerTime1",
      0,
      "float"
    ],
    [
      "TimerTime2",
      0,
      "float"
    ],
    [
      "CollisionBallSetZ",
      0,
      "float"
    ],
    [
      "Ball",
      0,
      "TBall*"
    ],
    [
      "FieldMult",
      0,
      "float"
    ],
    [
      "Circle",
      0,
      "circle_type"
    ],
    [
      "OriginalBallZ",
      0,
      "float"
    ],
    [
      "BallAcceleration",
      0,
      "vector_type"
    ],
    [
      "ThrowAngleMult",
      0,
      "float"
    ],
    [
      "ThrowSpeedMult1",
      0,
      "float"
    ],
    [
      "ThrowSpeedMult2",
      0,
      "float"
    ],
    [
      "Field",
      0,
      "field_effect_type"
    ],
    [
      "Scores",
      5,
      "int"
    ]
  ],
  "TRamp": [
    [
      "ramp_plane_type",
      0,
      "struct"
    ],
    [
      "Scores",
      4,
      "int"
    ],
    [
      "Field",
      0,
      "field_effect_type"
    ],
    [
      "CollisionGroup",
      0,
      "int"
    ],
    [
      "RampFlag1",
      0,
      "int"
    ],
    [
      "RampPlaneCount",
      0,
      "int"
    ],
    [
      "BallFieldMult",
      0,
      "float"
    ],
    [
      "RampPlane",
      0,
      "ramp_plane_type*"
    ],
    [
      "Line2",
      0,
      "TEdgeSegment*"
    ],
    [
      "Line3",
      0,
      "TEdgeSegment*"
    ],
    [
      "Line1",
      0,
      "TEdgeSegment*"
    ],
    [
      "Wall1PointFirst",
      0,
      "int"
    ],
    [
      "Wall2PointFirst",
      0,
      "int"
    ],
    [
      "Wall1PointLast",
      0,
      "float"
    ],
    [
      "Wall2PointLast",
      0,
      "float"
    ]
  ],
  "TTimer": [
    [
      "Timer",
      0,
      "int"
    ]
  ],
  "TComponentGroup": [
    [
      "List",
      0,
      "objlist_class<TPinballComponent>*"
    ],
    [
      "Timer",
      0,
      "int"
    ]
  ],
  "TSound": [
    [
      "SoundIndex",
      0,
      "int"
    ]
  ],
  "TPlunger": [
    [
      "PullbackTimer_",
      0,
      "int"
    ],
    [
      "BallFeedTimer_",
      0,
      "int"
    ],
    [
      "MaxPullback",
      0,
      "int"
    ],
    [
      "PullbackIncrement",
      0,
      "int"
    ],
    [
      "Unknown4F",
      0,
      "float"
    ],
    [
      "SoundIndexP1",
      0,
      "int"
    ],
    [
      "SoundIndexP2",
      0,
      "int"
    ]
  ],
  "TFlipper": [
    [
      "TFlipperEdge",
      0,
      "class"
    ],
    [
      "BmpIndex",
      0,
      "int"
    ],
    [
      "FlipperEdge",
      0,
      "TFlipperEdge*"
    ],
    [
      "Timer",
      0,
      "int"
    ],
    [
      "ExtendAnimationFrameTime",
      0,
      "float"
    ],
    [
      "RetractAnimationFrameTime",
      0,
      "float"
    ],
    [
      "TimerTime",
      0,
      "float"
    ],
    [
      "InputTime",
      0,
      "float"
    ]
  ],
  "TDemo": [
    [
      "FlipTimerTime1",
      0,
      "float"
    ],
    [
      "FlipTimerTime2",
      0,
      "float"
    ],
    [
      "UnFlipTimerTime1",
      0,
      "float"
    ],
    [
      "UnFlipTimerTime2",
      0,
      "float"
    ],
    [
      "FlipLeftFlag",
      0,
      "int"
    ],
    [
      "FlipRightFlag",
      0,
      "int"
    ],
    [
      "FlipLeftTimer",
      0,
      "int"
    ],
    [
      "FlipRightTimer",
      0,
      "int"
    ],
    [
      "PlungerFlag",
      0,
      "int"
    ],
    [
      "RestartGameTimer",
      0,
      "int"
    ],
    [
      "Edge1",
      0,
      "TEdgeSegment*"
    ],
    [
      "Edge2",
      0,
      "TEdgeSegment*"
    ],
    [
      "Edge3",
      0,
      "TEdgeSegment*"
    ]
  ],
  "TPinballTable": [
    [
      "TBall",
      0,
      "class"
    ],
    [
      "scoreStruct",
      0,
      "struct"
    ],
    [
      "TFlipper",
      0,
      "class"
    ],
    [
      "TPlunger",
      0,
      "class"
    ],
    [
      "TDrain",
      0,
      "class"
    ],
    [
      "TDemo",
      0,
      "class"
    ],
    [
      "TLightGroup",
      0,
      "class"
    ],
    [
      "ScoreStruct",
      0,
      "scoreStruct*"
    ],
    [
      "Score",
      0,
      "int"
    ],
    [
      "ScoreE9Part",
      0,
      "int"
    ],
    [
      "Unknown2",
      0,
      "int"
    ],
    [
      "BallCount",
      0,
      "int"
    ],
    [
      "ExtraBalls",
      0,
      "int"
    ],
    [
      "BallLockedCounter",
      0,
      "int"
    ],
    [
      "FlipperL",
      0,
      "TFlipper*"
    ],
    [
      "FlipperR",
      0,
      "TFlipper*"
    ],
    [
      "CurScoreStruct",
      0,
      "scoreStruct*"
    ],
    [
      "ScoreBallcount",
      0,
      "scoreStruct*"
    ],
    [
      "ScorePlayerNumber1",
      0,
      "scoreStruct*"
    ],
    [
      "CheatsUsed",
      0,
      "int"
    ],
    [
      "SoundIndex1",
      0,
      "int"
    ],
    [
      "SoundIndex2",
      0,
      "int"
    ],
    [
      "SoundIndex3",
      0,
      "int"
    ],
    [
      "BallInSink",
      0,
      "int"
    ],
    [
      "CurScore",
      0,
      "int"
    ],
    [
      "CurScoreE9",
      0,
      "int"
    ],
    [
      "LightShowTimer",
      0,
      "int"
    ],
    [
      "EndGameTimeoutTimer",
      0,
      "int"
    ],
    [
      "TiltTimeoutTimer",
      0,
      "int"
    ],
    [
      "PlayerScores",
      4,
      "score_struct_super"
    ],
    [
      "PlayerCount",
      0,
      "int"
    ],
    [
      "CurrentPlayer",
      0,
      "int"
    ],
    [
      "Plunger",
      0,
      "TPlunger*"
    ],
    [
      "Drain",
      0,
      "TDrain*"
    ],
    [
      "Demo",
      0,
      "TDemo*"
    ],
    [
      "XOffset",
      0,
      "int"
    ],
    [
      "YOffset",
      0,
      "int"
    ],
    [
      "Width",
      0,
      "int"
    ],
    [
      "Height",
      0,
      "int"
    ],
    [
      "ComponentList",
      0,
      "objlist_class<TPinballComponent>*"
    ],
    [
      "BallList",
      0,
      "objlist_class<TBall>*"
    ],
    [
      "LightGroup",
      0,
      "TLightGroup*"
    ],
    [
      "GravityDirVectMult",
      0,
      "float"
    ],
    [
      "GravityAngleX",
      0,
      "float"
    ],
    [
      "GravityAnglY",
      0,
      "float"
    ],
    [
      "CollisionCompOffset",
      0,
      "float"
    ],
    [
      "PlungerPositionX",
      0,
      "float"
    ],
    [
      "PlungerPositionY",
      0,
      "float"
    ],
    [
      "ScoreMultiplier",
      0,
      "int"
    ],
    [
      "ScoreAdded",
      0,
      "int"
    ],
    [
      "ScoreSpecial1",
      0,
      "int"
    ],
    [
      "ScoreSpecial2",
      0,
      "int"
    ],
    [
      "ScoreSpecial2Flag",
      0,
      "int"
    ],
    [
      "ScoreSpecial3",
      0,
      "int"
    ],
    [
      "ScoreSpecial3Flag",
      0,
      "int"
    ],
    [
      "UnknownP71",
      0,
      "int"
    ],
    [
      "BallCount",
      0,
      "int"
    ],
    [
      "MaxBallCount",
      0,
      "int"
    ],
    [
      "ExtraBalls",
      0,
      "int"
    ],
    [
      "UnknownP75",
      0,
      "int"
    ],
    [
      "BallLockedCounter",
      0,
      "int"
    ],
    [
      "MultiballFlag",
      0,
      "int"
    ],
    [
      "UnknownP78",
      0,
      "int"
    ],
    [
      "ReplayActiveFlag",
      0,
      "int"
    ],
    [
      "ReplayTimer",
      0,
      "int"
    ],
    [
      "UnknownP81",
      0,
      "int"
    ],
    [
      "UnknownP82",
      0,
      "int"
    ],
    [
      "TiltLockFlag",
      0,
      "int"
    ]
  ]
};
