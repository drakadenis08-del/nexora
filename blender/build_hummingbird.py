"""NEXORA hummingbird mascot: modelling, rig, animation, save and glTF export.

Run with Blender's Python (bpy 5.2):  python build.py <out_dir>
Everything is procedural so the asset can be rebuilt and tweaked from this one file.
"""
import math, sys, os, random
import bpy, bmesh
from mathutils import Vector, Matrix, Euler, Quaternion
from mathutils.bvhtree import BVHTree

OUT = sys.argv[-1] if len(sys.argv) > 1 and not sys.argv[-1].endswith('.py') else '/home/claude/bird/out'
os.makedirs(OUT, exist_ok=True)
FPS = 60

# ---------- palette (sRGB hex -> linear) ----------
def lin(h):
    h = h.lstrip('#'); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return Vector([x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c])

LAV, LAV_D, SKY, SKY_D, MINT, CREAM = lin('#8B7CFF'), lin('#6F5FE8'), lin('#64B5F6'), lin('#4E9EE6'), lin('#7EE6D8'), lin('#FCFBFF')
LAV_L, SKY_L = lin('#B9AFFF'), lin('#A9D4FA')
PUPIL, IRIS, WHITE = lin('#151A33'), lin('#3B4BB0'), Vector((1, 1, 1))

def mix(a, b, t): t = max(0.0, min(1.0, t)); return a * (1 - t) + b * t
def smooth(e0, e1, x): t = max(0.0, min(1.0, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t)

# ---------- clean scene ----------
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.render.fps = FPS
coll = scene.collection

# ---------- 1. body + head: metaballs -> remesh -> decimate ----------
mb = bpy.data.metaballs.new('BodyMB')
mb.resolution = 0.03; mb.render_resolution = 0.03; mb.threshold = 0.6
mbo = bpy.data.objects.new('BodyMB', mb); coll.objects.link(mbo)

def ball(co, r, size=(1, 1, 1), rot=(0, 0, 0), stiff=2.0, kind='ELLIPSOID'):
    e = mb.elements.new(type=kind); e.co = co; e.radius = r; e.stiffness = stiff
    if kind == 'ELLIPSOID': e.size_x, e.size_y, e.size_z = size
    e.rotation = Euler(rot).to_quaternion()

HEAD_C = Vector((0, -0.16, 0.6))
ball((0, 0.08, -0.1), 0.74, (0.84, 0.86, 1.0), (math.radians(-20), 0, 0), stiff=1.6)   # teardrop body, leaning back
ball((0, -0.1, 0.22), 0.5, (0.9, 0.9, 0.85), stiff=1.4)                               # chest, blends body into head
ball(tuple(HEAD_C), 0.66, (1, 0.97, 0.95), stiff=1.8)                                 # big head
ball((0, 0.24, -0.5), 0.3, (0.62, 0.7, 1.0), (math.radians(-38), 0, 0), stiff=1.2)   # rump, tapering to the tail
dg = bpy.context.evaluated_depsgraph_get()
raw = bpy.data.meshes.new_from_object(mbo.evaluated_get(dg))
tmp = bpy.data.objects.new('tmp', raw); coll.objects.link(tmp)
rm = tmp.modifiers.new('rm', 'REMESH'); rm.mode = 'VOXEL'; rm.voxel_size = 0.028
sm = tmp.modifiers.new('sm', 'SMOOTH'); sm.factor = 0.6; sm.iterations = 6
dc = tmp.modifiers.new('dc', 'DECIMATE'); dc.ratio = 0.45
dg = bpy.context.evaluated_depsgraph_get()
body_me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
for o in (tmp, mbo): bpy.data.objects.remove(o)

# ---------- master bmesh ----------
bm = bmesh.new(); bm.from_mesh(body_me)
col = bm.verts.layers.float_color.new('Col')
dfl = bm.verts.layers.deform.verify()
BONES = ['Root', 'Body', 'Head', 'Eye.L', 'Eye.R', 'Lid.L', 'Lid.R', 'Wing.L', 'Wing.R', 'Tail']
BI = {n: i for i, n in enumerate(BONES)}
MATS = ['Feathers', 'Eye', 'Beak', 'Catchlight']
MI = {n: i for i, n in enumerate(MATS)}

bvh = BVHTree.FromBMesh(bm)
def surface(origin, d):
    """Point where a ray from `origin` going out along `d` leaves the body surface."""
    d = Vector(d).normalized(); far = origin + d * 3
    hit, nrm, _, _ = bvh.ray_cast(far, -d)
    return hit, nrm

# body colours and weights
for v in bm.verts:
    p = v.co
    head_w = smooth(0.22, 0.48, p.z + 0.1 * (-p.y))      # neck blend, a bit lower at the front
    front = smooth(-0.1, -0.45, p.y)                      # 1 at the front
    throat = front * smooth(0.02, 0.18, p.z) * (1 - smooth(0.32, 0.46, p.z)) * (1 - smooth(0.16, 0.3, abs(p.x)))
    belly = front * (1 - smooth(-0.05, 0.2, p.z)) * smooth(-0.75, -0.35, p.z)
    back = smooth(0.05, 0.5, p.y)
    c = mix(LAV, LAV_D, back * 0.55)
    c = mix(c, mix(LAV, CREAM, 0.6), belly * 0.9)
    c = mix(c, mix(SKY, SKY_D, back * 0.45), head_w)
    c = mix(c, MINT, throat * 0.95)
    c = mix(c, SKY_L, smooth(0.95, 1.25, p.z) * 0.45)   # soft light on top of the head
    v[col] = (*c, 1.0)
    v[dfl][BI['Body']] = 1 - head_w
    if head_w > 0: v[dfl][BI['Head']] = head_w
for f in bm.faces: f.material_index = MI['Feathers']; f.smooth = True

def add_geom(geom_verts, bone, mat, color_fn, smooth_faces=True):
    vs = list(geom_verts)
    for v in vs:
        v[dfl][BI[bone]] = 1.0
        c = color_fn(v)
        v[col] = (*c, 1.0)
    fs = {f for v in vs for f in v.link_faces}
    for f in fs: f.material_index = MI[mat]; f.smooth = smooth_faces
    return vs

# ---------- 2. eyes, lids, catchlights ----------
EYE_R = 0.165
EYE = {}
for side, sx in (('L', 1), ('R', -1)):
    look = Vector((0.27 * sx, -1, 0.06)).normalized()
    out_dir = Vector((0.56 * sx, -0.8, 0.16)).normalized()          # where the eye sits on the head
    hit, nrm = surface(HEAD_C, out_dir)
    centre = hit - out_dir * EYE_R * 0.55
    R = Vector((0, -1, 0)).rotation_difference(look).to_matrix().to_4x4()
    M = Matrix.Translation(centre) @ R
    r = bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=18, radius=EYE_R, matrix=M)
    def eye_col(v, M=M):
        local = (M.inverted() @ v.co).normalized()
        a = math.degrees(math.acos(max(-1, min(1, -local.y))))
        if a < 26: return PUPIL
        if a < 50: return mix(PUPIL, IRIS, smooth(26, 34, a)) if a < 34 else mix(IRIS, lin('#5E7BE0'), smooth(34, 50, a))
        return CREAM
    add_geom(r['verts'], 'Eye.' + side, 'Eye', eye_col)
    # eyelid: back hemisphere shell, hidden inside the head while open
    r = bmesh.ops.create_uvsphere(bm, u_segments=28, v_segments=14, radius=EYE_R * 1.15, matrix=Matrix())
    kill = [v for v in r['verts'] if v.co.y < -0.004]
    lid_vs = [v for v in r['verts'] if v not in set(kill)]
    bmesh.ops.delete(bm, geom=kill, context='VERTS')
    for v in lid_vs: v.co = M @ v.co
    add_geom(lid_vs, 'Lid.' + side, 'Feathers', lambda v: mix(SKY, SKY_D, 0.35))
    # two catchlights, fixed to the head so the eye can look around under them
    for k, (dx, dz, rr) in enumerate(((-0.36 * sx, 0.42, 0.04), (0.26 * sx, -0.3, 0.019))):
        n = (R.to_3x3() @ Vector((dx, -1, dz))).normalized()        # point on the eye surface
        pos = centre + n * (EYE_R * 0.995)
        Q = Vector((0, -1, 0)).rotation_difference(n).to_matrix().to_4x4()
        S = Matrix.Translation(pos) @ Q @ Matrix.Diagonal((1, 0.3, 1, 1))
        r = bmesh.ops.create_uvsphere(bm, u_segments=10, v_segments=6, radius=rr, matrix=S)
        add_geom(r['verts'], 'Head', 'Catchlight', lambda v: WHITE)
    EYE[side] = (centre, look)

# ---------- 3. beak ----------
hit, nrm = surface(HEAD_C, Vector((0, -1, -0.08)))
beak_base = hit + Vector((0, 0.06, 0))
r = bmesh.ops.create_cone(bm, cap_ends=True, segments=14, radius1=0.075, radius2=0.006, depth=0.62,
                          matrix=Matrix.Translation(beak_base + Vector((0, -0.29, -0.02))) @ Matrix.Rotation(math.radians(90 + 4), 4, 'X'))
for v in r['verts']:                     # gentle downward curve
    t = max(0.0, (beak_base.y - v.co.y) / 0.62)
    v.co.z -= 0.06 * t * t
add_geom(r['verts'], 'Head', 'Beak', lambda v: WHITE)

# ---------- 4. feathers ----------
def blade(length, width, curve=0.06, thick=0.012, segs=9, tip_round=0.35):
    """Feather blade: length along +X, width along Z, thin along Y, lens-shaped section, curved in Y."""
    rows = []
    for i in range(segs + 1):
        t = i / segs
        w = width * (math.sin(math.pi * t) ** 0.55) * (1.0 - 0.25 * t) + 0.012
        x = length * t; y = curve * t * t
        rows.append((t, x, y, w))
    top, bot, L, Rr = [], [], [], []
    for t, x, y, w in rows:
        L.append(bm.verts.new((x, y, w / 2))); Rr.append(bm.verts.new((x, y, -w / 2)))
        top.append(bm.verts.new((x, y - thick, 0))); bot.append(bm.verts.new((x, y + thick, 0)))
    for i in range(segs):
        bm.faces.new((L[i], L[i + 1], top[i + 1], top[i])); bm.faces.new((top[i], top[i + 1], Rr[i + 1], Rr[i]))
        bm.faces.new((L[i + 1], L[i], bot[i], bot[i + 1])); bm.faces.new((bot[i + 1], bot[i], Rr[i], Rr[i + 1]))
    bm.faces.new((L[0], top[0], Rr[0], bot[0]))
    vs = L + Rr + top + bot
    return vs, [r[0] for r in rows]

def place(vs, M):
    for v in vs: v.co = M @ v.co

def add_feather(bone, M, length, width, cols, curve=0.06, thick=0.012):
    vs, _ = blade(length, width, curve, thick)
    # colour along the blade before placing it (local x = distance from the root)
    for v in vs:
        t = v.co.x / length
        c = mix(cols[0], cols[1], smooth(0.0, 0.55, t)); c = mix(c, cols[2], smooth(0.6, 1.0, t))
        v[col] = (*c, 1.0); v[dfl][BI[bone]] = 1.0
    fs = list({f for v in vs for f in v.link_faces})
    for f in fs: f.material_index = MI['Feathers']; f.smooth = True
    place(vs, M)
    if M.determinant() < 0: bmesh.ops.reverse_faces(bm, faces=fs)

BODY_C = Vector((0, 0.08, -0.12))
SHOULDER = {}
for side, sx in (('L', 1), ('R', -1)):
    hit, nrm = surface(BODY_C + Vector((0, 0, 0.18)), Vector((sx, 0.3, 0.2)))
    sh = hit - Vector((sx * 0.06, 0, 0)); SHOULDER[side] = sh
    base = Matrix.Translation(sh) @ Matrix.Rotation(math.radians(18) * sx, 4, 'Z')   # swept slightly back
    mirror = Matrix.Diagonal((sx, 1, 1, 1))
    # primaries: long, fanned from near-horizontal to steep
    for k in range(6):
        ang = math.radians(12 + k * 11.5); ln = 1.02 - k * 0.07
        M = base @ mirror @ Matrix.Rotation(ang, 4, 'Y').inverted() @ Matrix.Translation((0.02, 0.012 * k, 0))
        add_feather('Wing.' + side, M, ln, 0.2, (LAV, SKY, mix(SKY_L, CREAM, 0.5)), curve=0.07)
    # coverts: shorter, wider, sitting in front
    for k in range(4):
        ang = math.radians(18 + k * 14); ln = 0.5 - k * 0.04
        M = base @ mirror @ Matrix.Rotation(ang, 4, 'Y').inverted() @ Matrix.Translation((0.0, -0.035 - 0.006 * k, 0))
        add_feather('Wing.' + side, M, ln, 0.22, (LAV_D, LAV, LAV_L), curve=0.04)

# tail: fan of five feathers hanging down and back
hit, nrm = surface(Vector((0, 0.22, -0.5)), Vector((0, 0.7, -1)))
TAIL_P = hit - Vector((0, 0.05, -0.06))
for k in range(5):
    a = math.radians(-30 + k * 15); ln = 0.78 - abs(k - 2) * 0.07
    M = (Matrix.Translation(TAIL_P) @ Matrix.Rotation(math.radians(32), 4, 'X') @ Matrix.Rotation(a, 4, 'Y')
         @ Matrix.Rotation(math.radians(90), 4, 'Y') @ Matrix.Translation((0, 0.01 * abs(k - 2), 0)))
    add_feather('Tail', M, ln, 0.2, (LAV_D, LAV, SKY), curve=0.1)

# crest: three small feathers on top of the head
hit, nrm = surface(HEAD_C, Vector((0, 0.35, 1)))
for k, (a, ln) in enumerate(((-18, 0.24), (0, 0.3), (18, 0.22))):
    M = Matrix.Translation(hit - Vector((0, 0, 0.04))) @ Matrix.Rotation(math.radians(a), 4, 'Y') @ Matrix.Rotation(math.radians(-40), 4, 'X') @ Matrix.Rotation(math.radians(-90), 4, 'Y')
    add_feather('Head', M, ln, 0.08, (SKY, SKY_L, MINT), curve=-0.05, thick=0.01)

bm.normal_update()
me = bpy.data.meshes.new('Hummingbird')
bm.to_mesh(me); bm.free()
me.color_attributes.active_color_name = 'Col'
me.color_attributes.render_color_index = me.color_attributes.find('Col')
bird = bpy.data.objects.new('Hummingbird', me); coll.objects.link(bird)
for n in BONES: bird.vertex_groups.new(name=n)

# ---------- 5. materials ----------
def principled(name, base=(1, 1, 1), rough=0.5, use_col=True, coat=0.0, emit=0.0):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; p = nt.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*base, 1)
    p.inputs['Roughness'].default_value = rough
    if use_col:
        a = nt.nodes.new('ShaderNodeVertexColor'); a.layer_name = 'Col'
        nt.links.new(a.outputs['Color'], p.inputs['Base Color'])
    if coat: p.inputs['Coat Weight'].default_value = coat; p.inputs['Coat Roughness'].default_value = 0.05
    if emit:
        p.inputs['Emission Color'].default_value = (*base, 1); p.inputs['Emission Strength'].default_value = emit
    return m

me.materials.append(principled('Feathers', rough=0.62))
me.materials.append(principled('Eye', rough=0.12, coat=1.0))
me.materials.append(principled('Beak', base=tuple(lin('#2B3553')), rough=0.38, use_col=False))
me.materials.append(principled('Catchlight', base=tuple(CREAM), rough=0.2, use_col=False, emit=2.0))

# ---------- 6. rig ----------
arm_d = bpy.data.armatures.new('NEXORA_Rig'); arm = bpy.data.objects.new('NEXORA_Rig', arm_d); coll.objects.link(arm)
bpy.context.view_layer.objects.active = arm; arm.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
eb = arm_d.edit_bones
def bone(name, head, length=0.2, parent=None, roll_to=None):
    b = eb.new(name); b.head = Vector(head); b.tail = Vector(head) + Vector((0, 0, length))
    if roll_to is not None: b.align_roll(roll_to)
    if parent: b.parent = eb[parent]
    return b
bone('Root', (0, 0.05, -1.0), 0.25)
bone('Body', (0, 0.08, -0.35), 0.45, 'Root')
bone('Head', (0, -0.1, 0.3), 0.5, 'Body')
for s in ('L', 'R'):
    c, look = EYE[s]
    bone('Eye.' + s, c, 0.12, 'Head')
    bone('Lid.' + s, c, 0.12, 'Head', roll_to=-Vector((look.x, look.y, 0)).normalized())
    bone('Wing.' + s, SHOULDER[s], 0.2, 'Body')
bone('Tail', TAIL_P, 0.15, 'Body')
bpy.ops.object.mode_set(mode='OBJECT')
for n in BONES: arm_d.bones[n].use_deform = True
bird.parent = arm
mod = bird.modifiers.new('Armature', 'ARMATURE'); mod.object = arm
# 3/4 turn toward the page content (the mascot sits at the right of the hero)
arm.rotation_euler = (0, 0, math.radians(-24))

# ---------- 7. animation ----------
pb = arm.pose.bones
for b in pb: b.rotation_mode = 'XYZ'
LOOP_BONES = ['Root', 'Body', 'Head', 'Eye.L', 'Eye.R', 'Wing.L', 'Wing.R', 'Tail']
arm.animation_data_create()
bpy.context.preferences.edit.keyframe_new_interpolation_type = 'LINEAR'  # one key per frame, so straight segments are exact
TAU = math.tau
R = math.radians

def pose_reset():
    for b in pb: b.location = (0, 0, 0); b.rotation_euler = (0, 0, 0); b.scale = (1, 1, 1)

def flap(phase, amp=1.0):
    """Wing raise angle about the bone's front axis, plus a small forward/back sweep (figure-eight feel)."""
    s = math.sin(phase)
    return R(4 + 36 * amp * s), R(9 * amp * math.cos(phase))

def action_fcurves(act):
    if hasattr(act, 'layers') and len(act.layers):          # Blender 4.4+ slotted actions
        out = []
        for layer in act.layers:
            for strip in layer.strips:
                for slot in act.slots:
                    cb = strip.channelbag(slot)
                    if cb: out.extend(cb.fcurves)
        return out
    return list(act.fcurves)

def bake(name, frames, fn, bones, loop=True):
    act = bpy.data.actions.new(name); act.use_fake_user = True
    arm.animation_data.action = act
    for f in range(frames + 1):
        t = f / frames
        pose_reset(); fn(t)
        for n in bones:
            b = pb[n]
            b.keyframe_insert('location', frame=f); b.keyframe_insert('rotation_euler', frame=f); b.keyframe_insert('scale', frame=f)
    for fc in action_fcurves(act):
        for k in fc.keyframe_points: k.interpolation = 'LINEAR'
    tr = arm.animation_data.nla_tracks.new(); tr.name = name
    tr.strips.new(name, 0, act); tr.mute = True
    arm.animation_data.action = None
    return act

def common(t, wing_cycles, amp=1.0, bob=0.035, bob_cycles=1, breathe=0.02):
    pb['Root'].location = (0, bob * math.sin(TAU * bob_cycles * t), 0)
    s = 1 + breathe * math.sin(TAU * 2 * t)
    pb['Body'].scale = (s, 1 + breathe * 0.6 * math.sin(TAU * 2 * t + 0.6), s)
    ph = TAU * wing_cycles * t
    z, y = flap(ph, amp)
    pb['Wing.L'].rotation_euler = (0, y, z); pb['Wing.R'].rotation_euler = (0, -y, -z)
    pb['Tail'].rotation_euler = (R(4) * math.sin(TAU * 2 * t + 1.0), 0, R(3) * math.sin(TAU * t))

def idle(t):
    common(t, 14)
    pb['Body'].rotation_euler = (R(2) * math.sin(TAU * t + 0.5), 0, R(1.5) * math.sin(TAU * t))
    pb['Head'].rotation_euler = (R(3) * math.sin(TAU * t + 1.2), R(5) * math.sin(TAU * t), R(2) * math.sin(TAU * t + 0.3))

def ease(x): x = max(0.0, min(1.0, x)); return x * x * (3 - 2 * x)

def curious(t):
    common(t, 14, bob=0.03)
    # tilt in, hold with a little second bob of interest, return so the loop is seamless
    k = ease(t / 0.22) * (1 - ease((t - 0.8) / 0.2))
    nudge = math.sin(TAU * 2 * t) * 0.15 * k
    pb['Body'].rotation_euler = (R(7) * k, 0, 0)
    pb['Head'].rotation_euler = (R(-6) * k, R(8) * k, R(20) * k * (1 + nudge))
    for s in ('L', 'R'): pb['Eye.' + s].rotation_euler = (R(-4) * k, R(10) * k, 0)

def thinking(t):
    common(t, 15, amp=0.75, bob=0.02)
    k = ease(t / 0.15) * (1 - ease((t - 0.85) / 0.15))
    pb['Head'].rotation_euler = (R(-12) * k + R(2) * math.sin(TAU * t), R(-10) * k, R(-9) * k)
    pb['Body'].rotation_euler = (R(-3) * k, 0, 0)
    # eyes glance up-left, then up-right, then back
    gx = R(-14) * k
    gy = (R(14) * ease((t - 0.15) / 0.08) - R(26) * ease((t - 0.5) / 0.08) + R(12) * ease((t - 0.78) / 0.07)) * (1 if t < 0.85 else (1 - ease((t - 0.85) / 0.15)))
    for s in ('L', 'R'): pb['Eye.' + s].rotation_euler = (gx, gy, 0)

def happy(t):
    common(t, 12, amp=1.25, bob=0.0)
    hop = abs(math.sin(TAU * t))  # two hops per loop
    pb['Root'].location = (0, 0.1 * hop, 0)
    pb['Body'].rotation_euler = (R(-4) * hop, 0, R(9) * math.sin(TAU * t))
    pb['Head'].rotation_euler = (R(-8) * hop, R(6) * math.sin(TAU * t + 0.6), R(-8) * math.sin(TAU * t))
    pb['Tail'].rotation_euler = (R(-18) * hop, 0, R(6) * math.sin(TAU * t))

def blink(t):
    c = math.sin(math.pi * t) ** 0.8
    for s in ('L', 'R'): pb['Lid.' + s].rotation_euler = (R(-180) * c, 0, 0)

bake('Idle', int(2.0 * FPS), idle, LOOP_BONES)
bake('Curious', int(2.0 * FPS), curious, LOOP_BONES)
bake('Thinking', int(3.0 * FPS), thinking, LOOP_BONES)
bake('Happy', int(1.5 * FPS), happy, LOOP_BONES)
bake('Blink', int(0.2 * FPS), blink, ['Lid.L', 'Lid.R'], loop=False)
pose_reset()

# ---------- 8. save + export ----------
blend_path = os.path.join(OUT, 'NEXORA_Hummingbird.blend')
bpy.ops.wm.save_as_mainfile(filepath=blend_path)
glb_path = os.path.join(OUT, 'hummingbird.glb')
bpy.ops.export_scene.gltf(
    filepath=glb_path, export_format='GLB', export_yup=True,
    export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=False,
    export_optimize_animation_size=False, export_reset_pose_bones=True, export_skins=True,
    export_def_bones=False, export_vertex_color='MATERIAL', export_all_vertex_colors=False,
    export_apply=False, export_morph=False, export_cameras=False, export_lights=False)
print('TRIS', sum(len(p.vertices) - 2 for p in me.polygons), 'VERTS', len(me.vertices))
print('SAVED', blend_path, os.path.getsize(blend_path)); print('EXPORTED', glb_path, os.path.getsize(glb_path))
