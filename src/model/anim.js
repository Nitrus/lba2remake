import THREE from 'three';
import _ from 'lodash';

const push = Array.prototype.push;

export function loadAnim(model, anims, index) {
    if (anims[index]) {
        return anims[index];
    } else {
        const buffer = model.files.anim.getEntry(index);
        const data = new DataView(buffer);
        const obj = {
            numKeyframes: data.getUint16(0x00, true),
            numBoneframes: data.getUint16(0x02, true),
            loopFrame: data.getUint16(0x04, true),
            unk1: data.getUint16(0x08, true),
            
            buffer: buffer
        };

        loadKeyframes(obj);
        
        anims[index] = obj;
        return obj;
    }
}

function loadKeyframes(object) {
    object.keyframes = [];
    const data = new DataView(object.buffer, 0, object.buffer.length);
    let offset = 8;
    for (let i = 0; i < object.numKeyframes; ++i) {
        let keyframe = {
            length: data.getUint16(offset, true),
            x: data.getInt16(offset + 2, true) / 0x4000,
            y: data.getInt16(offset + 4, true) / 0x4000,
            z: data.getInt16(offset + 6, true) / 0x4000,
            canFall: false,
            boneframes: []
        };
        offset += 8;

        for (let j = 0; j < object.numBoneframes; ++j) {
            const {boneframe, canFall} = loadBoneframe(keyframe, data, offset);
            keyframe.canFall |= canFall;
            offset += 8;
            keyframe.boneframes.push(boneframe);
        }

        object.keyframes.push(keyframe);
    }
}

function loadBoneframe(keyframe, data, offset) {
    let boneframe = {
        type: data.getUint16(offset, true), // if > 0 canFall because it has translation in space
        veuler: null,
        pos: null
    };
    let canFall = false;

    const x = data.getInt16(offset + 2, true);
    const y = data.getInt16(offset + 4, true);
    const z = data.getInt16(offset + 6, true);

    // assigned based on type of bone animation (rotation or translation)
    if (boneframe.type == 0) { // rotation
        boneframe.pos = new THREE.Vector3(0, 0, 0);
        boneframe.veuler = new THREE.Vector3(x, y, z);
    } else { // translation
        boneframe.veuler = new THREE.Vector3(0, 0, 0);
        boneframe.pos = new THREE.Vector3(x / 0x4000, y / 0x4000, z / 0x4000);
        canFall = true;
    }
    return { boneframe, canFall };
}