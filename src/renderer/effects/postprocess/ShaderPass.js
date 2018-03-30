/**
 * @author alteredq / http://alteredqualia.com/
 */

import * as THREE from 'three';
import Pass from './Pass';

export default function ShaderPass(shader, textureID) {
    Pass.call(this);

    this.textureID = (textureID !== undefined) ? textureID : 'tDiffuse';

    if (shader instanceof THREE.ShaderMaterial) {
        this.uniforms = shader.uniforms;

        this.material = shader;
    } else if (shader) {
        this.uniforms = THREE.UniformsUtils.clone(shader.uniforms);

        this.material = new THREE.ShaderMaterial({

            defines: shader.defines || {},
            uniforms: this.uniforms,
            vertexShader: shader.vertexShader,
            fragmentShader: shader.fragmentShader

        });
    }

    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();

    this.quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
    this.scene.add(this.quad);
}

ShaderPass.prototype = Object.create(Pass.prototype);

ShaderPass.prototype = {

    constructor: ShaderPass,

    render(renderer, writeBuffer, readBuffer) {
        if (this.uniforms[this.textureID]) {
            this.uniforms[this.textureID].value = readBuffer;
        }

        this.quad.material = this.material;

        if (this.renderToScreen) {
            renderer.render(this.scene, this.camera);
        } else {
            renderer.render(this.scene, this.camera, writeBuffer, this.clear);
        }
    }

};
