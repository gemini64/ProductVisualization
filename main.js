import * as THREE from './three/build/three.module.js';
import Stats from './three/examples/jsm/libs/stats.module.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
//import { HDRCubeTextureLoader } from './three/examples/jsm/loaders/HDRCubeTextureLoader.js';
import { LightProbeGenerator } from './three/examples/jsm/lights/LightProbeGenerator.js';

import { pbrmaterial_fs, pbrmaterial_vs } from './modules/shaders.js';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, 2000 );

const renderer = new THREE.WebGLRenderer({
    antialias: true });
document.body.appendChild( renderer.domElement ); // add renderer to dom
renderer.setSize( window.innerWidth, window.innerHeight ); // set resolution

// stats setup
const stats = Stats();
document.body.appendChild( stats.domElement );

// orbitcontrols
const controls = new OrbitControls( camera, renderer.domElement );

// scene setup - lights - direct
const pivot = new THREE.Object3D();
const light1 = new THREE.PointLight(
    new THREE.Vector3(1.0,1.0,1.0),
    0,
    550,
    1
);
light1.position.set( -200, 0, 0 );

const light2 = new THREE.PointLight(
    new THREE.Vector3(1.0,1.0,1.0),
    0,
    550,
    1
);
light2.position.set( 0, -200, 0 );
pivot.add(light1);
pivot.add(light2);
scene.add(pivot);

camera.position.set(0,0,500.0);
controls.update();


// load assets
// - - - TEXTURES
const paths = {
    base: "./res/models/sculpture/textures/scene_defaultMat_BaseColor.png",
    rough: "./res/models/sculpture/textures/scene_defaultMat_Roughness.png",
    metal: "./res/models/sculpture/textures/scene_defaultMat_Metallic.png",
    normal: "./res/models/sculpture/textures/scene_defaultMat_Normal.png",
    ao: "./res/models/sculpture/textures/scene_defaultMat_AmbientOcclusion.png"
};

const manager = new THREE.LoadingManager();
const texture_loader = new THREE.TextureLoader( manager );
const model_loader = new GLTFLoader( manager );
const cubemap_loader = new THREE.CubeTextureLoader( manager );

const base_texture = texture_loader.load( paths.base );
const rough_texture = texture_loader.load( paths.rough );
const metal_texture = texture_loader.load( paths.metal );
const normal_texture = texture_loader.load( paths.normal );
const ao_texture = texture_loader.load( paths.ao );

base_texture.encoding = THREE.sRGBEncoding;
base_texture.flipY = false;
rough_texture.flipY = false;
metal_texture.flipY = false;
normal_texture.flipY = false;
ao_texture.flipY = false;

// - - - ENVMAP
const cube_paths = [ 'px.png', 'nx.png', 'py.png', 'ny.png', 'pz.png', 'nz.png' ];
cubemap_loader.setPath( './res/images/cubemap/' );

let irr_map;
const env_map = cubemap_loader.load( cube_paths, function () {

    env_map.generateMipmaps = true;
    env_map.magFilter = THREE.LinearFilter;
    env_map.minFilter = THREE.LinearMipMapLinearFilter;
    env_map.needsUpdate = true;
    env_map.encoding = THREE.sRGBEncoding;
    scene.background = env_map;

    // generate PMREM filtered envmap
    // const pmrem_gen = new THREE.PMREMGenerator( renderer );
    // pmrem_gen.compileCubemapShader();

    // let spec_map_target = pmrem_gen.fromCubemap( env_map );
    // spec_map = spec_map_target.texture;
    // spec_map.encoding = THREE.RGBEEncoding;

    // pmrem_gen.dispose();

    // generate irradiance map
    const irr_target = new THREE.LightProbe().copy( LightProbeGenerator.fromCubeTexture( env_map ) );
    console.log(irr_target);
    
});


// - - - MODELS
let model;
model_loader.load( './res/models/sculpture/statue.gltf', function ( gltf) {
        model = gltf.scene;
    },
    function ( xhr ) {

        console.log( ( xhr.loaded / xhr.total * 100 ) + '% loaded' );

    },
    // called when loading has errors
    function ( error ) {

        console.log( 'An error happened' );

    }
);

manager.onLoad = () => {

    // setup uniforms
    const a = THREE.UniformsLib['lights'];
    const b = {
        basecolorMap: { type: "t", value: base_texture },
        roughnessMap: { type: "t", value: rough_texture },
        metalnessMap: { type: "t", value: metal_texture },
        normalMap: { type: "t", value: normal_texture },
        aoMap : { type: "t", value: ao_texture },
        envStr: { type: "1f", value: 1.0 },
        envMap : { type: "t", value: env_map },
    };
    const uniforms = Object.assign( a, b );
    console.log(uniforms);

    const shader_material = new THREE.ShaderMaterial({
        vertexShader: pbrmaterial_vs,
        fragmentShader: pbrmaterial_fs,
        uniforms: uniforms,
        lights: true,
    });

    shader_material.needsUpdate = true;


    // set model-material and compute tangents
    model.traverse((o) => {
        if (o.isMesh) {
            o.material = shader_material;
            o.geometry.computeTangents();
        }
    });

    // add to scene
    scene.add(model);
}

function animate() {
    requestAnimationFrame( animate );

    pivot.rotation.y += 0.01;
    pivot.rotation.z += 0.01;

    stats.update();
    controls.update();
    renderer.render( scene, camera );
}

animate();