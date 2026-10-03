// The original PARTOUT data has been decoded to readable JSON. No binary
// reader, executable, native library or WebAssembly is used at runtime.
export function createLoader(geometry, runtime) {
  const groups = new Map(geometry.groups.map(group => [group.groupIndex, group]));
  const names = new Map(geometry.groups.filter(group => group.name).map(group => [group.name, group.groupIndex]));
  const sounds = new Map(geometry.sounds.map(sound => [sound.groupIndex, sound]));
  const soundIds = new Map(geometry.sounds.map(sound => [sound.id, sound]));
  const stateId = (group, state = 0) => state ? group + state : group;
  const vec = array => ({ X: array?.[0] || 0, Y: array?.[1] || 0, Z: array?.[2] || 0 });
  const loader = {
    groups,
    query_handle: name => names.get(name) ?? -1,
    query_name: group => groups.get(group)?.name || null,
    query_visual_states(group) { const data = groups.get(group)?.shortArrays[0]; return data?.[0] === 100 ? data[1] : 1; },
    query_iattribute(group, attribute) { return groups.get(group)?.shortArrays.find(array => array[0] === attribute)?.slice(1) || []; },
    query_float_attribute(group, state, attribute, defaultValue) {
      const data = groups.get(stateId(group, state))?.floatArrays.find(array => Math.floor(array[0]) === attribute);
      if (defaultValue !== undefined) return data ? data[1] : defaultValue;
      return data?.slice(1) || null;
    },
    get_sound_id(group) { return sounds.get(group)?.id || 0; },
    play_sound(id) {
      if (id <= 0) return 0;
      runtime.sound?.play_sound?.(id);
      return soundIds.get(id)?.duration || 0;
    },
    default_vsi() {
      return { CollisionGroup: 0, Kicker: { Threshold: Math.fround(8.9999999e10), Boost: 0, ThrowBallMult: 0, ThrowBallAcceleration: vec(), ThrowBallAngleMult: 0, HardHitSoundId: 0 }, Smoothness: Math.fround(.95), Elasticity: Math.fround(.6), FloatArrCount: 0, FloatArr: [], SoftHitSoundId: 0, Bitmap: null, ZMap: null, SoundIndex3: 0, SoundIndex4: 0 };
    },
    query_visual(group, state = 0) {
      const visual = loader.default_vsi(), record = groups.get(stateId(group, state));
      if (!record) return visual;
      visual.Bitmap = record.bitmaps?.[0] || null; visual.ZMap = record.depthMaps?.[0] || null;
      const material = materialGroup => {
        const data = groups.get(materialGroup)?.floatArrays[0] || [];
        for (let i = 0; i < data.length; i += 2) {
          if (data[i] === 301) visual.Smoothness = data[i + 1];
          if (data[i] === 302) visual.Elasticity = data[i + 1];
          if (data[i] === 304) visual.SoftHitSoundId = loader.get_sound_id(Math.floor(data[i + 1]));
        }
      };
      const kicker = kickerGroup => {
        const data = groups.get(kickerGroup)?.floatArrays[0] || [], kick = visual.Kicker;
        for (let i = 0; i < data.length;) {
          const attribute = Math.floor(data[i++]);
          if (attribute === 404) { kick.ThrowBallAcceleration = vec(data.slice(i, i + 3)); i += 3; continue; }
          const value = data[i++];
          if (attribute === 401) kick.Threshold = value;
          if (attribute === 402) kick.Boost = value;
          if (attribute === 403) kick.ThrowBallMult = value;
          if (attribute === 405) kick.ThrowBallAngleMult = value;
          if (attribute === 406) kick.HardHitSoundId = loader.get_sound_id(Math.floor(value));
        }
      };
      const data = record.shortArrays[0] || [];
      for (let i = 0; i < data.length;) {
        const attribute = data[i], value = data[i + 1];
        if (attribute === 300) material(value);
        if (attribute === 400) kicker(value);
        if (attribute === 304) visual.SoftHitSoundId = loader.get_sound_id(value);
        if (attribute === 406) visual.Kicker.HardHitSoundId = loader.get_sound_id(value);
        if (attribute === 602) visual.CollisionGroup |= 1 << value;
        if (attribute === 1100) visual.SoundIndex4 = loader.get_sound_id(value);
        if (attribute === 1101) visual.SoundIndex3 = loader.get_sound_id(value);
        i += attribute === 1500 ? 9 : 2;
      }
      visual.CollisionGroup ||= 1;
      const floats = record.floatArrays[0];
      if (floats?.[0] === 600) {
        visual.FloatArr = floats.slice(2);
        visual.FloatArrCount = floats[1] === 1 ? 1 : floats[1] === 2 ? 2 : Math.floor(floats.length / 2) - 2;
      }
      return visual;
    },
  };
  return loader;
}
