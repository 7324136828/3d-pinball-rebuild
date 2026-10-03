// JavaScript port of SpaceCadetPinball control.cpp (MIT; see LICENSE and PROVENANCE.md).
// Native message IDs, all mission transitions, score tables and rank awards are preserved.
import { getString, formatString } from './strings.js';

export function createControl(table, runtime = {}) {
 let TableG=table;
 let pbctrl_state=0,cheatBuffer="",table_unlimited_balls=0,waiting_deployment_flag=0,extraball_light_flag=0;
 const pb=runtime.pb || {cheat_mode:0,mode_change(){},chk_highscore(){return false;},highscore_table:Array.from({length:5},()=>({Score:0}))};
 const pinball={get_rc_string:getString,...runtime.pinball};
 const tag = (Name) => ({Name,Component:null,GetComponent(){return this.Component;},SetComponent(component){this.Component=component;}});
 const control_attack_bump_tag=tag("attack_bumpers");
 const control_launch_bump_tag=tag("launch_bumpers");
 const control_block1_tag=tag("v_bloc1");
 const control_bump1_tag=tag("a_bump1");
 const control_bump2_tag=tag("a_bump2");
 const control_bump3_tag=tag("a_bump3");
 const control_bump4_tag=tag("a_bump4");
 const control_bump5_tag=tag("a_bump5");
 const control_bump6_tag=tag("a_bump6");
 const control_bump7_tag=tag("a_bump7");
 const control_drain_tag=tag("drain");
 const control_flag1_tag=tag("a_flag1");
 const control_flag2_tag=tag("a_flag2");
 const control_flip1_tag=tag("a_flip1");
 const control_flip2_tag=tag("a_flip2");
 const control_fuel_bargraph_tag=tag("fuel_bargraph");
 const control_gate1_tag=tag("v_gate1");
 const control_gate2_tag=tag("v_gate2");
 const control_info_text_box_tag=tag("info_text_box");
 const control_kicker1_tag=tag("a_kick1");
 const control_kicker2_tag=tag("a_kick2");
 const control_kickout1_tag=tag("a_kout1");
 const control_kickout2_tag=tag("a_kout2");
 const control_kickout3_tag=tag("a_kout3");
 const control_lite1_tag=tag("lite1");
 const control_lite2_tag=tag("lite2");
 const control_lite3_tag=tag("lite3");
 const control_lite4_tag=tag("lite4");
 const control_lite5_tag=tag("lite5");
 const control_lite6_tag=tag("lite6");
 const control_lite7_tag=tag("lite7");
 const control_lite8_tag=tag("lite8");
 const control_lite9_tag=tag("lite9");
 const control_lite10_tag=tag("lite10");
 const control_lite11_tag=tag("lite11");
 const control_lite12_tag=tag("lite12");
 const control_lite13_tag=tag("lite13");
 const control_lite16_tag=tag("lite16");
 const control_lite17_tag=tag("lite17");
 const control_lite18_tag=tag("lite18");
 const control_lite19_tag=tag("lite19");
 const control_lite20_tag=tag("lite20");
 const control_lite21_tag=tag("lite21");
 const control_lite22_tag=tag("lite22");
 const control_lite23_tag=tag("lite23");
 const control_lite24_tag=tag("lite24");
 const control_lite25_tag=tag("lite25");
 const control_lite26_tag=tag("lite26");
 const control_lite27_tag=tag("lite27");
 const control_lite28_tag=tag("lite28");
 const control_lite29_tag=tag("lite29");
 const control_lite30_tag=tag("lite30");
 const control_lite54_tag=tag("lite54");
 const control_lite55_tag=tag("lite55");
 const control_lite56_tag=tag("lite56");
 const control_lite58_tag=tag("lite58");
 const control_lite59_tag=tag("lite59");
 const control_lite60_tag=tag("lite60");
 const control_lite61_tag=tag("lite61");
 const control_lite62_tag=tag("lite62");
 const control_lite67_tag=tag("lite67");
 const control_lite68_tag=tag("lite68");
 const control_lite69_tag=tag("lite69");
 const control_lite70_tag=tag("lite70");
 const control_lite71_tag=tag("lite71");
 const control_lite72_tag=tag("lite72");
 const control_lite77_tag=tag("lite77");
 const control_lite84_tag=tag("lite84");
 const control_lite85_tag=tag("lite85");
 const control_lite101_tag=tag("lite101");
 const control_lite102_tag=tag("lite102");
 const control_lite103_tag=tag("lite103");
 const control_lite104_tag=tag("lite104");
 const control_lite105_tag=tag("lite105");
 const control_lite106_tag=tag("lite106");
 const control_lite107_tag=tag("lite107");
 const control_lite108_tag=tag("lite108");
 const control_lite109_tag=tag("lite109");
 const control_lite110_tag=tag("lite110");
 const control_lite130_tag=tag("lite130");
 const control_lite131_tag=tag("lite131");
 const control_lite132_tag=tag("lite132");
 const control_lite133_tag=tag("lite133");
 const control_lite169_tag=tag("lite169");
 const control_lite170_tag=tag("lite170");
 const control_lite171_tag=tag("lite171");
 const control_lite195_tag=tag("lite195");
 const control_lite196_tag=tag("lite196");
 const control_lite198_tag=tag("lite198");
 const control_lite199_tag=tag("lite199");
 const control_lite200_tag=tag("lite200");
 const control_lite300_tag=tag("lite300");
 const control_lite301_tag=tag("lite301");
 const control_lite302_tag=tag("lite302");
 const control_lite303_tag=tag("lite303");
 const control_lite304_tag=tag("lite304");
 const control_lite305_tag=tag("lite305");
 const control_lite306_tag=tag("lite306");
 const control_lite307_tag=tag("lite307");
 const control_lite308_tag=tag("lite308");
 const control_lite309_tag=tag("lite309");
 const control_lite310_tag=tag("lite310");
 const control_lite311_tag=tag("lite311");
 const control_lite312_tag=tag("lite312");
 const control_lite313_tag=tag("lite313");
 const control_lite314_tag=tag("lite314");
 const control_lite315_tag=tag("lite315");
 const control_lite316_tag=tag("lite316");
 const control_lite317_tag=tag("lite317");
 const control_lite318_tag=tag("lite318");
 const control_lite319_tag=tag("lite319");
 const control_lite320_tag=tag("lite320");
 const control_lite321_tag=tag("lite321");
 const control_lite322_tag=tag("lite322");
 const control_literoll179_tag=tag("literoll179");
 const control_literoll180_tag=tag("literoll180");
 const control_literoll181_tag=tag("literoll181");
 const control_literoll182_tag=tag("literoll182");
 const control_literoll183_tag=tag("literoll183");
 const control_literoll184_tag=tag("literoll184");
 const control_middle_circle_tag=tag("middle_circle");
 const control_lchute_tgt_lights_tag=tag("lchute_tgt_lights");
 const control_l_trek_lights_tag=tag("l_trek_lights");
 const control_goal_lights_tag=tag("goal_lights");
 const control_hyper_lights_tag=tag("hyperspace_lights");
 const control_bmpr_inc_lights_tag=tag("bmpr_inc_lights");
 const control_bpr_solotgt_lights_tag=tag("bpr_solotgt_lights");
 const control_bsink_arrow_lights_tag=tag("bsink_arrow_lights");
 const control_bumber_target_lights_tag=tag("bumper_target_lights");
 const control_outer_circle_tag=tag("outer_circle");
 const control_r_trek_lights_tag=tag("r_trek_lights");
 const control_ramp_bmpr_inc_lights_tag=tag("ramp_bmpr_inc_lights");
 const control_ramp_tgt_lights_tag=tag("ramp_tgt_lights");
 const control_skill_shot_lights_tag=tag("skill_shot_lights");
 const control_top_circle_tgt_lights_tag=tag("top_circle_tgt_lights");
 const control_top_target_lights_tag=tag("top_target_lights");
 const control_worm_hole_lights_tag=tag("worm_hole_lights");
 const control_mission_text_box_tag=tag("mission_text_box");
 const control_oneway1_tag=tag("s_onewy1");
 const control_oneway4_tag=tag("s_onewy4");
 const control_oneway10_tag=tag("s_onewy10");
 const control_plunger_tag=tag("plunger");
 const control_ramp_hole_tag=tag("ramp_hole");
 const control_ramp_tag=tag("ramp");
 const control_rebo1_tag=tag("v_rebo1");
 const control_rebo2_tag=tag("v_rebo2");
 const control_rebo3_tag=tag("v_rebo3");
 const control_rebo4_tag=tag("v_rebo4");
 const control_roll1_tag=tag("a_roll1");
 const control_roll2_tag=tag("a_roll2");
 const control_roll3_tag=tag("a_roll3");
 const control_roll4_tag=tag("a_roll4");
 const control_roll5_tag=tag("a_roll5");
 const control_roll6_tag=tag("a_roll6");
 const control_roll7_tag=tag("a_roll7");
 const control_roll8_tag=tag("a_roll8");
 const control_roll9_tag=tag("a_roll9");
 const control_roll110_tag=tag("a_roll110");
 const control_roll111_tag=tag("a_roll111");
 const control_roll112_tag=tag("a_roll112");
 const control_roll179_tag=tag("a_roll179");
 const control_roll180_tag=tag("a_roll180");
 const control_roll181_tag=tag("a_roll181");
 const control_roll182_tag=tag("a_roll182");
 const control_roll183_tag=tag("a_roll183");
 const control_roll184_tag=tag("a_roll184");
 const control_sink1_tag=tag("v_sink1");
 const control_sink2_tag=tag("v_sink2");
 const control_sink3_tag=tag("v_sink3");
 const control_sink7_tag=tag("v_sink7");
 const control_soundwave3_tag=tag("soundwave3");
 const control_soundwave7_tag=tag("soundwave7");
 const control_soundwave8_tag=tag("soundwave8");
 const control_soundwave9_tag=tag("soundwave9");
 const control_soundwave10_tag=tag("soundwave10");
 const control_soundwave14_1_tag=tag("soundwave14");
 const control_soundwave14_2_tag=tag("soundwave14");
 const control_soundwave21_tag=tag("soundwave21");
 const control_soundwave23_tag=tag("soundwave23");
 const control_soundwave24_tag=tag("soundwave24");
 const control_soundwave25_tag=tag("soundwave25");
 const control_soundwave26_tag=tag("soundwave26");
 const control_soundwave27_tag=tag("soundwave27");
 const control_soundwave28_tag=tag("soundwave28");
 const control_soundwave30_tag=tag("soundwave30");
 const control_soundwave35_1_tag=tag("soundwave35");
 const control_soundwave35_2_tag=tag("soundwave35");
 const control_soundwave36_1_tag=tag("soundwave36");
 const control_soundwave36_2_tag=tag("soundwave36");
 const control_soundwave38_tag=tag("soundwave38");
 const control_soundwave39_tag=tag("soundwave39");
 const control_soundwave40_tag=tag("soundwave40");
 const control_soundwave41_tag=tag("soundwave41");
 const control_soundwave44_tag=tag("soundwave44");
 const control_soundwave45_tag=tag("soundwave45");
 const control_soundwave46_tag=tag("soundwave46");
 const control_soundwave47_tag=tag("soundwave47");
 const control_soundwave48_tag=tag("soundwave48");
 const control_soundwave49D_tag=tag("soundwave49D");
 const control_soundwave50_1_tag=tag("soundwave50");
 const control_soundwave50_2_tag=tag("soundwave50");
 const control_soundwave52_tag=tag("soundwave52");
 const control_soundwave59_tag=tag("soundwave59");
 const control_target1_tag=tag("a_targ1");
 const control_target2_tag=tag("a_targ2");
 const control_target3_tag=tag("a_targ3");
 const control_target4_tag=tag("a_targ4");
 const control_target5_tag=tag("a_targ5");
 const control_target6_tag=tag("a_targ6");
 const control_target7_tag=tag("a_targ7");
 const control_target8_tag=tag("a_targ8");
 const control_target9_tag=tag("a_targ9");
 const control_target10_tag=tag("a_targ10");
 const control_target11_tag=tag("a_targ11");
 const control_target12_tag=tag("a_targ12");
 const control_target13_tag=tag("a_targ13");
 const control_target14_tag=tag("a_targ14");
 const control_target15_tag=tag("a_targ15");
 const control_target16_tag=tag("a_targ16");
 const control_target17_tag=tag("a_targ17");
 const control_target18_tag=tag("a_targ18");
 const control_target19_tag=tag("a_targ19");
 const control_target20_tag=tag("a_targ20");
 const control_target21_tag=tag("a_targ21");
 const control_target22_tag=tag("a_targ22");
 const control_trip1_tag=tag("s_trip1");
 const control_trip2_tag=tag("s_trip2");
 const control_trip3_tag=tag("s_trip3");
 const control_trip4_tag=tag("s_trip4");
 const control_trip5_tag=tag("s_trip5");
 const control_bump_scores1=[500, 1000, 1500, 2000];
 const control_roll_scores1=[2000];
 const control_bump_scores2=[1500, 2500, 3500, 4500];
 const control_roll_scores2=[500];
 const control_rebo_score1=[500];
 const control_oneway4_score1=[15000, 30000, 75000, 30000, 15000, 7500];
 const control_ramp_score1=[5000];
 const control_roll_score1=[20000];
 const control_roll_score2=[5000, 25000];
 const control_roll_score3=[10000];
 const control_roll_score4=[500];
 const control_flag_score1=[500, 2500];
 const control_kickout_score1=[10000, 0, 20000, 50000, 150000];
 const control_sink_score1=[2500, 5000, 7500];
 const control_target_score1=[500, 5000];
 const control_target_score2=[1500, 10000, 50000];
 const control_target_score3=[500, 1500];
 const control_target_score4=[750];
 const control_target_score5=[1000];
 const control_target_score6=[750];
 const control_target_score7=[750];
 const control_roll_score5=[10000];
 const control_kickout_score2=[20000];
 const control_kickout_score3=[50000];
 const score_components=[{Tag:control_bump1_tag,Control:{ControlFunc:BumperControl,ScoreCount:4,Scores:control_bump_scores1}},
{Tag:control_bump2_tag,Control:{ControlFunc:BumperControl,ScoreCount:4,Scores:control_bump_scores1}},
{Tag:control_bump3_tag,Control:{ControlFunc:BumperControl,ScoreCount:4,Scores:control_bump_scores1}},
{Tag:control_bump4_tag,Control:{ControlFunc:BumperControl,ScoreCount:4,Scores:control_bump_scores1}},
{Tag:control_roll3_tag,Control:{ControlFunc:ReentryLanesRolloverControl,ScoreCount:1,Scores:control_roll_scores1}},
{Tag:control_roll2_tag,Control:{ControlFunc:ReentryLanesRolloverControl,ScoreCount:1,Scores:control_roll_scores1}},
{Tag:control_roll1_tag,Control:{ControlFunc:ReentryLanesRolloverControl,ScoreCount:1,Scores:control_roll_scores1}},
{Tag:control_attack_bump_tag,Control:{ControlFunc:BumperGroupControl,ScoreCount:0,Scores:null}},
{Tag:control_bump5_tag,Control:{ControlFunc:BumperControl,ScoreCount:4,Scores:control_bump_scores2}},
{Tag:control_bump6_tag,Control:{ControlFunc:BumperControl,ScoreCount:4,Scores:control_bump_scores2}},
{Tag:control_bump7_tag,Control:{ControlFunc:BumperControl,ScoreCount:4,Scores:control_bump_scores2}},
{Tag:control_roll112_tag,Control:{ControlFunc:LaunchLanesRolloverControl,ScoreCount:1,Scores:control_roll_scores2}},
{Tag:control_roll111_tag,Control:{ControlFunc:LaunchLanesRolloverControl,ScoreCount:1,Scores:control_roll_scores2}},
{Tag:control_roll110_tag,Control:{ControlFunc:LaunchLanesRolloverControl,ScoreCount:1,Scores:control_roll_scores2}},
{Tag:control_launch_bump_tag,Control:{ControlFunc:BumperGroupControl,ScoreCount:0,Scores:null}},
{Tag:control_rebo1_tag,Control:{ControlFunc:FlipperRebounderControl1,ScoreCount:1,Scores:control_rebo_score1}},
{Tag:control_rebo2_tag,Control:{ControlFunc:FlipperRebounderControl2,ScoreCount:1,Scores:control_rebo_score1}},
{Tag:control_rebo3_tag,Control:{ControlFunc:RebounderControl,ScoreCount:1,Scores:control_rebo_score1}},
{Tag:control_rebo4_tag,Control:{ControlFunc:RebounderControl,ScoreCount:1,Scores:control_rebo_score1}},
{Tag:control_kicker1_tag,Control:{ControlFunc:LeftKickerControl,ScoreCount:0,Scores:null}},
{Tag:control_kicker2_tag,Control:{ControlFunc:RightKickerControl,ScoreCount:0,Scores:null}},
{Tag:control_gate1_tag,Control:{ControlFunc:LeftKickerGateControl,ScoreCount:0,Scores:null}},
{Tag:control_gate2_tag,Control:{ControlFunc:RightKickerGateControl,ScoreCount:0,Scores:null}},
{Tag:control_oneway4_tag,Control:{ControlFunc:DeploymentChuteToEscapeChuteOneWayControl,ScoreCount:6,Scores:control_oneway4_score1}},
{Tag:control_oneway10_tag,Control:{ControlFunc:DeploymentChuteToTableOneWayControl,ScoreCount:0,Scores:null}},
{Tag:control_block1_tag,Control:{ControlFunc:DrainBallBlockerControl,ScoreCount:0,Scores:null}},
{Tag:control_ramp_tag,Control:{ControlFunc:LaunchRampControl,ScoreCount:1,Scores:control_ramp_score1}},
{Tag:control_ramp_hole_tag,Control:{ControlFunc:LaunchRampHoleControl,ScoreCount:0,Scores:null}},
{Tag:control_roll4_tag,Control:{ControlFunc:OutLaneRolloverControl,ScoreCount:1,Scores:control_roll_score1}},
{Tag:control_roll8_tag,Control:{ControlFunc:OutLaneRolloverControl,ScoreCount:1,Scores:control_roll_score1}},
{Tag:control_lite17_tag,Control:{ControlFunc:ExtraBallLightControl,ScoreCount:0,Scores:null}},
{Tag:control_roll6_tag,Control:{ControlFunc:ReturnLaneRolloverControl,ScoreCount:2,Scores:control_roll_score2}},
{Tag:control_roll7_tag,Control:{ControlFunc:ReturnLaneRolloverControl,ScoreCount:2,Scores:control_roll_score2}},
{Tag:control_roll5_tag,Control:{ControlFunc:BonusLaneRolloverControl,ScoreCount:1,Scores:control_roll_score3}},
{Tag:control_roll179_tag,Control:{ControlFunc:FuelRollover1Control,ScoreCount:1,Scores:control_roll_score4}},
{Tag:control_roll180_tag,Control:{ControlFunc:FuelRollover2Control,ScoreCount:1,Scores:control_roll_score4}},
{Tag:control_roll181_tag,Control:{ControlFunc:FuelRollover3Control,ScoreCount:1,Scores:control_roll_score4}},
{Tag:control_roll182_tag,Control:{ControlFunc:FuelRollover4Control,ScoreCount:1,Scores:control_roll_score4}},
{Tag:control_roll183_tag,Control:{ControlFunc:FuelRollover5Control,ScoreCount:1,Scores:control_roll_score4}},
{Tag:control_roll184_tag,Control:{ControlFunc:FuelRollover6Control,ScoreCount:1,Scores:control_roll_score4}},
{Tag:control_flag1_tag,Control:{ControlFunc:FlagControl,ScoreCount:2,Scores:control_flag_score1}},
{Tag:control_kickout2_tag,Control:{ControlFunc:HyperspaceKickOutControl,ScoreCount:5,Scores:control_kickout_score1}},
{Tag:control_hyper_lights_tag,Control:{ControlFunc:HyperspaceLightGroupControl,ScoreCount:0,Scores:null}},
{Tag:control_flag2_tag,Control:{ControlFunc:FlagControl,ScoreCount:2,Scores:control_flag_score1}},
{Tag:control_sink1_tag,Control:{ControlFunc:WormHoleControl,ScoreCount:3,Scores:control_sink_score1}},
{Tag:control_sink2_tag,Control:{ControlFunc:WormHoleControl,ScoreCount:3,Scores:control_sink_score1}},
{Tag:control_sink3_tag,Control:{ControlFunc:WormHoleControl,ScoreCount:3,Scores:control_sink_score1}},
{Tag:control_flip1_tag,Control:{ControlFunc:LeftFlipperControl,ScoreCount:0,Scores:null}},
{Tag:control_flip2_tag,Control:{ControlFunc:RightFlipperControl,ScoreCount:0,Scores:null}},
{Tag:control_plunger_tag,Control:{ControlFunc:PlungerControl,ScoreCount:0,Scores:null}},
{Tag:control_target1_tag,Control:{ControlFunc:BoosterTargetControl,ScoreCount:2,Scores:control_target_score1}},
{Tag:control_target2_tag,Control:{ControlFunc:BoosterTargetControl,ScoreCount:2,Scores:control_target_score1}},
{Tag:control_target3_tag,Control:{ControlFunc:BoosterTargetControl,ScoreCount:2,Scores:control_target_score1}},
{Tag:control_lite60_tag,Control:{ControlFunc:JackpotLightControl,ScoreCount:0,Scores:null}},
{Tag:control_lite59_tag,Control:{ControlFunc:BonusLightControl,ScoreCount:0,Scores:null}},
{Tag:control_target6_tag,Control:{ControlFunc:MedalTargetControl,ScoreCount:3,Scores:control_target_score2}},
{Tag:control_target5_tag,Control:{ControlFunc:MedalTargetControl,ScoreCount:3,Scores:control_target_score2}},
{Tag:control_target4_tag,Control:{ControlFunc:MedalTargetControl,ScoreCount:3,Scores:control_target_score2}},
{Tag:control_bumber_target_lights_tag,Control:{ControlFunc:MedalLightGroupControl,ScoreCount:0,Scores:null}},
{Tag:control_target9_tag,Control:{ControlFunc:MultiplierTargetControl,ScoreCount:2,Scores:control_target_score3}},
{Tag:control_target8_tag,Control:{ControlFunc:MultiplierTargetControl,ScoreCount:2,Scores:control_target_score3}},
{Tag:control_target7_tag,Control:{ControlFunc:MultiplierTargetControl,ScoreCount:2,Scores:control_target_score3}},
{Tag:control_top_target_lights_tag,Control:{ControlFunc:MultiplierLightGroupControl,ScoreCount:0,Scores:null}},
{Tag:control_target10_tag,Control:{ControlFunc:FuelSpotTargetControl,ScoreCount:1,Scores:control_target_score4}},
{Tag:control_target11_tag,Control:{ControlFunc:FuelSpotTargetControl,ScoreCount:1,Scores:control_target_score4}},
{Tag:control_target12_tag,Control:{ControlFunc:FuelSpotTargetControl,ScoreCount:1,Scores:control_target_score4}},
{Tag:control_target13_tag,Control:{ControlFunc:MissionSpotTargetControl,ScoreCount:1,Scores:control_target_score5}},
{Tag:control_target14_tag,Control:{ControlFunc:MissionSpotTargetControl,ScoreCount:1,Scores:control_target_score5}},
{Tag:control_target15_tag,Control:{ControlFunc:MissionSpotTargetControl,ScoreCount:1,Scores:control_target_score5}},
{Tag:control_target16_tag,Control:{ControlFunc:LeftHazardSpotTargetControl,ScoreCount:1,Scores:control_target_score6}},
{Tag:control_target17_tag,Control:{ControlFunc:LeftHazardSpotTargetControl,ScoreCount:1,Scores:control_target_score6}},
{Tag:control_target18_tag,Control:{ControlFunc:LeftHazardSpotTargetControl,ScoreCount:1,Scores:control_target_score6}},
{Tag:control_target19_tag,Control:{ControlFunc:RightHazardSpotTargetControl,ScoreCount:1,Scores:control_target_score6}},
{Tag:control_target20_tag,Control:{ControlFunc:RightHazardSpotTargetControl,ScoreCount:1,Scores:control_target_score6}},
{Tag:control_target21_tag,Control:{ControlFunc:RightHazardSpotTargetControl,ScoreCount:1,Scores:control_target_score6}},
{Tag:control_target22_tag,Control:{ControlFunc:WormHoleDestinationControl,ScoreCount:1,Scores:control_target_score7}},
{Tag:control_roll9_tag,Control:{ControlFunc:SpaceWarpRolloverControl,ScoreCount:1,Scores:control_roll_score5}},
{Tag:control_kickout3_tag,Control:{ControlFunc:BlackHoleKickoutControl,ScoreCount:1,Scores:control_kickout_score2}},
{Tag:control_kickout1_tag,Control:{ControlFunc:GravityWellKickoutControl,ScoreCount:1,Scores:control_kickout_score3}},
{Tag:control_drain_tag,Control:{ControlFunc:BallDrainControl,ScoreCount:0,Scores:null}},
{Tag:control_oneway1_tag,Control:{ControlFunc:SkillShotGate1Control,ScoreCount:0,Scores:null}},
{Tag:control_trip1_tag,Control:{ControlFunc:SkillShotGate2Control,ScoreCount:0,Scores:null}},
{Tag:control_trip2_tag,Control:{ControlFunc:SkillShotGate3Control,ScoreCount:0,Scores:null}},
{Tag:control_trip3_tag,Control:{ControlFunc:SkillShotGate4Control,ScoreCount:0,Scores:null}},
{Tag:control_trip4_tag,Control:{ControlFunc:SkillShotGate5Control,ScoreCount:0,Scores:null}},
{Tag:control_trip5_tag,Control:{ControlFunc:SkillShotGate6Control,ScoreCount:0,Scores:null}},
{Tag:control_lite200_tag,Control:{ControlFunc:ShootAgainLightControl,ScoreCount:0,Scores:null}},
{Tag:control_sink7_tag,Control:{ControlFunc:EscapeChuteSinkControl,ScoreCount:0,Scores:null}}];
 const simple_components=[
	control_lite8_tag,
	control_lite9_tag,
	control_lite10_tag,
	control_bmpr_inc_lights_tag,
	control_lite171_tag,
	control_lite170_tag,
	control_lite169_tag,
	control_ramp_bmpr_inc_lights_tag,
	control_lite30_tag,
	control_lite29_tag,
	control_lite1_tag,
	control_lite54_tag,
	control_lite55_tag,
	control_lite56_tag,
	control_lite18_tag,
	control_lite27_tag,
	control_lite28_tag,
	control_lite16_tag,
	control_lite21_tag,
	control_lite22_tag,
	control_lite23_tag,
	control_lite24_tag,
	control_lite25_tag,
	control_lite26_tag,
	control_lite130_tag,
	control_lite5_tag,
	control_lite6_tag,
	control_lite7_tag,
	control_worm_hole_lights_tag,
	control_lite4_tag,
	control_lite2_tag,
	control_lite3_tag,
	control_bsink_arrow_lights_tag,
	control_l_trek_lights_tag,
	control_r_trek_lights_tag,
	control_literoll179_tag,
	control_literoll180_tag,
	control_literoll181_tag,
	control_literoll182_tag,
	control_literoll183_tag,
	control_literoll184_tag,
	control_fuel_bargraph_tag,
	control_lite20_tag,
	control_lite19_tag,
	control_lite61_tag,
	control_lite58_tag,
	control_lite11_tag,
	control_lite12_tag,
	control_lite13_tag,
	control_lite70_tag,
	control_lite71_tag,
	control_lite72_tag,
	control_top_circle_tgt_lights_tag,
	control_lite101_tag,
	control_lite102_tag,
	control_lite103_tag,
	control_ramp_tgt_lights_tag,
	control_lite104_tag,
	control_lite105_tag,
	control_lite106_tag,
	control_lite107_tag,
	control_lite108_tag,
	control_lite109_tag,
	control_lchute_tgt_lights_tag,
	control_bpr_solotgt_lights_tag,
	control_lite110_tag,
	control_lite62_tag,
	control_lite67_tag,
	control_lite68_tag,
	control_lite69_tag,
	control_lite131_tag,
	control_lite132_tag,
	control_lite133_tag,
	control_skill_shot_lights_tag,
	control_lite77_tag,
	control_lite198_tag,
	control_middle_circle_tag,
	control_outer_circle_tag,
	control_soundwave9_tag,
	control_soundwave10_tag,
	control_soundwave21_tag,
	control_soundwave23_tag,
	control_soundwave24_tag,
	control_soundwave30_tag,
	control_soundwave28_tag,
	control_soundwave50_1_tag,
	control_soundwave8_tag,
	control_soundwave40_tag,
	control_soundwave41_tag,
	control_soundwave36_1_tag,
	control_soundwave50_2_tag,
	control_soundwave35_1_tag,
	control_soundwave36_2_tag,
	control_soundwave35_2_tag,
	control_soundwave38_tag,
	control_soundwave39_tag,
	control_soundwave44_tag,
	control_soundwave45_tag,
	control_soundwave46_tag,
	control_soundwave47_tag,
	control_soundwave48_tag,
	control_soundwave52_tag,
	control_soundwave14_1_tag,
	control_soundwave59_tag,
	control_lite199_tag,
	control_lite196_tag,
	control_lite195_tag,
	control_info_text_box_tag,
	control_mission_text_box_tag,
	control_soundwave27_tag,
	control_lite84_tag,
	control_lite85_tag,
	control_soundwave14_2_tag,
	control_soundwave3_tag,
	control_soundwave26_tag,
	control_soundwave49D_tag,
	control_lite300_tag,
	control_lite301_tag,
	control_lite302_tag,
	control_lite303_tag,
	control_lite304_tag,
	control_lite305_tag,
	control_lite306_tag,
	control_lite307_tag,
	control_lite308_tag,
	control_lite309_tag,
	control_lite310_tag,
	control_lite311_tag,
	control_lite312_tag,
	control_lite313_tag,
	control_lite314_tag,
	control_lite315_tag,
	control_lite316_tag,
	control_lite317_tag,
	control_lite318_tag,
	control_lite319_tag,
	control_lite320_tag,
	control_lite321_tag,
	control_lite322_tag,
	control_goal_lights_tag,
	control_soundwave25_tag,
	control_soundwave7_tag
];
 const RankRcArray=[84, 85, 86, 87, 88, 89, 90, 91, 92];
 const MissionRcArray=[60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76];
 const mission_select_scores=[
	10000,
	10000,
	10000,
	10000,
	20000,
	20000,
	20000,
	20000,
	20000,
	20000,
	20000,
	20000,
	20000,
	30000,
	30000,
	30000,
	30000
];
 const wormhole_tag_array1=[
	control_sink1_tag, control_sink2_tag, control_sink3_tag
];
 const wormhole_tag_array2=[
	control_lite5_tag, control_lite6_tag, control_lite7_tag
];
 const wormhole_tag_array3=[
	control_lite4_tag, control_lite2_tag, control_lite3_tag
];
function make_links(table)
{
	TableG = table;

	for (let index = 0; index < 88; index++)
	{
		let compPtr = score_components[index];
		let comp = make_component_link(compPtr.Tag);
		if (comp)
		{
			comp.Control = compPtr.Control;
			for (let scoreId = 0; scoreId < compPtr.Control.ScoreCount; scoreId++)
			{
				comp.put_scoring(scoreId, compPtr.Control.Scores[scoreId]);
			}
		}
	}

	for (let i = 0; i < 142; ++i)
		make_component_link(simple_components[i]);
}

function ClearLinks()
{
	TableG = null;
	for (const component of score_components)
		component.Tag.SetComponent(null);
	for (const component of simple_components)
		component.SetComponent(null);
}

function make_component_link(tag)
{
	if (tag.GetComponent())
		return tag.GetComponent();

	let compList = TableG.ComponentList;
	for (let index = 0; index < compList.GetCount(); index++)
	{
		let comp = compList.Get(index);
		if (comp.GroupName)
		{
			if (comp.GroupName === tag.Name)
			{
				tag.SetComponent(comp);
				return comp;
			}
		}
	}

	return null;
}

function handler(code, cmp)
{
	let control = cmp.Control;
	
	if (control)
	{
		if (code == 1019)
		{
			for (let scoreInd = 0; scoreInd < control.ScoreCount; ++scoreInd)
			{
				cmp.put_scoring(scoreInd, control.Scores[scoreInd]);
			}
		}
		control.ControlFunc(code, cmp);
	}
	MissionControl(code, cmp);
}

function pbctrl_bdoor_controller(key) {
  if (control_lite198_tag.Component.MessageField) return;
  key = typeof key === 'number' ? String.fromCharCode(key) : String(key);
  cheatBuffer = (cheatBuffer + key.toUpperCase()).slice(-11);
  if (cheatBuffer.endsWith('HIDDEN TEST')) pb.cheat_mode = Number(!pb.cheat_mode);
  else if (cheatBuffer.endsWith('GMAX')) GravityWellKickoutControl(64,null);
  else if (cheatBuffer.endsWith('1MAX')) table_add_extra_ball(2);
  else if (cheatBuffer.endsWith('BMAX')) table_unlimited_balls = Number(!table_unlimited_balls);
  else if (cheatBuffer.endsWith('RMAX')) cheat_bump_rank();
  else if (pb.FullTiltMode && cheatBuffer.endsWith('QUOTE')) {
    const quotes=['Hey, is that a screen saver?','I guess it has been a good week','She may already be a glue bottle',"If you don't come in Saturday,\n...\n","don't even bother coming in Sunday.",'Tomorrow already sucks','I knew it worked too good to be right.',"World's most expensive flippers"];
    quotes.forEach((quote,index)=>control_mission_text_box_tag.Component.Display(quote,(index+1)*3));
    return;
  } else return;
  TableG.CheatsUsed=1;
}

function table_add_extra_ball(count)
{
	++TableG.ExtraBalls;
	control_soundwave28_tag.Component.Play();
	let msg = pinball.get_rc_string(9, 0);
	control_info_text_box_tag.Component.Display(msg, count);
}

function table_set_bonus_hold()
{
	control_lite58_tag.Component.Message(19, 0.0);
	control_info_text_box_tag.Component.Display(pinball.get_rc_string(52, 0), 2.0);
}

function table_set_bonus()
{
	TableG.ScoreSpecial2Flag = 1;
	control_lite59_tag.Component.Message(9, 60.0);
	control_info_text_box_tag.Component.Display(pinball.get_rc_string(4, 0), 2.0);
}

function table_set_jackpot()
{
	TableG.ScoreSpecial3Flag = 1;
	control_lite60_tag.Component.Message(9, 60.0);
	control_info_text_box_tag.Component.Display(pinball.get_rc_string(15, 0), 2.0);
}

function table_set_flag_lights()
{
	control_lite20_tag.Component.Message(9, 60.0);
	control_lite19_tag.Component.Message(9, 60.0);
	control_lite61_tag.Component.Message(9, 60.0);
	control_info_text_box_tag.Component.Display(pinball.get_rc_string(51, 0), 2.0);
}

function table_set_multiball()
{
	control_info_text_box_tag.Component.Display(pinball.get_rc_string(16, 0), 2.0);
}

function table_bump_ball_sink_lock()
{
	if (TableG.BallLockedCounter == 2)
	{
		table_set_multiball();
		TableG.BallLockedCounter = 0;
	}
	else
	{
		TableG.BallLockedCounter = TableG.BallLockedCounter + 1;
		control_soundwave44_tag.Component.Play();
		control_info_text_box_tag.Component.Display(pinball.get_rc_string(1, 0), 2.0);
		TableG.Plunger.Message(1016, 0.0);
	}
}

function table_set_replay(value)
{
	control_lite199_tag.Component.Message(19, 0.0);
	control_info_text_box_tag.Component.Display(pinball.get_rc_string(0, 0), value);
}

function cheat_bump_rank()
{
	let Buffer = "";

	let rank = control_middle_circle_tag.Component.Message(37, 0.0);
	if (rank < 9)
	{
		control_middle_circle_tag.Component.Message(41, 2.0);
		let rankText = pinball.get_rc_string(RankRcArray[rank], 1);
		Buffer = formatString(pinball.get_rc_string(83, 0), rankText);
		control_mission_text_box_tag.Component.Display(Buffer, 8.0);
		control_soundwave10_tag.Component.Play();
	}
}

function light_on(tag)
{
	let light = tag.Component;
	return light.BmpIndex1 || light.FlasherFlag2 || light.FlasherActive;
}

function SpecialAddScore(score)
{
	let prevFlag1 = TableG.ScoreSpecial3Flag;
	TableG.ScoreSpecial3Flag = 0;
	let prevFlag2 = TableG.ScoreSpecial2Flag;
	TableG.ScoreSpecial2Flag = 0;
	let prevMult = TableG.ScoreMultiplier;
	TableG.ScoreMultiplier = 0;

	let addedScore = TableG.AddScore(score);
	TableG.ScoreSpecial2Flag = prevFlag2;
	TableG.ScoreMultiplier = prevMult;
	TableG.ScoreSpecial3Flag = prevFlag1;
	return addedScore;
}

function AddRankProgress(rank)
{
	let Buffer = "";
	let result = 0;

	control_lite16_tag.Component.Message(19, 0.0);
	let outerCircle = control_outer_circle_tag.Component;
	for (let index = rank; index; --index)
	{
		outerCircle.Message(41, 2.0);
	}

	let activeCount = outerCircle.Message(37, 0.0);
	let totalCount = outerCircle.Message(38, 0.0);
	if (activeCount == totalCount)
	{
		result = 1;
		outerCircle.Message(16, 5.0);
		let middleCircle = control_middle_circle_tag.Component;
		control_middle_circle_tag.Component.Message(34, 0.0);
		let midActiveCount = middleCircle.Message(37, 0.0);
		if (midActiveCount < 9)
		{
			middleCircle.Message(41, 5.0);
			let rankText = pinball.get_rc_string(RankRcArray[midActiveCount], 1);
			Buffer = formatString(pinball.get_rc_string(83, 0), rankText);
			control_mission_text_box_tag.Component.Display(Buffer, 8.0);
			control_soundwave10_tag.Component.Play();
		}
	}
	else if (activeCount >= Math.trunc(3 * totalCount / 4))
	{
		control_middle_circle_tag.Component.Message(27, -1.0);
	}
	return result;
}

function AdvanceWormHoleDestination(flag)
{
	let lite198Msg = control_lite198_tag.Component.MessageField;
	if (lite198Msg != 16 && lite198Msg != 22 && lite198Msg != 23)
	{
		let lite4Msg = control_lite4_tag.Component.MessageField;
		if (flag || lite4Msg)
		{
			let val1 = lite4Msg + 1;
			let val2 = val1;
			if (val1 == 4)
			{
				val1 = 1;
				val2 = 1;
			}
			control_bsink_arrow_lights_tag.Component.Message(23, (val2));
			control_bsink_arrow_lights_tag.Component.Message(11, (3 - val1));
			if (!light_on(control_lite4_tag))
			{
				control_worm_hole_lights_tag.Component.Message(19, 0.0);
				control_bsink_arrow_lights_tag.Component.Message(19, 0.0);
			}
		}
	}
}

function FlipperRebounderControl1(code, caller)
{
	if (code == 63)
	{
		control_lite84_tag.Component.Message(9, 0.1);
		let score = caller.get_scoring(0);
		TableG.AddScore(score);
	}
}

function FlipperRebounderControl2(code, caller)
{
	if (code == 63)
	{
		control_lite85_tag.Component.Message(9, 0.1);
		let score = caller.get_scoring(0);
		TableG.AddScore(score);
	}
}

function RebounderControl(code, caller)
{
	if (code == 63)
	{
		TableG.AddScore(caller.get_scoring(0));
	}
}

function BumperControl(code, caller)
{
	if (code == 63)
	{
		TableG.AddScore(caller.get_scoring((caller).BmpIndex));
	}
}

function LeftKickerControl(code, caller)
{
	if (code == 60)
		control_gate1_tag.Component.Message(54, 0.0);
}

function RightKickerControl(code, caller)
{
	if (code == 60)
		control_gate2_tag.Component.Message(54, 0.0);
}

function LeftKickerGateControl(code, caller)
{
	if (code == 53)
	{
		control_lite30_tag.Component.Message(15, 5.0);
		control_lite196_tag.Component.Message(7, 5.0);
	}
	else if (code == 54)
	{
		control_lite30_tag.Component.Message(20, 0.0);
		control_lite196_tag.Component.Message(20, 0.0);
	}
}

function RightKickerGateControl(code, caller)
{
	if (code == 53)
	{
		control_lite29_tag.Component.Message(15, 5.0);
		control_lite195_tag.Component.Message(7, 5.0);
	}
	else if (code == 54)
	{
		control_lite29_tag.Component.Message(20, 0.0);
		control_lite195_tag.Component.Message(20, 0.0);
	}
}

function DeploymentChuteToEscapeChuteOneWayControl(code, caller)
{
	let Buffer = "";
	if (code == 63)
	{
		let count = control_skill_shot_lights_tag.Component.Message(37, 0.0);
		if (count)
		{
			control_soundwave3_tag.Component.Play();
			let score = TableG.AddScore(caller.get_scoring(count - 1));
			Buffer = formatString(pinball.get_rc_string(21, 0), score);
			control_info_text_box_tag.Component.Display(Buffer, 2.0);
			if (!light_on(control_lite56_tag))
			{
				control_l_trek_lights_tag.Component.Message(34, 0.0);
				control_l_trek_lights_tag.Component.Message(20, 0.0);
				control_r_trek_lights_tag.Component.Message(34, 0.0);
				control_r_trek_lights_tag.Component.Message(20, 0.0);
			}
			control_skill_shot_lights_tag.Component.Message(44, 1.0);
		}
	}
}

function DeploymentChuteToTableOneWayControl(code, caller)
{
	if (code == 63)
		control_skill_shot_lights_tag.Component.Message(20, 0.0);
}

function DrainBallBlockerControl(code, caller)
{
	let msgCode;
	let msgValue;

	let block = (caller);
	if (code == 52)
	{
		block.MessageField = 1;
		block.Message(52, (block.TurnOnMsgValue));
		msgValue = (block.TurnOnMsgValue);
		msgCode = 9;
	}
	else
	{
		if (code != 60)
			return;
		if (block.MessageField != 1)
		{
			block.MessageField = 0;
			block.Message(51, 0.0);
			return;
		}
		block.MessageField = 2;
		block.Message(59, (block.TurnOffMsgValue));
		msgValue = (block.TurnOffMsgValue);
		msgCode = 7;
	}
	control_lite1_tag.Component.Message(msgCode, msgValue);
}

function LaunchRampControl(code, caller)
{
	let sound;
	let Buffer = "";

	if (code == 63)
	{
		let someFlag = 0;
		if (light_on(control_lite54_tag))
		{
			someFlag = 1;
			let addedScore = SpecialAddScore(TableG.ScoreSpecial1);
			Buffer = formatString(pinball.get_rc_string(10, 0), addedScore);
			control_info_text_box_tag.Component.Display(Buffer, 2.0);
		}
		if (light_on(control_lite55_tag))
			someFlag |= 2;
		if (light_on(control_lite56_tag))
			someFlag |= 4;
		if (someFlag)
		{
			if (someFlag == 1)
			{
				sound = control_soundwave21_tag.Component;
			}
			else if (someFlag <= 1 || someFlag > 3)
			{
				sound = control_soundwave24_tag.Component;
			}
			else
			{
				sound = control_soundwave23_tag.Component;
			}
		}
		else
		{
			TableG.AddScore(caller.get_scoring(0));
			sound = control_soundwave30_tag.Component;
		}
		sound.Play();
	}
}

function LaunchRampHoleControl(code, caller)
{
	if (code == 58)
		control_lite54_tag.Component.Message(7, 5.0);
}

function SpaceWarpRolloverControl(code, caller)
{
	if (code == 63)
	{
		control_lite27_tag.Component.Message(19, 0.0);
		control_lite28_tag.Component.Message(19, 0.0);
	}
}

function ReentryLanesRolloverControl(code, caller)
{
	if (code == 63)
	{
		if (!light_on(control_lite56_tag) && control_l_trek_lights_tag.Component.Message(39, 0.0))
		{
			control_l_trek_lights_tag.Component.Message(34, 0.0);
			control_l_trek_lights_tag.Component.Message(20, 0.0);
			control_r_trek_lights_tag.Component.Message(34, 0.0);
			control_r_trek_lights_tag.Component.Message(20, 0.0);
		}

		let light ;
		if (control_roll3_tag.Component == caller)
		{
			light = control_lite8_tag.Component;
		}
		else
		{
			light = control_lite9_tag.Component;
			if (control_roll2_tag.Component != caller)
				light = control_lite10_tag.Component;
		}
		if (!light.FlasherActive)
		{
			if (light.BmpIndex1)
			{
				light.Message(20, 0.0);
			}
			else
			{
				light.Message(19, 0.0);
				let activeCount = control_bmpr_inc_lights_tag.Component.Message(37, 0.0);
				if (activeCount == control_bmpr_inc_lights_tag.Component.Message(38, 0.0))
				{
					control_bmpr_inc_lights_tag.Component.Message(7, 5.0);
					control_bmpr_inc_lights_tag.Component.Message(0, 0.0);
					if (control_bump1_tag.Component.BmpIndex < 3)
					{
						control_attack_bump_tag.Component.Message(12, 0.0);
						control_info_text_box_tag.Component.Display(pinball.get_rc_string(5, 0), 2.0);
					}
					control_attack_bump_tag.Component.Message(48, 60.0);
				}
			}
		}
		TableG.AddScore(caller.get_scoring(0));
	}
}

function BumperGroupControl(code, caller)
{
	if (code == 61)
	{
		/*Bug in the original. Caller (TComponentGroup) is accessed beyond bounds at 0x4E*/
		if ((caller).BmpIndex)
		{
			caller.Message(48, 60.0);
			caller.Message(13, 0.0);
		}
	}
}

function LaunchLanesRolloverControl(code, caller)
{
	let light ;

	if (code == 63)
	{
		if (control_roll112_tag.Component == caller)
		{
			light = control_lite171_tag.Component;
		}
		else
		{
			light = control_lite170_tag.Component;
			if (control_roll111_tag.Component != caller)
				light = control_lite169_tag.Component;
		}
		if (!light.FlasherActive)
		{
			if (light.BmpIndex1)
			{
				light.Message(20, 0.0);
			}
			else
			{
				light.Message(19, 0.0);
				let msg1 = control_ramp_bmpr_inc_lights_tag.Component.Message(37, 0.0);
				if (msg1 == control_ramp_bmpr_inc_lights_tag.Component.Message(38, 0.0))
				{
					control_ramp_bmpr_inc_lights_tag.Component.Message(7, 5.0);
					control_ramp_bmpr_inc_lights_tag.Component.Message(0, 0.0);
					if (control_bump5_tag.Component.BmpIndex < 3)
					{
						control_launch_bump_tag.Component.Message(12, 0.0);
						control_info_text_box_tag.Component.Display(pinball.get_rc_string(6, 0), 2.0);
					}
					control_launch_bump_tag.Component.Message(48, 60.0);
				}
			}
		}
		TableG.AddScore(caller.get_scoring(0));
	}
}

function OutLaneRolloverControl(code, caller)
{
	if (code == 63)
	{
		if (light_on(control_lite17_tag) || light_on(control_lite18_tag))
		{
			table_add_extra_ball(2.0);
			control_lite17_tag.Component.Message(20, 0.0);
			control_lite18_tag.Component.Message(20, 0.0);
		}
		else
		{
			control_soundwave26_tag.Component.Play();
		}
		if (control_roll4_tag.Component == caller)
		{
			if (light_on(control_lite30_tag))
			{
				control_lite30_tag.Component.Message(4, 0.0);
				control_lite196_tag.Component.Message(4, 0.0);
			}
		}
		else if (light_on(control_lite29_tag))
		{
			control_lite29_tag.Component.Message(4, 0.0);
			control_lite195_tag.Component.Message(4, 0.0);
		}
		TableG.AddScore(caller.get_scoring(0));
	}
}

function ExtraBallLightControl(code, caller)
{
	if (code == 19)
	{
		control_lite17_tag.Component.Message(9, 55.0);
		control_lite18_tag.Component.Message(9, 55.0);
		extraball_light_flag = 1;
	}
	else if (code == 60)
	{
		if (extraball_light_flag)
		{
			control_lite17_tag.Component.Message(7, 5.0);
			control_lite18_tag.Component.Message(7, 5.0);
			extraball_light_flag = 0;
		}
	}
}

function ReturnLaneRolloverControl(code, caller)
{
	if (code == 63)
	{
		if (control_roll6_tag.Component == caller)
		{
			if (light_on(control_lite27_tag))
			{
				control_lite59_tag.Component.Message(20, 0.0);
				control_lite27_tag.Component.Message(20, 0.0);
				TableG.AddScore(caller.get_scoring(1));
			}
			else
				TableG.AddScore(caller.get_scoring(0));
		}
		else if (control_roll7_tag.Component == caller)
		{
			if (light_on(control_lite28_tag))
			{
				control_lite59_tag.Component.Message(20, 0.0);
				control_lite28_tag.Component.Message(20, 0.0);
				TableG.AddScore(caller.get_scoring(1));
			}
			else
				TableG.AddScore(caller.get_scoring(0));
		}
	}
}

function BonusLaneRolloverControl(code, caller)
{
	let Buffer = "";

	if (code == 63)
	{
		if (light_on(control_lite16_tag))
		{
			let addedScore = SpecialAddScore(TableG.ScoreSpecial2);
			Buffer = formatString(pinball.get_rc_string(3, 0), addedScore);
			control_info_text_box_tag.Component.Display(Buffer, 2.0);
			control_lite16_tag.Component.Message(20, 0.0);
			control_soundwave50_1_tag.Component.Play();
		}
		else
		{
			TableG.AddScore(caller.get_scoring(0));
			control_soundwave25_tag.Component.Play();
			control_info_text_box_tag.Component.Display(pinball.get_rc_string(44, 0), 2.0);
		}
		control_fuel_bargraph_tag.Component.Message(45, 11.0);
	}
}

function FuelRollover1Control(code, caller)
{
	if (code == 63)
	{
		if (control_fuel_bargraph_tag.Component.Message(37, 0.0) > 1)
		{
			control_literoll179_tag.Component.Message(8, 0.05);
		}
		else
		{
			control_fuel_bargraph_tag.Component.Message(45, 1.0);
			control_info_text_box_tag.Component.Display(pinball.get_rc_string(44, 0), 2.0);
		}
		TableG.AddScore(caller.get_scoring(0));
	}
}

function FuelRollover2Control(code, caller)
{
	if (code == 63)
	{
		if (control_fuel_bargraph_tag.Component.Message(37, 0.0) > 3)
		{
			control_literoll180_tag.Component.Message(8, 0.05);
		}
		else
		{
			control_fuel_bargraph_tag.Component.Message(45, 3.0);
			control_info_text_box_tag.Component.Display(pinball.get_rc_string(44, 0), 2.0);
		}
		TableG.AddScore(caller.get_scoring(0));
	}
}

function FuelRollover3Control(code, caller)
{
	if (code == 63)
	{
		if (control_fuel_bargraph_tag.Component.Message(37, 0.0) > 5)
		{
			control_literoll181_tag.Component.Message(8, 0.05);
		}
		else
		{
			control_fuel_bargraph_tag.Component.Message(45, 5.0);
			control_info_text_box_tag.Component.Display(pinball.get_rc_string(44, 0), 2.0);
		}
		TableG.AddScore(caller.get_scoring(0));
	}
}

function FuelRollover4Control(code, caller)
{
	if (code == 63)
	{
		if (control_fuel_bargraph_tag.Component.Message(37, 0.0) > 7)
		{
			control_literoll182_tag.Component.Message(8, 0.05);
		}
		else
		{
			control_fuel_bargraph_tag.Component.Message(45, 7.0);
			control_info_text_box_tag.Component.Display(pinball.get_rc_string(44, 0), 2.0);
		}
		TableG.AddScore(caller.get_scoring(0));
	}
}

function FuelRollover5Control(code, caller)
{
	if (code == 63)
	{
		if (control_fuel_bargraph_tag.Component.Message(37, 0.0) > 9)
		{
			control_literoll183_tag.Component.Message(8, 0.05);
		}
		else
		{
			control_fuel_bargraph_tag.Component.Message(45, 9.0);
			control_info_text_box_tag.Component.Display(pinball.get_rc_string(44, 0), 2.0);
		}
		TableG.AddScore(caller.get_scoring(0));
	}
}

function FuelRollover6Control(code, caller)
{
	if (code == 63)
	{
		if (control_fuel_bargraph_tag.Component.Message(37, 0.0) > 11)
		{
			control_literoll184_tag.Component.Message(8, 0.05);
		}
		else
		{
			control_fuel_bargraph_tag.Component.Message(45, 11.0);
			control_info_text_box_tag.Component.Display(pinball.get_rc_string(44, 0), 2.0);
		}
		TableG.AddScore(caller.get_scoring(0));
	}
}

function HyperspaceLightGroupControl(code, caller)
{
	switch (code)
	{
	case 0:
		caller.Message(0, 0.0);
		break;
	case 41:
		caller.Message(41, 2.0);
		caller.Message(43, 60.0);
		break;
	case 61:
		caller.Message(33, 0.0);
		if (caller.Message(37, 0.0))
			caller.Message(43, 60.0);
		break;
	default: break;
	}
}

function WormHoleControl(code, caller)
{
	let sinkFlag2;
	let sink = (caller);

	if (code == 63)
	{
		let sinkFlag = 0;
		if (control_sink1_tag.Component != sink)
		{
			sinkFlag = control_sink2_tag.Component != sink;
			++sinkFlag;
		}

		let lite4Msg = control_lite4_tag.Component.MessageField;
		if (lite4Msg)
		{
			control_lite4_tag.Component.MessageField = 0;
			control_worm_hole_lights_tag.Component.Message(20, 0.0);
			control_bsink_arrow_lights_tag.Component.Message(20, 0.0);
			control_lite110_tag.Component.Message(20, 0.0);
			if (lite4Msg == sinkFlag + 1)
			{
				if (TableG.MultiballFlag)
				{
					table_bump_ball_sink_lock();
					TableG.AddScore(10000);
				}
				else
				{
					control_info_text_box_tag.Component.Display(pinball.get_rc_string(49, 0), 2.0);
					table_set_replay(4.0);
					TableG.AddScore(sink.get_scoring(1));
					wormhole_tag_array2[sinkFlag].GetComponent().Message(16, sink.TimerTime);
					wormhole_tag_array3[sinkFlag].GetComponent().Message(11, (2 - sinkFlag));
					wormhole_tag_array3[sinkFlag].GetComponent().Message(16, sink.TimerTime);
					wormhole_tag_array1[sinkFlag].GetComponent().Message(56, sink.TimerTime);
				}
				return;
			}
			TableG.AddScore(sink.get_scoring(2));
			sinkFlag2 = lite4Msg - 1;
		}
		else
		{
			TableG.AddScore(sink.get_scoring(0));
			sinkFlag2 = sinkFlag;
		}

		wormhole_tag_array2[sinkFlag2].GetComponent().Message(16, sink.TimerTime);
		wormhole_tag_array3[sinkFlag2].GetComponent().Message(11, (2 - sinkFlag2));
		wormhole_tag_array3[sinkFlag2].GetComponent().Message(16, sink.TimerTime);
		wormhole_tag_array1[sinkFlag2].GetComponent().Message(56, sink.TimerTime);
		control_info_text_box_tag.Component.Display(pinball.get_rc_string(49, 0), 2.0);
	}
}

function LeftFlipperControl(code, caller)
{
	if (code == 1)
	{
		control_bmpr_inc_lights_tag.Component.Message(24, 0.0);
		control_ramp_bmpr_inc_lights_tag.Component.Message(24, 0.0);
	}
}

function RightFlipperControl(code, caller)
{
	if (code == 1)
	{
		control_bmpr_inc_lights_tag.Component.Message(25, 0.0);
		control_ramp_bmpr_inc_lights_tag.Component.Message(25, 0.0);
	}
}

function JackpotLightControl(code, caller)
{
	if (code == 60)
		TableG.ScoreSpecial3Flag = 0;
}

function BonusLightControl(code, caller)
{
	if (code == 60)
		TableG.ScoreSpecial2Flag = 0;
}

function BoosterTargetControl(code, caller)
{
	let sound = null;

	if (code == 63 && !caller.MessageField)
	{
		caller.MessageField = 1;
		if (control_target1_tag.Component.MessageField
			+ control_target2_tag.Component.MessageField
			+ control_target3_tag.Component.MessageField != 3)
		{
			TableG.AddScore(caller.get_scoring(0));
			return;
		}
		if (light_on(control_lite61_tag))
		{
			if (light_on(control_lite60_tag))
			{
				if (light_on(control_lite59_tag))
				{
					if (light_on(control_lite58_tag))
					{
						TableG.AddScore(caller.get_scoring(1));
					}
					else
					{
						table_set_bonus_hold();
					}
					sound = control_soundwave48_tag.Component;
				}
				else
				{
					table_set_bonus();
					sound = control_soundwave46_tag.Component;
				}
			}
			else
			{
				table_set_jackpot();
				sound = control_soundwave45_tag.Component;
			}
		}
		else
		{
			let msg = control_lite198_tag.Component.MessageField;
			if (msg != 15 && msg != 29)
			{
				table_set_flag_lights();
				sound = control_soundwave47_tag.Component;
			}
		}
		if (sound)
			sound.Play();

		control_target1_tag.Component.MessageField = 0;
		control_target1_tag.Component.Message(50, 0.0);
		control_target2_tag.Component.MessageField = 0;
		control_target2_tag.Component.Message(50, 0.0);
		control_target3_tag.Component.MessageField = 0;
		control_target3_tag.Component.Message(50, 0.0);
		TableG.AddScore(caller.get_scoring(1));
	}
}

function MedalLightGroupControl(code, caller)
{
	switch (code)
	{
	case 0:
		caller.Message(0, 0.0);
		break;
	case 41:
		caller.Message(41, 2.0);
		caller.Message(43, 30.0);
		break;
	case 61:
		caller.Message(33, 0.0);
		if (caller.Message(37, 0.0))
			caller.Message(43, 30.0);
		break;
	default: break;
	}
}

function MultiplierLightGroupControl(code, caller)
{
	switch (code)
	{
	case 0:
		caller.Message(0, 0.0);
		break;
	case 41:
		caller.Message(41, 2.0);
		caller.Message(43, 30.0);
		break;
	case 61:
		if (TableG.ScoreMultiplier)
			TableG.ScoreMultiplier = TableG.ScoreMultiplier - 1;
		caller.Message(33, 0.0);
		if (caller.Message(37, 0.0))
			caller.Message(43, 30.0);
		break;
	case 64:
		TableG.ScoreMultiplier = 4;
		caller.Message(19, 0.0);
		caller.Message(43, 30.0);
		control_info_text_box_tag.Component.Display(pinball.get_rc_string(59, 0), 2.0);
		break;
	case 65:
		TableG.ScoreMultiplier = 0;
		caller.Message(20, 0.0);
		caller.Message(43, -1.0);
		break;
	default:
		break;
	}
}

function FuelSpotTargetControl(code, caller)
{
	let liteComp;

	if (code == 63)
	{
		if (control_target10_tag.Component == caller)
		{
			liteComp = control_lite70_tag.Component;
		}
		else
		{
			liteComp = control_lite71_tag.Component;
			if (control_target11_tag.Component != caller)
				liteComp = control_lite72_tag.Component;
		}
		liteComp.Message(15, 2.0);
		TableG.AddScore(caller.get_scoring(0));
		if (control_top_circle_tgt_lights_tag.Component.Message(37, 0.0) == 3)
		{
			control_top_circle_tgt_lights_tag.Component.Message(16, 2.0);
			control_fuel_bargraph_tag.Component.Message(45, 11.0);
			control_soundwave25_tag.Component.Play();
			control_info_text_box_tag.Component.Display(pinball.get_rc_string(44, 0), 2.0);
		}
		else
		{
			control_soundwave49D_tag.Component.Play();
		}
	}
}

function MissionSpotTargetControl(code, caller)
{
	if (code == 63)
	{
		let lite;
		if (control_target13_tag.Component == caller)
		{
			control_lite101_tag.Component.MessageField |= 1;
			lite = control_lite101_tag.Component;
		}
		else if (control_target14_tag.Component == caller)
		{
			control_lite101_tag.Component.MessageField |= 2;
			lite = control_lite102_tag.Component;
		}
		else
		{
			control_lite101_tag.Component.MessageField |= 4;
			lite = control_lite103_tag.Component;
		}
		lite.Message(15, 2.0);

		let sound;
		if (!light_on(control_lite198_tag) || control_lite198_tag.Component.FlasherActive)
		{
			sound = control_soundwave52_tag.Component;
		}
		else
			sound = control_soundwave49D_tag.Component;
		sound.Play();
		TableG.AddScore(caller.get_scoring(0));
		if (control_ramp_tgt_lights_tag.Component.Message(37, 0.0) == 3)
			control_ramp_tgt_lights_tag.Component.Message(16, 2.0);
	}
}

function LeftHazardSpotTargetControl(code, caller)
{
	let lite;

	if (code == 63)
	{
		if (control_target16_tag.Component == caller)
		{
			control_lite104_tag.Component.MessageField |= 1;
			lite = control_lite104_tag.Component;
		}
		else if (control_target17_tag.Component == caller)
		{
			control_lite104_tag.Component.MessageField |= 2;
			lite = control_lite105_tag.Component;
		}
		else
		{
			control_lite104_tag.Component.MessageField |= 4;
			lite = control_lite106_tag.Component;
		}
		lite.Message(15, 2.0);
		TableG.AddScore(caller.get_scoring(0));
		if (control_lchute_tgt_lights_tag.Component.Message(37, 0.0) == 3)
		{
			control_soundwave14_1_tag.Component.Play();
			control_gate1_tag.Component.Message(53, 0.0);
			control_lchute_tgt_lights_tag.Component.Message(16, 2.0);
		}
		else
		{
			control_soundwave49D_tag.Component.Play();
		}
	}
}

function RightHazardSpotTargetControl(code, caller)
{
	let light;

	if (code == 63)
	{
		if (control_target19_tag.Component == caller)
		{
			control_lite107_tag.Component.MessageField |= 1;
			light = control_lite107_tag.Component;
		}
		else if (control_target20_tag.Component == caller)
		{
			control_lite107_tag.Component.MessageField |= 2;
			light = control_lite108_tag.Component;
		}
		else
		{
			control_lite107_tag.Component.MessageField |= 4;
			light = control_lite109_tag.Component;
		}
		light.Message(15, 2.0);
		TableG.AddScore(caller.get_scoring(0));
		if (control_bpr_solotgt_lights_tag.Component.Message(37, 0.0) == 3)
		{
			control_soundwave14_1_tag.Component.Play();
			control_gate2_tag.Component.Message(53, 0.0);
			control_bpr_solotgt_lights_tag.Component.Message(16, 2.0);
		}
		else
		{
			control_soundwave49D_tag.Component.Play();
		}
	}
}

function WormHoleDestinationControl(code, caller)
{
	if (code == 63)
	{
		if (!light_on(control_lite110_tag))
		{
			control_lite110_tag.Component.Message(15, 3.0);
			control_info_text_box_tag.Component.Display(pinball.get_rc_string(93, 0), 2.0);
		}
		TableG.AddScore(caller.get_scoring(0));
		AdvanceWormHoleDestination(1);
	}
}

function BlackHoleKickoutControl(code, caller)
{
	let Buffer = "";

	if (code == 63)
	{
		let addedScore = TableG.AddScore(caller.get_scoring(0));
		Buffer = formatString(pinball.get_rc_string(80, 0), addedScore);
		control_info_text_box_tag.Component.Display(Buffer, 2.0);
		caller.Message(55, -1.0);
	}
}

function FlagControl(code, caller)
{
	if (code == 62)
	{
		AdvanceWormHoleDestination(0);
	}
	else if (code == 63)
	{
		let score = caller.get_scoring(Number(Boolean(light_on(control_lite20_tag))));
		TableG.AddScore(score);
	}
}

function GravityWellKickoutControl(code, caller)
{
	let Buffer = "";

	switch (code)
	{
	case 63:
		{
			let addedScore = TableG.AddScore(caller.get_scoring(0));
			Buffer = formatString(pinball.get_rc_string(81, 0), addedScore);
			control_info_text_box_tag.Component.Display(Buffer, 2.0);
			control_lite62_tag.Component.Message(20, 0.0);
			caller.ActiveFlag = 0;
			let duration = control_soundwave7_tag.Component.Play();
			caller.Message(55, duration);
			break;
		}
	case 64:
		{
			let score = (caller);
			if (score)
			{
				Buffer = formatString(pinball.get_rc_string(82, 0), score);
			}
			else
			{
				Buffer = formatString("%s", pinball.get_rc_string(45, 0));
			}
			control_info_text_box_tag.Component.Display(Buffer, 2.0);
			control_lite62_tag.Component.Message(4, 0.0);
			control_kickout1_tag.Component.ActiveFlag = 1;
			break;
		}
	case 1024:
		control_kickout1_tag.Component.ActiveFlag = 0;
		break;
	}
}

function SkillShotGate1Control(code, caller)
{
	if (code == 63)
	{
		control_lite200_tag.Component.Message(9, 5.0);
		if (light_on(control_lite67_tag))
		{
			control_skill_shot_lights_tag.Component.Message(34, 0.0);
			control_skill_shot_lights_tag.Component.Message(20, 0.0);
			control_lite67_tag.Component.Message(19, 0.0);
			control_lite54_tag.Component.Message(7, 5.0);
			control_lite25_tag.Component.Message(7, 5.0);
			control_fuel_bargraph_tag.Component.Message(45, 11.0);
			control_soundwave14_2_tag.Component.Play();
		}
	}
}

function SkillShotGate2Control(code, caller)
{
	if (code == 63)
	{
		if (light_on(control_lite67_tag))
		{
			control_lite68_tag.Component.Message(19, 0.0);
			control_soundwave14_2_tag.Component.Play();
		}
	}
}

function SkillShotGate3Control(code, caller)
{
	if (code == 63)
	{
		if (light_on(control_lite67_tag))
		{
			control_lite69_tag.Component.Message(19, 0.0);
			control_soundwave14_2_tag.Component.Play();
		}
	}
}

function SkillShotGate4Control(code, caller)
{
	if (code == 63)
	{
		if (light_on(control_lite67_tag))
		{
			control_lite131_tag.Component.Message(19, 0.0);
			control_soundwave14_2_tag.Component.Play();
		}
	}
}

function SkillShotGate5Control(code, caller)
{
	if (code == 63)
	{
		if (light_on(control_lite67_tag))
		{
			control_lite132_tag.Component.Message(19, 0.0);
			control_soundwave14_2_tag.Component.Play();
		}
	}
}

function SkillShotGate6Control(code, caller)
{
	if (code == 63)
	{
		if (light_on(control_lite67_tag))
		{
			control_lite133_tag.Component.Message(19, 0.0);
			control_soundwave14_2_tag.Component.Play();
		}
	}
}

function ShootAgainLightControl(code, caller)
{
	if (code == 60)
	{
		if (caller.MessageField)
		{
			caller.MessageField = 0;
		}
		else
		{
			caller.Message(16, 5.0);
			caller.MessageField = 1;
		}
	}
}

function EscapeChuteSinkControl(code, caller)
{
	if (code == 63)
		caller.Message(56, (caller).TimerTime);
}

function MissionControl(code, caller)
{
	if (!control_lite198_tag.Component)
		return;

	let lite198Msg = control_lite198_tag.Component.MessageField;
	switch (code)
	{
	case 47:
		if (control_fuel_bargraph_tag.Component == caller && lite198Msg > 1)
		{
			control_l_trek_lights_tag.Component.Message(34, 0.0);
			control_l_trek_lights_tag.Component.Message(20, 0.0);
			control_r_trek_lights_tag.Component.Message(34, 0.0);
			control_r_trek_lights_tag.Component.Message(20, 0.0);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(109, 0), 4.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
		}
		break;
	case 60:
		if (control_fuel_bargraph_tag.Component == caller && lite198Msg)
		{
			if (control_fuel_bargraph_tag.Component.Message(37, 0.0) == 1)
			{
				control_mission_text_box_tag.Component.Display(pinball.get_rc_string(116, 0), 4.0);
			}
			break;
		}
		if (control_mission_text_box_tag.Component == caller)
			code = 67;
		break;
	case 1009:
		code = 67;
		break;
	default:
		break;
	}

	switch (lite198Msg)
	{
	case 0:
		WaitingDeploymentController(code, caller);
		break;
	case 1:
		SelectMissionController(code, caller);
		break;
	case 2:
		PracticeMissionController(code, caller);
		break;
	case 3:
		LaunchTrainingController(code, caller);
		break;
	case 4:
		ReentryTrainingController(code, caller);
		break;
	case 5:
		ScienceMissionController(code, caller);
		break;
	case 6:
		StrayCometController(code, caller);
		break;
	case 7:
		BlackHoleThreatController(code, caller);
		break;
	case 8:
		SpaceRadiationController(code, caller);
		break;
	case 9:
		BugHuntController(code, caller);
		break;
	case 10:
		AlienMenaceController(code, caller);
		break;
	case 11:
		RescueMissionController(code, caller);
		break;
	case 12:
		SatelliteController(code, caller);
		break;
	case 13:
		ReconnaissanceController(code, caller);
		break;
	case 14:
		DoomsdayMachineController(code, caller);
		break;
	case 15:
		CosmicPlagueController(code, caller);
		break;
	case 16:
		SecretMissionYellowController(code, caller);
		break;
	case 17:
		TimeWarpController(code, caller);
		break;
	case 18:
		MaelstromController(code, caller);
		break;
	case 20:
		AlienMenacePartTwoController(code, caller);
		break;
	case 21:
		CosmicPlaguePartTwoController(code, caller);
		break;
	case 22:
		SecretMissionRedController(code, caller);
		break;
	case 23:
		SecretMissionGreenController(code, caller);
		break;
	case 24:
		TimeWarpPartTwoController(code, caller);
		break;
	case 25:
		MaelstromPartTwoController(code, caller);
		break;
	case 26:
		MaelstromPartThreeController(code, caller);
		break;
	case 27:
		MaelstromPartFourController(code, caller);
		break;
	case 28:
		MaelstromPartFiveController(code, caller);
		break;
	case 29:
		MaelstromPartSixController(code, caller);
		break;
	case 30:
		MaelstromPartSevenController(code, caller);
		break;
	case 31:
		MaelstromPartEightController(code, caller);
		break;
	case 32:
		GameoverController(code, caller);
		break;
	default:
		UnselectMissionController(code, caller);
		break;
	}
}

function HyperspaceKickOutControl(code, caller)
{
	let Buffer = "";

	if (code != 63)
		return;

	let activeCount = control_hyper_lights_tag.Component.Message(37, 0.0);
	HyperspaceLightGroupControl(41, control_hyper_lights_tag.Component);
	switch (activeCount)
	{
	case 0:
		{
			let addedScore = TableG.AddScore(caller.get_scoring(0));
			Buffer = formatString(pinball.get_rc_string(12, 0), addedScore);
			control_info_text_box_tag.Component.Display(Buffer, 2.0);
			break;
		}
	case 1:
		{
			let addedScore = SpecialAddScore(TableG.ScoreSpecial3);
			Buffer = formatString(pinball.get_rc_string(14, 0), addedScore);
			control_info_text_box_tag.Component.Display(Buffer, 2.0);
			TableG.ScoreSpecial3 = 20000;
			break;
		}
	case 2:
		{
			DrainBallBlockerControl(52, control_block1_tag.Component);
			let addedScore = TableG.AddScore(caller.get_scoring(2));
			Buffer = formatString(pinball.get_rc_string(2, 0), addedScore);
			control_info_text_box_tag.Component.Display(Buffer, 2.0);
			break;
		}
	case 3:
		{
			ExtraBallLightControl(19, null);
			let addedScore = TableG.AddScore(caller.get_scoring(3));
			Buffer = formatString(pinball.get_rc_string(8, 0), addedScore);
			control_info_text_box_tag.Component.Display(Buffer, 2.0);
			break;
		}
	case 4:
		{
			control_hyper_lights_tag.Component.Message(0, 0.0);
			let addedScore = TableG.AddScore(caller.get_scoring(4));
			GravityWellKickoutControl(64, (addedScore));
			break;
		}
	default:
		break;
	}

	let someFlag = 0;
	if (light_on(control_lite25_tag))
	{
		someFlag = 1;
		let addedScore = SpecialAddScore(TableG.ScoreSpecial1);
		Buffer = formatString(pinball.get_rc_string(10, 0), addedScore);
		control_info_text_box_tag.Component.Display(Buffer, 2.0);
	}
	if (light_on(control_lite26_tag))
		someFlag |= 2;
	if (light_on(control_lite130_tag))
	{
		someFlag |= 4;
		control_lite130_tag.Component.Message(20, 0.0);
		MultiplierLightGroupControl(64, control_top_target_lights_tag.Component);
		control_bumber_target_lights_tag.Component.Message(19, 0.0);
		table_set_jackpot();
		table_set_bonus();
		table_set_flag_lights();
		table_set_bonus_hold();
		control_lite27_tag.Component.Message(19, 0.0);
		control_lite28_tag.Component.Message(19, 0.0);
		ExtraBallLightControl(19, null);
		DrainBallBlockerControl(52, control_block1_tag.Component);

		if (TableG.MultiballFlag)
		{
			table_set_multiball();
		}
		if (TableG.ScoreSpecial3 < 100000)
			TableG.ScoreSpecial3 = 100000;
		if (TableG.ScoreSpecial2 < 100000)
			TableG.ScoreSpecial2 = 100000;
		GravityWellKickoutControl(64, null);
	}

	let sound;
	if (someFlag)
	{
		if (someFlag == 1)
		{
			sound = control_soundwave21_tag.Component;
		}
		else
		{
			if (someFlag <= 1 || someFlag > 3)
			{
				let duration = control_soundwave41_tag.Component.Play();
				control_soundwave36_1_tag.Component.Play();
				control_soundwave50_2_tag.Component.Play();
				control_lite25_tag.Component.Message(7, 5.0);
				caller.Message(55, duration);
				return;
			}
			sound = control_soundwave40_tag.Component;
		}
	}
	else
	{
		switch (activeCount)
		{
		case 1:
			sound = control_soundwave36_2_tag.Component;
			break;
		case 2:
			sound = control_soundwave35_2_tag.Component;
			break;
		case 3:
			sound = control_soundwave38_tag.Component;
			break;
		case 4:
			sound = control_soundwave39_tag.Component;
			break;
		default:
			sound = control_soundwave35_1_tag.Component;
			break;
		}
	}
	let duration = sound.Play();
	control_lite25_tag.Component.Message(7, 5.0);
	caller.Message(55, duration);
}

function PlungerControl(code, caller)
{
	if (code == 1015)
	{
		MissionControl(67, null);
	}
	else if (code == 1016)
	{
		table_unlimited_balls = 0;
		if (!control_middle_circle_tag.Component.Message(37, 0.0))
			control_middle_circle_tag.Component.Message(32, 0.0);
		if (!light_on(control_lite200_tag))
		{
			control_skill_shot_lights_tag.Component.Message(20, 0.0);
			control_lite67_tag.Component.Message(19, 0.0);
			control_skill_shot_lights_tag.Component.Message(26, 0.25);
			control_l_trek_lights_tag.Component.Message(20, 0.0);
			control_l_trek_lights_tag.Component.Message(32, 0.2);
			control_l_trek_lights_tag.Component.Message(26, 0.2);
			control_r_trek_lights_tag.Component.Message(20, 0.0);
			control_r_trek_lights_tag.Component.Message(32, 0.2);
			control_r_trek_lights_tag.Component.Message(26, 0.2);
			TableG.ScoreSpecial1 = 25000;
			MultiplierLightGroupControl(65, control_top_target_lights_tag.Component);
			control_fuel_bargraph_tag.Component.Message(19, 0.0);
			control_lite200_tag.Component.Message(19, 0.0);
			control_gate1_tag.Component.Message(53, 0.0);
			control_gate2_tag.Component.Message(53, 0.0);
		}
		control_lite200_tag.Component.MessageField = 0;
	}
}

function MedalTargetControl(code, caller)
{
	if (code == 63 && !caller.MessageField)
	{
		caller.MessageField = 1;
		if (control_target6_tag.Component.MessageField
			+ control_target5_tag.Component.MessageField
			+ control_target4_tag.Component.MessageField == 3)
		{
			MedalLightGroupControl(41, control_bumber_target_lights_tag.Component);
			let activeCount = control_bumber_target_lights_tag.Component.Message(37, 0.0) - 1;
			let text;
			switch (activeCount)
			{
			case 0:
				TableG.AddScore(caller.get_scoring(1));
				text = pinball.get_rc_string(53, 0);
				break;
			case 1:
				TableG.AddScore(caller.get_scoring(2));
				text = pinball.get_rc_string(54, 0);
				break;
			default:
				table_add_extra_ball(4.0);
				text = pinball.get_rc_string(55, 0);
				break;
			}
			control_info_text_box_tag.Component.Display(text, 2.0);
			control_target6_tag.Component.MessageField = 0;
			control_target6_tag.Component.Message(50, 0.0);
			control_target5_tag.Component.MessageField = 0;
			control_target5_tag.Component.Message(50, 0.0);
			control_target4_tag.Component.MessageField = 0;
			control_target4_tag.Component.Message(50, 0.0);
			return;
		}
		TableG.AddScore(caller.get_scoring(0));
	}
}

function MultiplierTargetControl(code, caller)
{
	if (code == 63 && !caller.MessageField)
	{
		caller.MessageField = 1;
		if (control_target9_tag.Component.MessageField
			+ control_target8_tag.Component.MessageField
			+ control_target7_tag.Component.MessageField == 3)
		{
			TableG.AddScore(caller.get_scoring(1));
			MultiplierLightGroupControl(41, control_top_target_lights_tag.Component);
			let activeCount = control_top_target_lights_tag.Component.Message(37, 0.0);
			let text;
			switch (activeCount)
			{
			case 1:
				TableG.ScoreMultiplier = 1;
				text = pinball.get_rc_string(56, 0);
				break;
			case 2:
				TableG.ScoreMultiplier = 2;
				text = pinball.get_rc_string(57, 0);
				break;
			case 3:
				TableG.ScoreMultiplier = 3;
				text = pinball.get_rc_string(58, 0);
				break;
			default:
				TableG.ScoreMultiplier = 4;
				text = pinball.get_rc_string(59, 0);
				break;
			}

			control_info_text_box_tag.Component.Display(text, 2.0);
			control_target9_tag.Component.MessageField = 0;
			control_target9_tag.Component.Message(50, 0.0);
			control_target8_tag.Component.MessageField = 0;
			control_target8_tag.Component.Message(50, 0.0);
			control_target7_tag.Component.MessageField = 0;
			control_target7_tag.Component.Message(50, 0.0);
		}
		else
		{
			TableG.AddScore(caller.get_scoring(0));
		}
	}
}

function BallDrainControl(code, caller)
{
	let Buffer = "";

	if (code == 60)
	{
		if (control_lite199_tag.Component.MessageField)
		{
			TableG.Message(1022, 0.0);
			if (pb.chk_highscore())
			{
				control_soundwave3_tag.Component.Play();
				TableG.LightGroup.Message(16, 3.0);
				let v11 = pinball.get_rc_string(177, 0);
				control_mission_text_box_tag.Component.Display(v11, -1.0);
			}
		}
		else
		{
			control_plunger_tag.Component.Message(1016, 0.0);
		}
	}
	else if (code == 63)
	{
		if (table_unlimited_balls)
		{
			control_drain_tag.Component.Message(1024, 0.0);
			control_sink3_tag.Component.Message(56, 0.0);
		}
		else
		{
			if (TableG.TiltLockFlag)
			{
				control_lite200_tag.Component.Message(20, 0.0);
				control_lite199_tag.Component.Message(20, 0.0);
			}
			if (light_on(control_lite200_tag))
			{
				control_soundwave27_tag.Component.Play();
				control_lite200_tag.Component.Message(19, 0.0);
				control_info_text_box_tag.Component.Display(pinball.get_rc_string(96, 0), -1.0);
				control_soundwave59_tag.Component.Play();
			}
			else if (light_on(control_lite199_tag))
			{
				control_soundwave27_tag.Component.Play();
				control_lite199_tag.Component.Message(20, 0.0);
				control_lite200_tag.Component.Message(19, 0.0);
				control_info_text_box_tag.Component.Display(pinball.get_rc_string(95, 0), 2.0);
				control_soundwave59_tag.Component.Play();
				--TableG.UnknownP78;
			}
			else if (TableG.UnknownP75)
			{
				control_soundwave27_tag.Component.Play();
				--TableG.UnknownP75;
			}
			else
			{
				if (!TableG.TiltLockFlag)
				{
					let time = SpecialAddScore(TableG.ScoreSpecial2);
					Buffer = formatString(pinball.get_rc_string(94, 0), time);
					control_info_text_box_tag.Component.Display(Buffer, 2.0);
				}
				if (TableG.ExtraBalls)
				{
					TableG.ExtraBalls--;

					let shootAgainText;
					control_soundwave59_tag.Component.Play();
					switch (TableG.CurrentPlayer)
					{
					case 0:
						shootAgainText = pinball.get_rc_string(97, 0);
						break;
					case 1:
						shootAgainText = pinball.get_rc_string(98, 0);
						break;
					case 2:
						shootAgainText = pinball.get_rc_string(99, 0);
						break;
					default:
					case 3:
						shootAgainText = pinball.get_rc_string(100, 0);
						break;
					}
					control_info_text_box_tag.Component.Display(shootAgainText, -1.0);
				}
				else
				{
					TableG.ChangeBallCount(TableG.BallCount - 1);
					if (TableG.CurrentPlayer + 1 != TableG.PlayerCount || TableG.BallCount)
					{
						TableG.Message(1021, 0.0);
						control_lite199_tag.Component.MessageField = 0;
					}
					else
					{
						control_lite199_tag.Component.MessageField = 1;
					}
					control_soundwave27_tag.Component.Play();
				}
				control_bmpr_inc_lights_tag.Component.Message(20, 0.0);
				control_ramp_bmpr_inc_lights_tag.Component.Message(20, 0.0);
				control_lite30_tag.Component.Message(20, 0.0);
				control_lite29_tag.Component.Message(20, 0.0);
				control_lite1_tag.Component.Message(20, 0.0);
				control_lite54_tag.Component.Message(20, 0.0);
				control_lite55_tag.Component.Message(20, 0.0);
				control_lite56_tag.Component.Message(20, 0.0);
				control_lite17_tag.Component.Message(20, 0.0);
				control_lite18_tag.Component.Message(20, 0.0);
				control_lite27_tag.Component.Message(20, 0.0);
				control_lite28_tag.Component.Message(20, 0.0);
				control_lite16_tag.Component.Message(20, 0.0);
				control_lite20_tag.Component.Message(20, 0.0);
				control_hyper_lights_tag.Component.Message(20, 0.0);
				control_lite25_tag.Component.Message(20, 0.0);
				control_lite26_tag.Component.Message(20, 0.0);
				control_lite130_tag.Component.Message(20, 0.0);
				control_lite19_tag.Component.Message(20, 0.0);
				control_worm_hole_lights_tag.Component.Message(20, 0.0);
				control_bsink_arrow_lights_tag.Component.Message(20, 0.0);
				control_l_trek_lights_tag.Component.Message(20, 0.0);
				control_r_trek_lights_tag.Component.Message(20, 0.0);
				control_lite60_tag.Component.Message(20, 0.0);
				control_lite59_tag.Component.Message(20, 0.0);
				control_lite61_tag.Component.Message(20, 0.0);
				control_bumber_target_lights_tag.Component.Message(20, 0.0);
				control_top_target_lights_tag.Component.Message(20, 0.0);
				control_top_circle_tgt_lights_tag.Component.Message(20, 0.0);
				control_ramp_tgt_lights_tag.Component.Message(20, 0.0);
				control_lchute_tgt_lights_tag.Component.Message(20, 0.0);
				control_bpr_solotgt_lights_tag.Component.Message(20, 0.0);
				control_lite110_tag.Component.Message(20, 0.0);
				control_skill_shot_lights_tag.Component.Message(20, 0.0);
				control_lite77_tag.Component.Message(20, 0.0);
				control_lite198_tag.Component.Message(20, 0.0);
				control_lite196_tag.Component.Message(20, 0.0);
				control_lite195_tag.Component.Message(20, 0.0);
				control_fuel_bargraph_tag.Component.Message(20, 0.0);
				control_fuel_bargraph_tag.Component.Message(1024, 0.0);
				GravityWellKickoutControl(1024, null);
				control_lite62_tag.Component.Message(20, 0.0);
				control_lite4_tag.Component.MessageField = 0;
				control_lite101_tag.Component.MessageField = 0;
				control_lite102_tag.Component.MessageField = 0;
				control_lite103_tag.Component.MessageField = 0;
				control_ramp_tgt_lights_tag.Component.MessageField = 0;
				control_outer_circle_tag.Component.Message(34, 0.0);
				control_middle_circle_tag.Component.Message(34, 0.0);
				control_attack_bump_tag.Component.Message(1024, 0.0);
				control_launch_bump_tag.Component.Message(1024, 0.0);
				control_gate1_tag.Component.Message(1024, 0.0);
				control_gate2_tag.Component.Message(1024, 0.0);
				control_block1_tag.Component.Message(1024, 0.0);
				control_target1_tag.Component.Message(1024, 0.0);
				control_target2_tag.Component.Message(1024, 0.0);
				control_target3_tag.Component.Message(1024, 0.0);
				control_target6_tag.Component.Message(1024, 0.0);
				control_target5_tag.Component.Message(1024, 0.0);
				control_target4_tag.Component.Message(1024, 0.0);
				control_target9_tag.Component.Message(1024, 0.0);
				control_target8_tag.Component.Message(1024, 0.0);
				control_target7_tag.Component.Message(1024, 0.0);
				if (control_lite199_tag.Component.MessageField)
					control_lite198_tag.Component.MessageField = 32;
				else
					control_lite198_tag.Component.MessageField = 0;
				MissionControl(66, null);
				TableG.Message(1012, 0.0);
				if (light_on(control_lite58_tag))
					control_lite58_tag.Component.Message(20, 0.0);
				else
					TableG.ScoreSpecial2 = 25000;
			}
		}
	}
}


function table_control_handler(code)
{
	if (code == 1011)
	{
		table_unlimited_balls = 0;
		control_lite77_tag.Component.Message(7, 0.0);
	}
}


function AlienMenaceController(code, caller)
{
	if (code != 11)
	{
		if (code == 66)
		{
			control_attack_bump_tag.Component.Message(11, 0.0);
			let lTrekLight = control_l_trek_lights_tag.Component;
			control_l_trek_lights_tag.Component.Message(20, 0.0);
			lTrekLight.Message(32, 0.2);
			lTrekLight.Message(26, 0.2);
			let rTrekLight = control_r_trek_lights_tag.Component;
			control_r_trek_lights_tag.Component.Message(20, 0.0);
			rTrekLight.Message(32, 0.2);
			rTrekLight.Message(26, 0.2);
			control_lite307_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(175, 0), -1.0);
		return;
	}
	if (control_bump1_tag.Component == caller)
	{
		if (control_bump1_tag.Component.BmpIndex)
		{
			control_lite307_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 20;
			MissionControl(66, null);
		}
	}
}

function AlienMenacePartTwoController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 8;
			control_l_trek_lights_tag.Component.Message(34, 0.0);
			control_l_trek_lights_tag.Component.Message(20, 0.0);
			control_r_trek_lights_tag.Component.Message(34, 0.0);
			control_r_trek_lights_tag.Component.Message(20, 0.0);
			control_lite308_tag.Component.Message(7, 0.0);
			control_lite311_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(107, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_bump1_tag.Component == caller
		|| control_bump2_tag.Component == caller
		|| control_bump3_tag.Component == caller
		|| control_bump4_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite308_tag.Component.Message(20, 0.0);
			control_lite311_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(130, 0), 4.0);
			let addedScore = SpecialAddScore(750000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(7))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
}

function BlackHoleThreatController(code, caller)
{
	let Buffer = "";

	if (code == 11)
	{
		if (control_bump5_tag.Component == caller)
			MissionControl(67, caller);
	}
	else if (code == 63)
	{
		if (control_kickout3_tag.Component == caller
			&& control_bump5_tag.Component.BmpIndex)
		{
			if (light_on(control_lite316_tag))
				control_lite316_tag.Component.Message(20, 0.0);
			if (light_on(control_lite314_tag))
				control_lite314_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(124, 0), 4.0);
			let addedScore = SpecialAddScore(1000000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(8))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
	else
	{
		if (code == 66)
		{
			control_launch_bump_tag.Component.Message(11, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		if (control_bump5_tag.Component.BmpIndex)
		{
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(123, 0), -1.0);
			if (light_on(control_lite316_tag))
				control_lite316_tag.Component.Message(20, 0.0);
			if (!light_on(control_lite314_tag))
			{
				control_lite314_tag.Component.Message(7, 0.0);
			}
		}
		else
		{
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(122, 0), -1.0);
			if (light_on(control_lite314_tag))
				control_lite314_tag.Component.Message(20, 0.0);
			if (!light_on(control_lite316_tag))
			{
				control_lite316_tag.Component.Message(7, 0.0);
			}
		}
	}
}

function BugHuntController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 15;
			control_target1_tag.Component.MessageField = 0;
			control_target1_tag.Component.Message(50, 0.0);
			control_target2_tag.Component.MessageField = 0;
			control_target2_tag.Component.Message(50, 0.0);
			control_target3_tag.Component.MessageField = 0;
			control_target3_tag.Component.Message(50, 0.0);
			control_target6_tag.Component.MessageField = 0;
			control_target6_tag.Component.Message(50, 0.0);
			control_target5_tag.Component.MessageField = 0;
			control_target5_tag.Component.Message(50, 0.0);
			control_target4_tag.Component.MessageField = 0;
			control_target4_tag.Component.Message(50, 0.0);
			control_target9_tag.Component.MessageField = 0;
			control_target9_tag.Component.Message(50, 0.0);
			control_target8_tag.Component.MessageField = 0;
			control_target8_tag.Component.Message(50, 0.0);
			control_target7_tag.Component.MessageField = 0;
			control_target7_tag.Component.Message(50, 0.0);
			control_top_circle_tgt_lights_tag.Component.Message(20, 0.0);
			control_ramp_tgt_lights_tag.Component.Message(20, 0.0);
			control_lchute_tgt_lights_tag.Component.Message(20, 0.0);
			control_bpr_solotgt_lights_tag.Component.Message(20, 0.0);
			control_lite306_tag.Component.Message(7, 0.0);
			control_lite308_tag.Component.Message(7, 0.0);
			control_lite310_tag.Component.Message(7, 0.0);
			control_lite313_tag.Component.Message(7, 0.0);
			control_lite319_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(125, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_target1_tag.Component == caller
		|| control_target2_tag.Component == caller
		|| control_target3_tag.Component == caller
		|| control_target6_tag.Component == caller
		|| control_target5_tag.Component == caller
		|| control_target4_tag.Component == caller
		|| control_target9_tag.Component == caller
		|| control_target8_tag.Component == caller
		|| control_target7_tag.Component == caller
		|| control_target10_tag.Component == caller
		|| control_target11_tag.Component == caller
		|| control_target12_tag.Component == caller
		|| control_target13_tag.Component == caller
		|| control_target14_tag.Component == caller
		|| control_target15_tag.Component == caller
		|| control_target16_tag.Component == caller
		|| control_target17_tag.Component == caller
		|| control_target18_tag.Component == caller
		|| control_target19_tag.Component == caller
		|| control_target20_tag.Component == caller
		|| control_target21_tag.Component == caller
		|| control_target22_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite306_tag.Component.Message(20, 0.0);
			control_lite308_tag.Component.Message(20, 0.0);
			control_lite310_tag.Component.Message(20, 0.0);
			control_lite313_tag.Component.Message(20, 0.0);
			control_lite319_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(126, 0), 4.0);
			let addedScore = SpecialAddScore(750000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(7))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
}

function CosmicPlagueController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 75;
			control_lite20_tag.Component.Message(19, 0.0);
			control_lite19_tag.Component.Message(19, 0.0);
			control_lite305_tag.Component.Message(7, 0.0);
			control_lite312_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(139, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_flag1_tag.Component == caller || control_flag2_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite305_tag.Component.Message(20, 0.0);
			control_lite312_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 21;
			MissionControl(66, null);
			control_lite20_tag.Component.Message(20, 0.0);
			control_lite19_tag.Component.Message(20, 0.0);
		}
	}
}

function CosmicPlaguePartTwoController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite310_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(140, 0), -1.0);
		return;
	}
	if (control_roll9_tag.Component == caller)
	{
		control_lite310_tag.Component.Message(20, 0.0);
		control_lite198_tag.Component.MessageField = 1;
		MissionControl(66, null);
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(141, 0), 4.0);
		let addedScore = SpecialAddScore(1750000);
		Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
		if (!AddRankProgress(11))
		{
			control_mission_text_box_tag.Component.Display(Buffer, 8.0);
			control_soundwave9_tag.Component.Play();
		}
	}
}

function DoomsdayMachineController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 3;
			control_lite301_tag.Component.Message(7, 0.0);
			control_lite320_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(137, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_roll4_tag.Component == caller || control_roll8_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite301_tag.Component.Message(20, 0.0);
			control_lite320_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(138, 0), 4.0);
			let addedScore = SpecialAddScore(1250000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(9))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
}

function GameoverController(code, caller)
{
	let Buffer = "";

	if (code == 66)
	{
		control_goal_lights_tag.Component.Message(20, 0.0);
		pb.mode_change(2);
		control_flip1_tag.Component.Message(1022, 0.0);
		control_flip2_tag.Component.Message(1022, 0.0);
		control_mission_text_box_tag.Component.MessageField = 0;
		return;
	}
	if (code != 67)
		return;

	let missionMsg = control_mission_text_box_tag.Component.MessageField;
	if (missionMsg & 0x100)
	{
		let playerId = missionMsg % 4;
		let playerScore = TableG.PlayerScores[playerId].ScoreStruct.Score;
		let nextPlayerId = playerId + 1;
		if (playerScore >= 0)
		{
			let playerNScoreText = null;
			switch (nextPlayerId)
			{
			case 1:
				playerNScoreText = pinball.get_rc_string(180, 0);
				break;
			case 2:
				playerNScoreText = pinball.get_rc_string(181, 0);
				break;
			case 3:
				playerNScoreText = pinball.get_rc_string(182, 0);
				break;
			case 4:
				playerNScoreText = pinball.get_rc_string(183, 0);
				break;
			default:
				break;
			}
			if (playerNScoreText != null)
			{
				Buffer = formatString(playerNScoreText, playerScore);
				control_mission_text_box_tag.Component.Display(Buffer, 3.0);
				let msgField = nextPlayerId == TableG.PlayerCount ? 0x200 : nextPlayerId | 0x100;
				control_mission_text_box_tag.Component.MessageField = msgField;
				return;
			}
		}
		control_mission_text_box_tag.Component.MessageField = 0x200;
	}

	if (missionMsg & 0x200)
	{
		let highscoreId = missionMsg % 5;
		let highScore = pb.highscore_table[highscoreId].Score;
		let nextHidhscoreId = highscoreId + 1;
		if (highScore > 0)
		{
			let highScoreNText = null;
			switch (nextHidhscoreId)
			{
			case 1:
				highScoreNText = pinball.get_rc_string(184, 0);
				break;
			case 2:
				highScoreNText = pinball.get_rc_string(185, 0);
				break;
			case 3:
				highScoreNText = pinball.get_rc_string(186, 0);
				break;
			case 4:
				highScoreNText = pinball.get_rc_string(187, 0);
				break;
			case 5:
				highScoreNText = pinball.get_rc_string(188, 0);
				break;
			default:
				break;
			}
			if (highScoreNText != null)
			{
				Buffer = formatString(highScoreNText, highScore);
				control_mission_text_box_tag.Component.Display(Buffer, 3.0);
				let msgField = nextHidhscoreId == 5 ? 0 : nextHidhscoreId | 0x200;
				control_mission_text_box_tag.Component.MessageField = msgField;
				return;
			}
		}
	}

	control_mission_text_box_tag.Component.MessageField = 0x100;
	control_mission_text_box_tag.Component.Display(pinball.get_rc_string(172, 0), 10.0);
}

function LaunchTrainingController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite317_tag.Component.Message(7, 0.0);
			control_lite56_tag.Component.MessageField = 3;
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(110, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_ramp_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite317_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(111, 0), 4.0);
			let addedScore = SpecialAddScore(500000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(6))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
}

function MaelstromController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 3;
			control_lite303_tag.Component.Message(7, 0.0);
			control_lite309_tag.Component.Message(7, 0.0);
			control_lite315_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(148, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_target1_tag.Component == caller
		|| control_target2_tag.Component == caller
		|| control_target3_tag.Component == caller
		|| control_target6_tag.Component == caller
		|| control_target5_tag.Component == caller
		|| control_target4_tag.Component == caller
		|| control_target9_tag.Component == caller
		|| control_target8_tag.Component == caller
		|| control_target7_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite303_tag.Component.Message(20, 0.0);
			control_lite309_tag.Component.Message(20, 0.0);
			control_lite315_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 25;
			MissionControl(66, null);
		}
	}
}

function MaelstromPartEightController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite130_tag.Component.Message(19, 0.0);
			control_lite304_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(155, 0), -1.0);
		return;
	}
	if (control_kickout2_tag.Component == caller)
	{
		control_lite304_tag.Component.Message(20, 0.0);
		control_lite130_tag.Component.Message(20, 0.0);
		control_lite198_tag.Component.MessageField = 1;
		MissionControl(66, null);
		let addedScore = SpecialAddScore(5000000);
		Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
		control_info_text_box_tag.Component.Display(pinball.get_rc_string(48, 0), 4.0);
		if (!AddRankProgress(18))
		{
			control_mission_text_box_tag.Component.Display(Buffer, 8.0);
			control_soundwave9_tag.Component.Play();
		}
	}
}

function MaelstromPartFiveController(code, caller)
{
	if (code != 63)
	{
		if (code == 66)
		{
			control_lite317_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(152, 0), -1.0);
		return;
	}
	if (control_ramp_tag.Component == caller)
	{
		control_lite317_tag.Component.Message(20, 0.0);
		control_lite198_tag.Component.MessageField = 29;
		MissionControl(66, null);
	}
}

function MaelstromPartFourController(code, caller)
{
	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 0;
			control_lite318_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(151, 0), -1.0);
		return;
	}
	if (control_roll184_tag.Component == caller)
	{
		control_lite318_tag.Component.Message(20, 0.0);
		control_lite198_tag.Component.MessageField = 28;
		MissionControl(66, null);
	}
}

function MaelstromPartSevenController(code, caller)
{
	if (code != 63)
	{
		if (code == 66)
		{
			AdvanceWormHoleDestination(1);
			control_sink1_tag.Component.Message(7, 0.0);
			control_sink2_tag.Component.Message(7, 0.0);
			control_sink3_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(154, 0), -1.0);
		return;
	}
	if (control_sink1_tag.Component == caller
		|| control_sink2_tag.Component == caller
		|| control_sink3_tag.Component == caller)
	{
		control_lite198_tag.Component.MessageField = 31;
		MissionControl(66, null);
	}
}

function MaelstromPartSixController(code, caller)
{
	if (code != 63)
	{
		if (code == 66)
		{
			control_lite20_tag.Component.Message(19, 0.0);
			control_lite19_tag.Component.Message(19, 0.0);
			control_lite305_tag.Component.Message(7, 0.0);
			control_lite312_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(153, 0), -1.0);
		return;
	}
	if (control_flag1_tag.Component == caller || control_flag2_tag.Component == caller)
	{
		control_lite305_tag.Component.Message(20, 0.0);
		control_lite312_tag.Component.Message(20, 0.0);
		control_lite198_tag.Component.MessageField = 30;
		MissionControl(66, null);
		control_lite20_tag.Component.Message(20, 0.0);
		control_lite19_tag.Component.Message(20, 0.0);
	}
}

function MaelstromPartThreeController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 5;
			control_lite301_tag.Component.Message(7, 0.0);
			control_lite302_tag.Component.Message(7, 0.0);
			control_lite307_tag.Component.Message(7, 0.0);
			control_lite316_tag.Component.Message(7, 0.0);
			control_lite320_tag.Component.Message(7, 0.0);
			control_lite321_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(150, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_roll3_tag.Component == caller
		|| control_roll2_tag.Component == caller
		|| control_roll1_tag.Component == caller
		|| control_roll112_tag.Component == caller
		|| control_roll111_tag.Component == caller
		|| control_roll110_tag.Component == caller
		|| control_roll4_tag.Component == caller
		|| control_roll8_tag.Component == caller
		|| control_roll6_tag.Component == caller
		|| control_roll7_tag.Component == caller
		|| control_roll5_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite301_tag.Component.Message(20, 0.0);
			control_lite302_tag.Component.Message(20, 0.0);
			control_lite307_tag.Component.Message(20, 0.0);
			control_lite316_tag.Component.Message(20, 0.0);
			control_lite320_tag.Component.Message(20, 0.0);
			control_lite321_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 27;
			MissionControl(66, null);
		}
	}
}

function MaelstromPartTwoController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 3;
			control_lite306_tag.Component.Message(7, 0.0);
			control_lite308_tag.Component.Message(7, 0.0);
			control_lite310_tag.Component.Message(7, 0.0);
			control_lite313_tag.Component.Message(7, 0.0);
			control_lite319_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(149, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_target10_tag.Component == caller
		|| control_target11_tag.Component == caller
		|| control_target12_tag.Component == caller
		|| control_target13_tag.Component == caller
		|| control_target14_tag.Component == caller
		|| control_target15_tag.Component == caller
		|| control_target16_tag.Component == caller
		|| control_target17_tag.Component == caller
		|| control_target18_tag.Component == caller
		|| control_target19_tag.Component == caller
		|| control_target20_tag.Component == caller
		|| control_target21_tag.Component == caller
		|| control_target22_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite306_tag.Component.Message(20, 0.0);
			control_lite308_tag.Component.Message(20, 0.0);
			control_lite310_tag.Component.Message(20, 0.0);
			control_lite313_tag.Component.Message(20, 0.0);
			control_lite319_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 26;
			MissionControl(66, null);
		}
	}
}

function PracticeMissionController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite308_tag.Component.Message(7, 0.0);
			control_lite311_tag.Component.Message(7, 0.0);
			control_lite56_tag.Component.MessageField = 8;
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(107, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}

	if (control_bump1_tag.Component == caller
		|| control_bump2_tag.Component == caller
		|| control_bump3_tag.Component == caller
		|| control_bump4_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite308_tag.Component.Message(20, 0.0);
			control_lite311_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(108, 0), 4.0);
			let addedScore = SpecialAddScore(500000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(6))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
}

function ReconnaissanceController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 15;
			control_lite301_tag.Component.Message(7, 0.0);
			control_lite302_tag.Component.Message(7, 0.0);
			control_lite307_tag.Component.Message(7, 0.0);
			control_lite316_tag.Component.Message(7, 0.0);
			control_lite320_tag.Component.Message(7, 0.0);
			control_lite321_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(134, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_roll3_tag.Component == caller
		|| control_roll2_tag.Component == caller
		|| control_roll1_tag.Component == caller
		|| control_roll112_tag.Component == caller
		|| control_roll111_tag.Component == caller
		|| control_roll110_tag.Component == caller
		|| control_roll4_tag.Component == caller
		|| control_roll8_tag.Component == caller
		|| control_roll6_tag.Component == caller
		|| control_roll7_tag.Component == caller
		|| control_roll5_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, null);
		}
		else
		{
			control_lite301_tag.Component.Message(20, 0.0);
			control_lite302_tag.Component.Message(20, 0.0);
			control_lite307_tag.Component.Message(20, 0.0);
			control_lite316_tag.Component.Message(20, 0.0);
			control_lite320_tag.Component.Message(20, 0.0);
			control_lite321_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(136, 0), 4.0);
			let addedScore = SpecialAddScore(1250000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(9))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
}

function ReentryTrainingController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 3;
			control_l_trek_lights_tag.Component.Message(20, 0.0);
			(control_l_trek_lights_tag.Component).Message(32, 0.2);
			(control_l_trek_lights_tag.Component).Message(26, 0.2);
			control_r_trek_lights_tag.Component.Message(20, 0.0);
			(control_r_trek_lights_tag.Component).Message(32, 0.2);
			(control_r_trek_lights_tag.Component).Message(26, 0.2);
			control_lite307_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(112, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_roll3_tag.Component == caller
		|| control_roll2_tag.Component == caller
		|| control_roll1_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite307_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(113, 0), 4.0);
			let addedScore = SpecialAddScore(500000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(6))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
}

function RescueMissionController(code, caller)
{
	let Buffer = "";

	switch (code)
	{
	case 63:
		{
			if (control_target1_tag.Component == caller
				|| control_target2_tag.Component == caller
				|| control_target3_tag.Component == caller)
			{
				MissionControl(67, caller);
				return;
			}
			if (control_kickout2_tag.Component != caller || !light_on(control_lite20_tag))
				return;
			control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
			if (control_lite56_tag.Component.MessageField)
			{
				MissionControl(67, caller);
				return;
			}
			if (light_on(control_lite303_tag))
				control_lite303_tag.Component.Message(20, 0.0);
			if (light_on(control_lite304_tag))
				control_lite304_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(129, 0), 4.0);
			let addedScore = SpecialAddScore(750000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(7))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
			break;
		}
	case 66:
		control_lite20_tag.Component.Message(20, 0.0);
		control_lite19_tag.Component.Message(20, 0.0);
		control_lite56_tag.Component.MessageField = 1;
		break;
	case 67:
		if (light_on(control_lite20_tag))
		{
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(128, 0), -1.0);
			if (light_on(control_lite303_tag))
				control_lite303_tag.Component.Message(20, 0.0);
			if (!light_on(control_lite304_tag))
			{
				control_lite304_tag.Component.Message(7, 0.0);
			}
		}
		else
		{
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(127, 0), -1.0);
			if (light_on(control_lite304_tag))
				control_lite304_tag.Component.Message(20, 0.0);
			if (!light_on(control_lite303_tag))
			{
				control_lite303_tag.Component.Message(7, 0.0);
			}
		}
		break;
	default:
		break;
	}
}

function SatelliteController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 3;
			control_lite308_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(132, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_bump4_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite308_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(133, 0), 4.0);
			let addedScore = SpecialAddScore(1250000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(9))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
}

function ScienceMissionController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 9;
			control_target1_tag.Component.MessageField = 0;
			control_target1_tag.Component.Message(50, 0.0);
			control_target2_tag.Component.MessageField = 0;
			control_target2_tag.Component.Message(50, 0.0);
			control_target3_tag.Component.MessageField = 0;
			control_target3_tag.Component.Message(50, 0.0);
			control_target6_tag.Component.MessageField = 0;
			control_target6_tag.Component.Message(50, 0.0);
			control_target5_tag.Component.MessageField = 0;
			control_target5_tag.Component.Message(50, 0.0);
			control_target4_tag.Component.MessageField = 0;
			control_target4_tag.Component.Message(50, 0.0);
			control_target9_tag.Component.MessageField = 0;
			control_target9_tag.Component.Message(50, 0.0);
			control_target8_tag.Component.MessageField = 0;
			control_target8_tag.Component.Message(50, 0.0);
			control_target7_tag.Component.MessageField = 0;
			control_target7_tag.Component.Message(50, 0.0);
			control_lite303_tag.Component.Message(7, 0.0);
			control_lite309_tag.Component.Message(7, 0.0);
			control_lite315_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(114, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_target1_tag.Component == caller
		|| control_target2_tag.Component == caller
		|| control_target3_tag.Component == caller
		|| control_target6_tag.Component == caller
		|| control_target5_tag.Component == caller
		|| control_target4_tag.Component == caller
		|| control_target9_tag.Component == caller
		|| control_target8_tag.Component == caller
		|| control_target7_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite303_tag.Component.Message(20, 0.0);
			control_lite309_tag.Component.Message(20, 0.0);
			control_lite315_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(115, 0), 4.0);
			let addedScore = SpecialAddScore(750000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(9))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
}

function SecretMissionGreenController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite6_tag.Component.Message(19, 0.0);
			control_lite2_tag.Component.Message(11, 1.0);
			control_lite2_tag.Component.Message(19, 0.0);
			control_lite2_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		let v2 = pinball.get_rc_string(144, 0);
		control_mission_text_box_tag.Component.Display(v2, -1.0);
		return;
	}
	if (control_sink2_tag.Component == caller)
	{
		control_lite198_tag.Component.MessageField = 1;
		MissionControl(66, null);
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(145, 0), 4.0);
		let addedScore = SpecialAddScore(1500000);
		Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
		if (!AddRankProgress(10))
		{
			control_mission_text_box_tag.Component.Display(Buffer, 8.0);
			control_soundwave9_tag.Component.Play();
		}
	}
}

function SecretMissionRedController(code, caller)
{
	if (code != 63)
	{
		if (code == 66)
		{
			control_lite5_tag.Component.Message(19, 0.0);
			control_lite4_tag.Component.Message(11, 2.0);
			control_lite4_tag.Component.Message(19, 0.0);
			control_lite4_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(143, 0), -1.0);
		return;
	}
	if (control_sink1_tag.Component == caller)
	{
		control_lite198_tag.Component.MessageField = 23;
		MissionControl(66, null);
	}
}

function SecretMissionYellowController(code, caller)
{
	if (code != 63)
	{
		if (code == 66)
		{
			control_worm_hole_lights_tag.Component.Message(20, 0.0);
			control_bsink_arrow_lights_tag.Component.Message(20, 0.0);
			control_bsink_arrow_lights_tag.Component.Message(23, 0.0);
			control_lite110_tag.Component.Message(20, 0.0);
			control_lite7_tag.Component.Message(19, 0.0);
			control_lite3_tag.Component.Message(11, 0.0);
			control_lite3_tag.Component.Message(19, 0.0);
			control_lite3_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(142, 0), -1.0);
		return;
	}
	if (control_sink3_tag.Component == caller)
	{
		control_lite198_tag.Component.MessageField = 22;
		MissionControl(66, null);
	}
}

function SelectMissionController(code, caller)
{
	let Buffer = "";

	switch (code)
	{
	case 45:
	case 47:
		if (control_fuel_bargraph_tag.Component != caller)
			return;
		MissionControl(67, caller);
		return;
	case 63:
		{
			let missionLevel = 0;
			if (control_target13_tag.Component == caller)
				missionLevel = 1;
			if (control_target14_tag.Component == caller)
				missionLevel = 2;
			if (control_target15_tag.Component == caller)
				missionLevel = 3;
			if (!missionLevel)
			{
				if (control_ramp_tag.Component == caller
					&& light_on(control_lite56_tag)
					&& control_fuel_bargraph_tag.Component.Message(37, 0.0))
				{
					control_lite56_tag.Component.Message(20, 0.0);
					control_lite198_tag.Component.Message(19, 0.0);
					control_outer_circle_tag.Component.Message(26, -1.0);
					if (light_on(control_lite317_tag))
						control_lite317_tag.Component.Message(20, 0.0);
					if (light_on(control_lite318_tag))
						control_lite318_tag.Component.Message(20, 0.0);
					if (light_on(control_lite319_tag))
						control_lite319_tag.Component.Message(20, 0.0);
					control_lite198_tag.Component.MessageField = control_lite56_tag.Component.MessageField;
					// Capture the selected mission before initialization reuses lite56 as its objective counter.
					const scoreId = control_lite56_tag.Component.MessageField - 2;
					MissionControl(66, null);
					let addedScore = SpecialAddScore(mission_select_scores[scoreId]);
					Buffer = formatString(pinball.get_rc_string(77, 0), addedScore);
					control_mission_text_box_tag.Component.Display(Buffer, 4.0);
				}
				return;
			}

			if (control_lite101_tag.Component.MessageField == 7)
			{
				control_lite101_tag.Component.MessageField = 0;
				missionLevel = 4;
			}

			let missionId;
			let activeCount = control_middle_circle_tag.Component.Message(37, 0.0);
			switch (activeCount)
			{
			case 1:
				switch (missionLevel)
				{
				case 1:
					missionId = 3;
					break;
				case 2:
					missionId = 4;
					break;
				case 3:
					missionId = 2;
					break;
				default:
					missionId = 5;
					break;
				}
				break;
			case 2:
			case 3:
				switch (missionLevel)
				{
				case 1:
					missionId = 9;
					break;
				case 2:
					missionId = 11;
					break;
				case 3:
					missionId = 10;
					break;
				default:
					missionId = 16;
					break;
				}
				break;
			case 4:
			case 5:
				switch (missionLevel)
				{
				case 1:
					missionId = 6;
					break;
				case 2:
					missionId = 8;
					break;
				case 3:
					missionId = 7;
					break;
				default:
					missionId = 15;
					break;
				}
				break;
			case 6:
			case 7:
				switch (missionLevel)
				{
				case 1:
					missionId = 12;
					break;
				case 2:
					missionId = 13;
					break;
				case 3:
					missionId = 14;
					break;
				default:
					missionId = 17;
					break;
				}
				break;
			case 8:
			case 9:
				switch (missionLevel)
				{
				case 1:
					missionId = 15;
					break;
				case 2:
					missionId = 16;
					break;
				case 3:
					missionId = 17;
					break;
				default:
					missionId = 18;
					break;
				}
				break;
			default:
				return;
			}
			control_lite56_tag.Component.MessageField = missionId;
			control_lite56_tag.Component.Message(15, 2.0);
			control_lite198_tag.Component.Message(4, 0.0);
			MissionControl(67, caller);
			return;
		}
	case 66:
		control_lite198_tag.Component.Message(20, 0.0);
		control_outer_circle_tag.Component.Message(34, 0.0);
		control_ramp_tgt_lights_tag.Component.Message(20, 0.0);
		control_lite56_tag.Component.MessageField = 0;
		control_lite101_tag.Component.MessageField = 0;
		control_l_trek_lights_tag.Component.Message(34, 0.0);
		control_l_trek_lights_tag.Component.Message(20, 0.0);
		control_r_trek_lights_tag.Component.Message(34, 0.0);
		control_r_trek_lights_tag.Component.Message(20, 0.0);
		control_goal_lights_tag.Component.Message(20, 0.0);
		break;
	case 67:
		break;
	default:
		return;
	}

	if (control_fuel_bargraph_tag.Component.Message(37, 0.0))
	{
		if (light_on(control_lite56_tag))
		{
			let missionText = pinball.
				get_rc_string(MissionRcArray[control_lite56_tag.Component.MessageField - 2], 1);
			Buffer = formatString(pinball.get_rc_string(106, 0), missionText);
			control_mission_text_box_tag.Component.Display(Buffer, -1.0);
			if (light_on(control_lite318_tag))
				control_lite318_tag.Component.Message(20, 0.0);
			if (light_on(control_lite319_tag))
				control_lite319_tag.Component.Message(20, 0.0);
			if (!light_on(control_lite317_tag))
			{
				control_lite317_tag.Component.Message(7, 0.0);
			}
		}
		else
		{
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(104, 0), -1.0);
			if (light_on(control_lite317_tag))
				control_lite317_tag.Component.Message(20, 0.0);
			if (light_on(control_lite318_tag))
				control_lite318_tag.Component.Message(20, 0.0);
			if (!light_on(control_lite319_tag))
			{
				control_lite319_tag.Component.Message(7, 0.0);
			}
		}
	}
	else
	{
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(105, 0), -1.0);
		if (light_on(control_lite317_tag))
			control_lite317_tag.Component.Message(20, 0.0);
		if (light_on(control_lite319_tag))
			control_lite319_tag.Component.Message(20, 0.0);
		if (!light_on(control_lite318_tag))
		{
			control_lite318_tag.Component.Message(7, 0.0);
		}
	}
}

function SpaceRadiationController(code, caller)
{
	let Buffer = "";

	if (code == 63)
	{
		if (control_target16_tag.Component == caller
			|| control_target17_tag.Component == caller
			|| control_target18_tag.Component == caller)
		{
			if (control_lite104_tag.Component.MessageField == 7)
			{
				control_lite104_tag.Component.MessageField = 15;
				control_bsink_arrow_lights_tag.Component.Message(7, 0.0);
				control_lite313_tag.Component.Message(20, 0.0);
				MissionControl(67, caller);
				AdvanceWormHoleDestination(1);
			}
		}
		else if ((control_sink1_tag.Component == caller
				|| control_sink2_tag.Component == caller
				|| control_sink3_tag.Component == caller)
			&& control_lite104_tag.Component.MessageField == 15)
		{
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(121, 0), 4.0);
			let addedScore = SpecialAddScore(1000000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(8))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
	else
	{
		if (code == 66)
		{
			control_lchute_tgt_lights_tag.Component.Message(20, 0.0);
			control_lite104_tag.Component.MessageField = 0;
			control_lite313_tag.Component.Message(7, 0.0);
		}
		else if (code == 67)
		{
			let text;
			if (control_lite104_tag.Component.MessageField == 15)
				text = pinball.get_rc_string(120, 0);
			else
				text = pinball.get_rc_string(176, 0);
			control_mission_text_box_tag.Component.Display(text, -1.0);
		}
	}
}

function StrayCometController(code, caller)
{
	let Buffer = "";

	if (code == 63)
	{
		if (control_target19_tag.Component == caller
			|| control_target20_tag.Component == caller
			|| control_target21_tag.Component == caller)
		{
			if (control_lite107_tag.Component.MessageField == 7)
			{
				control_lite306_tag.Component.Message(20, 0.0);
				control_lite304_tag.Component.Message(7, 0.0);
				control_lite107_tag.Component.MessageField = 15;
				MissionControl(67, caller);
			}
		}
		else if (control_kickout2_tag.Component == caller && control_lite107_tag.Component.MessageField == 15)
		{
			control_lite304_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
			control_mission_text_box_tag.Component.Display(pinball.get_rc_string(119, 0), 4.0);
			let addedScore = SpecialAddScore(1000000);
			Buffer = formatString(pinball.get_rc_string(78, 0), addedScore);
			if (!AddRankProgress(8))
			{
				control_mission_text_box_tag.Component.Display(Buffer, 8.0);
				control_soundwave9_tag.Component.Play();
			}
		}
	}
	else
	{
		if (code == 66)
		{
			control_bpr_solotgt_lights_tag.Component.Message(20, 0.0);
			control_lite107_tag.Component.MessageField = 0;
			control_lite306_tag.Component.Message(7, 0.0);
		}
		else if (code == 67)
		{
			let text;
			if (control_lite107_tag.Component.MessageField == 15)
				text = pinball.get_rc_string(118, 0);
			else
				text = pinball.get_rc_string(117, 0);
			control_mission_text_box_tag.Component.Display(text, -1.0);
		}
	}
}

function TimeWarpController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite56_tag.Component.MessageField = 25;
			control_lite300_tag.Component.Message(7, 0.0);
			control_lite322_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		Buffer = formatString(pinball.get_rc_string(146, 0), control_lite56_tag.Component.MessageField);
		control_mission_text_box_tag.Component.Display(Buffer, -1.0);
		return;
	}
	if (control_rebo1_tag.Component == caller
		|| control_rebo2_tag.Component == caller
		|| control_rebo3_tag.Component == caller
		|| control_rebo4_tag.Component == caller)
	{
		control_lite56_tag.Component.MessageField = control_lite56_tag.Component.MessageField - 1;
		if (control_lite56_tag.Component.MessageField)
		{
			MissionControl(67, caller);
		}
		else
		{
			control_lite300_tag.Component.Message(20, 0.0);
			control_lite322_tag.Component.Message(20, 0.0);
			control_lite198_tag.Component.MessageField = 24;
			MissionControl(66, null);
		}
	}
}

function TimeWarpPartTwoController(code, caller)
{
	let Buffer = "";

	if (code != 63)
	{
		if (code == 66)
		{
			control_lite55_tag.Component.Message(7, -1.0);
			control_lite26_tag.Component.Message(7, -1.0);
			control_lite304_tag.Component.Message(7, 0.0);
			control_lite317_tag.Component.Message(7, 0.0);
		}
		else if (code != 67)
		{
			return;
		}
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(147, 0), -1.0);
		return;
	}
	if (control_kickout2_tag.Component == caller)
	{
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(47, 0), 4.0);
		if (control_middle_circle_tag.Component.Message(37, 0.0) > 1)
		{
			control_middle_circle_tag.Component.Message(33, 5.0);
			let rank = control_middle_circle_tag.Component.Message(37, 0.0);
			Buffer = formatString(pinball.get_rc_string(174, 0), pinball.get_rc_string(RankRcArray[rank - 1], 1));
			control_mission_text_box_tag.Component.Display(Buffer, 8.0);
		}
	}
	else
	{
		if (control_ramp_tag.Component != caller)
			return;
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(46, 0), 4.0);
		if (control_middle_circle_tag.Component.Message(37, 0.0) < 9)
		{
			let rank = control_middle_circle_tag.Component.Message(37, 0.0);
			control_middle_circle_tag.Component.Message(41, 5.0);
			Buffer = formatString(pinball.get_rc_string(173, 0), pinball.get_rc_string(RankRcArray[rank], 1));
		}
		if (!AddRankProgress(12))
		{
			control_mission_text_box_tag.Component.Display(Buffer, 8.0);
			control_soundwave10_tag.Component.Play();
		}
	}
	SpecialAddScore(2000000);
	control_lite55_tag.Component.Message(20, 0.0);
	control_lite26_tag.Component.Message(20, 0.0);
	control_lite304_tag.Component.Message(20, 0.0);
	control_lite317_tag.Component.Message(20, 0.0);
	control_lite198_tag.Component.MessageField = 1;
	MissionControl(66, null);
}

function UnselectMissionController(code, caller)
{
	control_lite198_tag.Component.MessageField = 1;
	MissionControl(66, null);
}

function WaitingDeploymentController(code, caller)
{
	switch (code)
	{
	case 63:
		if (control_oneway4_tag.Component == caller || control_oneway10_tag.Component == caller)
		{
			control_lite198_tag.Component.MessageField = 1;
			MissionControl(66, null);
		}
		break;
	case 66:
		control_mission_text_box_tag.Component.Clear();
		waiting_deployment_flag = 0;
		break;
	case 67:
		control_mission_text_box_tag.Component.Display(pinball.get_rc_string(50, 0), -1.0);
		break;
	default:
		break;
	}
}

 const api={make_links,ClearLinks,make_component_link,handler,pbctrl_bdoor_controller,table_add_extra_ball,table_set_bonus_hold,table_set_bonus,table_set_jackpot,table_set_flag_lights,table_set_multiball,table_bump_ball_sink_lock,table_set_replay,cheat_bump_rank,light_on,SpecialAddScore,AddRankProgress,AdvanceWormHoleDestination,FlipperRebounderControl1,FlipperRebounderControl2,RebounderControl,BumperControl,LeftKickerControl,RightKickerControl,LeftKickerGateControl,RightKickerGateControl,DeploymentChuteToEscapeChuteOneWayControl,DeploymentChuteToTableOneWayControl,DrainBallBlockerControl,LaunchRampControl,LaunchRampHoleControl,SpaceWarpRolloverControl,ReentryLanesRolloverControl,BumperGroupControl,LaunchLanesRolloverControl,OutLaneRolloverControl,ExtraBallLightControl,ReturnLaneRolloverControl,BonusLaneRolloverControl,FuelRollover1Control,FuelRollover2Control,FuelRollover3Control,FuelRollover4Control,FuelRollover5Control,FuelRollover6Control,HyperspaceLightGroupControl,WormHoleControl,LeftFlipperControl,RightFlipperControl,JackpotLightControl,BonusLightControl,BoosterTargetControl,MedalLightGroupControl,MultiplierLightGroupControl,FuelSpotTargetControl,MissionSpotTargetControl,LeftHazardSpotTargetControl,RightHazardSpotTargetControl,WormHoleDestinationControl,BlackHoleKickoutControl,FlagControl,GravityWellKickoutControl,SkillShotGate1Control,SkillShotGate2Control,SkillShotGate3Control,SkillShotGate4Control,SkillShotGate5Control,SkillShotGate6Control,ShootAgainLightControl,EscapeChuteSinkControl,MissionControl,HyperspaceKickOutControl,PlungerControl,MedalTargetControl,MultiplierTargetControl,BallDrainControl,table_control_handler,AlienMenaceController,AlienMenacePartTwoController,BlackHoleThreatController,BugHuntController,CosmicPlagueController,CosmicPlaguePartTwoController,DoomsdayMachineController,GameoverController,LaunchTrainingController,MaelstromController,MaelstromPartEightController,MaelstromPartFiveController,MaelstromPartFourController,MaelstromPartSevenController,MaelstromPartSixController,MaelstromPartThreeController,MaelstromPartTwoController,PracticeMissionController,ReconnaissanceController,ReentryTrainingController,RescueMissionController,SatelliteController,ScienceMissionController,SecretMissionGreenController,SecretMissionRedController,SecretMissionYellowController,SelectMissionController,SpaceRadiationController,StrayCometController,TimeWarpController,TimeWarpPartTwoController,UnselectMissionController,WaitingDeploymentController, score_components,simple_components,RankRcArray,MissionRcArray,mission_select_scores,
 tags:Object.fromEntries([["control_attack_bump_tag",control_attack_bump_tag],["control_launch_bump_tag",control_launch_bump_tag],["control_block1_tag",control_block1_tag],["control_bump1_tag",control_bump1_tag],["control_bump2_tag",control_bump2_tag],["control_bump3_tag",control_bump3_tag],["control_bump4_tag",control_bump4_tag],["control_bump5_tag",control_bump5_tag],["control_bump6_tag",control_bump6_tag],["control_bump7_tag",control_bump7_tag],["control_drain_tag",control_drain_tag],["control_flag1_tag",control_flag1_tag],["control_flag2_tag",control_flag2_tag],["control_flip1_tag",control_flip1_tag],["control_flip2_tag",control_flip2_tag],["control_fuel_bargraph_tag",control_fuel_bargraph_tag],["control_gate1_tag",control_gate1_tag],["control_gate2_tag",control_gate2_tag],["control_info_text_box_tag",control_info_text_box_tag],["control_kicker1_tag",control_kicker1_tag],["control_kicker2_tag",control_kicker2_tag],["control_kickout1_tag",control_kickout1_tag],["control_kickout2_tag",control_kickout2_tag],["control_kickout3_tag",control_kickout3_tag],["control_lite1_tag",control_lite1_tag],["control_lite2_tag",control_lite2_tag],["control_lite3_tag",control_lite3_tag],["control_lite4_tag",control_lite4_tag],["control_lite5_tag",control_lite5_tag],["control_lite6_tag",control_lite6_tag],["control_lite7_tag",control_lite7_tag],["control_lite8_tag",control_lite8_tag],["control_lite9_tag",control_lite9_tag],["control_lite10_tag",control_lite10_tag],["control_lite11_tag",control_lite11_tag],["control_lite12_tag",control_lite12_tag],["control_lite13_tag",control_lite13_tag],["control_lite16_tag",control_lite16_tag],["control_lite17_tag",control_lite17_tag],["control_lite18_tag",control_lite18_tag],["control_lite19_tag",control_lite19_tag],["control_lite20_tag",control_lite20_tag],["control_lite21_tag",control_lite21_tag],["control_lite22_tag",control_lite22_tag],["control_lite23_tag",control_lite23_tag],["control_lite24_tag",control_lite24_tag],["control_lite25_tag",control_lite25_tag],["control_lite26_tag",control_lite26_tag],["control_lite27_tag",control_lite27_tag],["control_lite28_tag",control_lite28_tag],["control_lite29_tag",control_lite29_tag],["control_lite30_tag",control_lite30_tag],["control_lite54_tag",control_lite54_tag],["control_lite55_tag",control_lite55_tag],["control_lite56_tag",control_lite56_tag],["control_lite58_tag",control_lite58_tag],["control_lite59_tag",control_lite59_tag],["control_lite60_tag",control_lite60_tag],["control_lite61_tag",control_lite61_tag],["control_lite62_tag",control_lite62_tag],["control_lite67_tag",control_lite67_tag],["control_lite68_tag",control_lite68_tag],["control_lite69_tag",control_lite69_tag],["control_lite70_tag",control_lite70_tag],["control_lite71_tag",control_lite71_tag],["control_lite72_tag",control_lite72_tag],["control_lite77_tag",control_lite77_tag],["control_lite84_tag",control_lite84_tag],["control_lite85_tag",control_lite85_tag],["control_lite101_tag",control_lite101_tag],["control_lite102_tag",control_lite102_tag],["control_lite103_tag",control_lite103_tag],["control_lite104_tag",control_lite104_tag],["control_lite105_tag",control_lite105_tag],["control_lite106_tag",control_lite106_tag],["control_lite107_tag",control_lite107_tag],["control_lite108_tag",control_lite108_tag],["control_lite109_tag",control_lite109_tag],["control_lite110_tag",control_lite110_tag],["control_lite130_tag",control_lite130_tag],["control_lite131_tag",control_lite131_tag],["control_lite132_tag",control_lite132_tag],["control_lite133_tag",control_lite133_tag],["control_lite169_tag",control_lite169_tag],["control_lite170_tag",control_lite170_tag],["control_lite171_tag",control_lite171_tag],["control_lite195_tag",control_lite195_tag],["control_lite196_tag",control_lite196_tag],["control_lite198_tag",control_lite198_tag],["control_lite199_tag",control_lite199_tag],["control_lite200_tag",control_lite200_tag],["control_lite300_tag",control_lite300_tag],["control_lite301_tag",control_lite301_tag],["control_lite302_tag",control_lite302_tag],["control_lite303_tag",control_lite303_tag],["control_lite304_tag",control_lite304_tag],["control_lite305_tag",control_lite305_tag],["control_lite306_tag",control_lite306_tag],["control_lite307_tag",control_lite307_tag],["control_lite308_tag",control_lite308_tag],["control_lite309_tag",control_lite309_tag],["control_lite310_tag",control_lite310_tag],["control_lite311_tag",control_lite311_tag],["control_lite312_tag",control_lite312_tag],["control_lite313_tag",control_lite313_tag],["control_lite314_tag",control_lite314_tag],["control_lite315_tag",control_lite315_tag],["control_lite316_tag",control_lite316_tag],["control_lite317_tag",control_lite317_tag],["control_lite318_tag",control_lite318_tag],["control_lite319_tag",control_lite319_tag],["control_lite320_tag",control_lite320_tag],["control_lite321_tag",control_lite321_tag],["control_lite322_tag",control_lite322_tag],["control_literoll179_tag",control_literoll179_tag],["control_literoll180_tag",control_literoll180_tag],["control_literoll181_tag",control_literoll181_tag],["control_literoll182_tag",control_literoll182_tag],["control_literoll183_tag",control_literoll183_tag],["control_literoll184_tag",control_literoll184_tag],["control_middle_circle_tag",control_middle_circle_tag],["control_lchute_tgt_lights_tag",control_lchute_tgt_lights_tag],["control_l_trek_lights_tag",control_l_trek_lights_tag],["control_goal_lights_tag",control_goal_lights_tag],["control_hyper_lights_tag",control_hyper_lights_tag],["control_bmpr_inc_lights_tag",control_bmpr_inc_lights_tag],["control_bpr_solotgt_lights_tag",control_bpr_solotgt_lights_tag],["control_bsink_arrow_lights_tag",control_bsink_arrow_lights_tag],["control_bumber_target_lights_tag",control_bumber_target_lights_tag],["control_outer_circle_tag",control_outer_circle_tag],["control_r_trek_lights_tag",control_r_trek_lights_tag],["control_ramp_bmpr_inc_lights_tag",control_ramp_bmpr_inc_lights_tag],["control_ramp_tgt_lights_tag",control_ramp_tgt_lights_tag],["control_skill_shot_lights_tag",control_skill_shot_lights_tag],["control_top_circle_tgt_lights_tag",control_top_circle_tgt_lights_tag],["control_top_target_lights_tag",control_top_target_lights_tag],["control_worm_hole_lights_tag",control_worm_hole_lights_tag],["control_mission_text_box_tag",control_mission_text_box_tag],["control_oneway1_tag",control_oneway1_tag],["control_oneway4_tag",control_oneway4_tag],["control_oneway10_tag",control_oneway10_tag],["control_plunger_tag",control_plunger_tag],["control_ramp_hole_tag",control_ramp_hole_tag],["control_ramp_tag",control_ramp_tag],["control_rebo1_tag",control_rebo1_tag],["control_rebo2_tag",control_rebo2_tag],["control_rebo3_tag",control_rebo3_tag],["control_rebo4_tag",control_rebo4_tag],["control_roll1_tag",control_roll1_tag],["control_roll2_tag",control_roll2_tag],["control_roll3_tag",control_roll3_tag],["control_roll4_tag",control_roll4_tag],["control_roll5_tag",control_roll5_tag],["control_roll6_tag",control_roll6_tag],["control_roll7_tag",control_roll7_tag],["control_roll8_tag",control_roll8_tag],["control_roll9_tag",control_roll9_tag],["control_roll110_tag",control_roll110_tag],["control_roll111_tag",control_roll111_tag],["control_roll112_tag",control_roll112_tag],["control_roll179_tag",control_roll179_tag],["control_roll180_tag",control_roll180_tag],["control_roll181_tag",control_roll181_tag],["control_roll182_tag",control_roll182_tag],["control_roll183_tag",control_roll183_tag],["control_roll184_tag",control_roll184_tag],["control_sink1_tag",control_sink1_tag],["control_sink2_tag",control_sink2_tag],["control_sink3_tag",control_sink3_tag],["control_sink7_tag",control_sink7_tag],["control_soundwave3_tag",control_soundwave3_tag],["control_soundwave7_tag",control_soundwave7_tag],["control_soundwave8_tag",control_soundwave8_tag],["control_soundwave9_tag",control_soundwave9_tag],["control_soundwave10_tag",control_soundwave10_tag],["control_soundwave14_1_tag",control_soundwave14_1_tag],["control_soundwave14_2_tag",control_soundwave14_2_tag],["control_soundwave21_tag",control_soundwave21_tag],["control_soundwave23_tag",control_soundwave23_tag],["control_soundwave24_tag",control_soundwave24_tag],["control_soundwave25_tag",control_soundwave25_tag],["control_soundwave26_tag",control_soundwave26_tag],["control_soundwave27_tag",control_soundwave27_tag],["control_soundwave28_tag",control_soundwave28_tag],["control_soundwave30_tag",control_soundwave30_tag],["control_soundwave35_1_tag",control_soundwave35_1_tag],["control_soundwave35_2_tag",control_soundwave35_2_tag],["control_soundwave36_1_tag",control_soundwave36_1_tag],["control_soundwave36_2_tag",control_soundwave36_2_tag],["control_soundwave38_tag",control_soundwave38_tag],["control_soundwave39_tag",control_soundwave39_tag],["control_soundwave40_tag",control_soundwave40_tag],["control_soundwave41_tag",control_soundwave41_tag],["control_soundwave44_tag",control_soundwave44_tag],["control_soundwave45_tag",control_soundwave45_tag],["control_soundwave46_tag",control_soundwave46_tag],["control_soundwave47_tag",control_soundwave47_tag],["control_soundwave48_tag",control_soundwave48_tag],["control_soundwave49D_tag",control_soundwave49D_tag],["control_soundwave50_1_tag",control_soundwave50_1_tag],["control_soundwave50_2_tag",control_soundwave50_2_tag],["control_soundwave52_tag",control_soundwave52_tag],["control_soundwave59_tag",control_soundwave59_tag],["control_target1_tag",control_target1_tag],["control_target2_tag",control_target2_tag],["control_target3_tag",control_target3_tag],["control_target4_tag",control_target4_tag],["control_target5_tag",control_target5_tag],["control_target6_tag",control_target6_tag],["control_target7_tag",control_target7_tag],["control_target8_tag",control_target8_tag],["control_target9_tag",control_target9_tag],["control_target10_tag",control_target10_tag],["control_target11_tag",control_target11_tag],["control_target12_tag",control_target12_tag],["control_target13_tag",control_target13_tag],["control_target14_tag",control_target14_tag],["control_target15_tag",control_target15_tag],["control_target16_tag",control_target16_tag],["control_target17_tag",control_target17_tag],["control_target18_tag",control_target18_tag],["control_target19_tag",control_target19_tag],["control_target20_tag",control_target20_tag],["control_target21_tag",control_target21_tag],["control_target22_tag",control_target22_tag],["control_trip1_tag",control_trip1_tag],["control_trip2_tag",control_trip2_tag],["control_trip3_tag",control_trip3_tag],["control_trip4_tag",control_trip4_tag],["control_trip5_tag",control_trip5_tag]]),
 get TableG(){return TableG;},get table_unlimited_balls(){return table_unlimited_balls;},set table_unlimited_balls(value){table_unlimited_balls=value;},
 get waiting_deployment_flag(){return waiting_deployment_flag;},set waiting_deployment_flag(value){waiting_deployment_flag=value;},
 get pbctrl_state(){return pbctrl_state;}
 };
 return api;
}




