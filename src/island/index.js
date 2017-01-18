import async from 'async';
import THREE from 'three';
import {map, each, assign} from 'lodash';

import {loadHqrAsync} from '../hqr';
import {prepareGeometries} from './geometries';
import {loadLayout} from './layout';
import {loadGround} from './ground';
import {loadSea} from './sea';
import {loadObjects} from './objects';
import {loadIslandPhysics} from './physics';

import islandsInfo from './data/islands';
import environments from './data/environments';

const islandProps = {};
each(islandsInfo, island => {
    islandProps[island.name] = assign({
        envInfo: environments[island.env]
    }, island);
});

const islands = {};

export function loadIslandScenery(name, callback) {
    if (name in islands) {
        callback(null, islands[name]);
    }
    else {
        async.auto({
            ress: loadHqrAsync('RESS.HQR'),
            ile: loadHqrAsync(`${name}.ILE`),
            obl: loadHqrAsync(`${name}.OBL`)
        }, function(err, files) {
            const island = loadIslandNode(islandProps[name], files);
            islands[name] = island;
            callback(null, island);
        });
    }

}

function loadIslandNode(props, files) {
    const islandObject = new THREE.Object3D();
    const layout = loadLayout(files.ile);
    const data = {
        files: files,
        palette: new Uint8Array(files.ress.getEntry(0)),
        layout: layout
    };

    const geometries = loadGeometries(props, data);
    each(geometries, ({positions, uvs, colorInfos, normals, uvGroups, material}, name) => {
        if (positions && positions.length > 0) {
            const bufferGeometry = new THREE.BufferGeometry();
            bufferGeometry.addAttribute('position', new THREE.BufferAttribute(new Float32Array(positions), 3));
            if (uvs) {
                bufferGeometry.addAttribute('uv', new THREE.BufferAttribute(new Uint8Array(uvs), 2, true));
            }
            if (colorInfos) {
                bufferGeometry.addAttribute('colorInfo', new THREE.BufferAttribute(new Uint8Array(colorInfos), 2, false));
            }
            if (normals) {
                bufferGeometry.addAttribute('normal', new THREE.BufferAttribute(new Float32Array(normals), 3));
            }
            if (uvGroups) {
                bufferGeometry.addAttribute('uvGroup', new THREE.BufferAttribute(new Uint8Array(uvGroups), 4, true));
            }
            const mesh = new THREE.Mesh(bufferGeometry, material);
            mesh.name = name;
            islandObject.add(mesh);
        }
    });

    islandObject.add(loadSky(geometries));

    const seaTimeUniform = islandObject.getObjectByName('sea').material.uniforms.time;

    return {
        props: props,
        sections: map(layout.groundSections, section => ({x: section.x, z: section.z})),
        threeObject: islandObject,
        physics: loadIslandPhysics(layout),
        update: time => { seaTimeUniform.value = time.elapsed; }
    };
}

function loadSky(geometries) {
    const sky = new THREE.Mesh(new THREE.PlaneGeometry(128, 128, 1, 1), geometries.sky.material);
    sky.rotateX(Math.PI / 2.0);
    sky.position.y = 2.0;
    return sky;
}

function loadGeometries(island, data) {
    const geometries = prepareGeometries(island, data);
    const usedTiles = {};
    const objects = [];

    each(data.layout.groundSections, section => {
        const tilesKey = [section.x, section.z].join(',');
        usedTiles[tilesKey] = [];
        loadGround(section, geometries, usedTiles[tilesKey]);
        loadObjects(data, section, geometries, objects);
    });

    each(data.layout.seaSections, section => {
        const xd = Math.floor(section.x / 2);
        const zd = Math.floor(section.z / 2);
        const offsetX = 1 - Math.abs(section.x % 2);
        const offsetZ = Math.abs(section.z % 2);
        const tilesKey = [xd, zd].join(',');
        loadSea(section, geometries, usedTiles[tilesKey], offsetX, offsetZ, island.envInfo.index);
    });

    return geometries;
}
