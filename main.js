import * as THREE from './three/build/three.module.js';
import Stats from './three/examples/jsm/libs/stats.module.js';
import { GLTFLoader } from './three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from './three/examples/jsm/controls/OrbitControls.js';
import { DDSLoader } from './three/examples/jsm/loaders/DDSLoader.js';
import { RGBELoader } from './three/examples/jsm/loaders/RGBELoader.js';

import { EffectComposer } from './three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from './three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from './three/examples/jsm/postprocessing/ShaderPass.js';

import { pbrmaterial_fs, pbrmaterial_vs, postFX_fs, postFX_vs } from './modules/shaders.js'; // glsl shaders
import * as DATA from './modules/data.js'; // main data structure
import * as UI from './modules/ui.js'; // ui-overlay templates

// application & ui-overlay dom elements
const webgl_canvas = document.getElementById("webgl-canvas");
const webgl_overlay = document.getElementById("webgl-overlay");

// general scene & camera
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, 1, 50.0, 5000 ); // this is set in resizeCanvasToDisplaySize

const renderer = new THREE.WebGLRenderer({
    antialias: true,
});
webgl_canvas.appendChild( renderer.domElement ); // add renderer to dom
const canvas = renderer.domElement;

// setup renderer
const composer = new EffectComposer( renderer );
composer.addPass( new RenderPass( scene, camera ) );

// add postFX pass
const postFXPass = new ShaderPass({
    vertexShader: postFX_vs,
    fragmentShader: postFX_fs,
    uniforms: {
        'tDiffuse': { value: null },
        'exposure': { value: 0.1 }, // use values >= 0.0
        'colorFilter': { value: new THREE.Vector3(1.0,1.0,1.0) } // set to neutral color filter
    }
});
postFXPass.renderToScreen = true;
composer.addPass( postFXPass );


// stats setup
const stats_enable = false;
const stats = Stats();

// orbitcontrols
const controls = new OrbitControls( camera, renderer.domElement );
// controls.enablePan = false;
// controls.enableRotate = false;
// controls.enableDamping = true;
// controls.maxDistance = 2300;
// controls.minDistance = 430;


// scene illumination
const environment_str = 0.70; // environment light strenght
const occlusion_str = 1.0; // ambient occlusion strenght
const fill_str = 0.4;
const key_str = 0.55;

const key_color = new THREE.Color("rgb(255,249,230)");
const fill_color = new THREE.Color("rgb(255,250,240)");

const fill1 = new THREE.PointLight(
    fill_color,
    fill_str,
    550,
    1
);

const fill2 = new THREE.PointLight(
    fill_color,
    fill_str,
    550,
    1
);

const key = new THREE.PointLight(
    key_color,
    key_str,
    1000,
    1
);

key.position.set( 0, 500, 300 );
fill1.position.set( 380, -450, 70 );
fill2.position.set( -380, -450, 70 );

scene.add(fill1);
scene.add(fill2);
scene.add(key);

// const sphereSize = 10;
// const pointLightHelper1 = new THREE.PointLightHelper( fill1, sphereSize, 0x000000 );
// scene.add( pointLightHelper1 );

// const pointLightHelper2 = new THREE.PointLightHelper( fill2, sphereSize, 0x000000 );
// scene.add( pointLightHelper2 );

// const pointLightHelper3 = new THREE.PointLightHelper( key, sphereSize, 0x000000 );
// scene.add( pointLightHelper3 );

camera.position.set( 0, 6, 880);
controls.update();

// const formats = {
//     astc: renderer.extensions.has( 'WEBGL_compressed_texture_astc' ),
//     etc1: renderer.extensions.has( 'WEBGL_compressed_texture_etc1' ),
//     s3tc: renderer.extensions.has( 'WEBGL_compressed_texture_s3tc' ),
//     pvrtc: renderer.extensions.has( 'WEBGL_compressed_texture_pvrtc' )
// };
// console.log(formats);


// load assets
// - - - TEXTURES
const mydata = DATA.data;
const manager = new THREE.LoadingManager();

const texture_loader = new THREE.TextureLoader( manager );
const model_loader = new GLTFLoader( manager );
const dds_loader = new DDSLoader( manager );
const img_loader = new RGBELoader( manager );

loadTextureSet( mydata, texture_loader, "2k" );

// - - - BRDF lut
img_loader.setDataType( THREE.FloatType );
const brdf_lut = img_loader.load( "./res/images/brdfLUT.hdr" );

// - - - ENVMAPS
const irr_map = dds_loader.load( "./res/images/cubemaps/studio_london/diffuse.dds" );
const rad_map = dds_loader.load( "./res/images/cubemaps/studio_london/specular.dds" );
const env_map = dds_loader.load( "./res/images/cubemaps/studio_london/environment.dds" );

// - - - MODELS
const default_material = {
    board: null,
    wheels: null,
    trucks: null,
    hardware: null,
}

const pivot = new THREE.Object3D();
let model;
const model_path = mydata.model.path + mydata.model.name;
model_loader.load( model_path, function ( gltf) {
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

// - - SETUP UI
let toggle_fullscreen = false;
buildOverlay( mydata );

manager.onLoad = () => {

    // add to scene
    model.position.x = 50.0;
    model.rotation.z = Math.PI / 180.0 * 90.0;
    pivot.add(model);
    scene.add(pivot);
    setMaterial( mydata, default_material );

    // add scene background, groundplane and re-orient model
    scene.background = new THREE.Color( 0xffffff );

    const gridHelper = new THREE.PolarGridHelper( 1000, 10 );
    gridHelper.position.y = -430.0;
    scene.add( gridHelper );

    model.rotation.z = Math.PI / 180.0 * 90.0;

    // remove loading animation
    const loadingScreen = document.getElementById( 'loading-screen' );
    loadingScreen.classList.add( 'fade-out' );
    
    // optional: remove loader from DOM via event listener
    loadingScreen.addEventListener( 'transitionend', onTransitionEnd );
}

animate();

function animate() {
    resizeCanvasToDisplaySize();
    requestAnimationFrame( animate );

    pivot.rotation.y += 0.007;

    stats.update();
    controls.update();
    composer.render();
}

function resizeCanvasToDisplaySize(force) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (force || canvas.width !== width ||canvas.height !== height) {
      // you must pass false here or three.js sadly fights the browser
      renderer.setSize(width, height, false);
      composer.setSize(width, height, false);
      
      

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
  
      // set render target sizes here
    }
  }

// remove element from dom
function onTransitionEnd( event ) {
	event.target.remove();
}


function buildOverlay( data ) {

    let overlay_buttons_content = "";
    let overlay_products_content = "";
    let button_list_content = "";


    // cycle through categories
    for ( const key in data.board_components ) {

        const category = data.board_components[key].category;
        const thumb_base = data.base_paths.thumbnails.path;

        // this is used to setup the default material
        let set_active = true;
        let product_list_content = "";

        // add close button
        const close_button = UI.close_button(
            {
                category: category,
                image_path: "./res/icons/close.svg",
            }
        );
        product_list_content += close_button;

        // cycle through products
        for( const key2 in data.board_components[key].value ) {

            const prod_data = {
                category: category,
                texture_path: `mydata.board_components.${key}.value[${key2}].textures`,
                image_path: thumb_base + data.board_components[key].value[key2].thumbnail.path,
                alt: data.board_components[key].value[key2].name,
                text: data.board_components[key].value[key2].name,
                selected: false,
            }

            if (set_active) {
                set_active = false;

                prod_data.selected = true;
                default_material[key] = data.board_components[key].value[key2].textures;
            }

            product_list_content += UI.product( prod_data );
        }

        overlay_products_content += UI.product_list( { category: category, content: product_list_content } );

        const btn_data = {
            category: category,
            image_path : data.board_components[key].icon,
            alt : data.board_components[key].table_name,
        };

        button_list_content += UI.button( btn_data );

    }

    overlay_buttons_content += UI.button_list( { id: "button-list", content: button_list_content } );
    let overlay_content = UI.overlay( { buttons: overlay_buttons_content, products: overlay_products_content });

    document.getElementById('webgl-overlay').innerHTML = overlay_content;

    //bind functions
    canvas.addEventListener('click', closeProductPanel);
    document.querySelectorAll('.close-button').forEach(item => {
        item.addEventListener('click', closeProductPanel);
    });

    document.querySelectorAll('.button').forEach(item => {
        item.addEventListener('click', openProductPanel);
    });

    document.querySelectorAll('.product').forEach(item => {
        item.addEventListener('click', loadMaterial);
    });
}

function closeProductPanel() {

    // hide every product panel
    document.querySelectorAll('.product-list').forEach(item => {
        item.setAttribute( "visible", false);
    });

    // deselect parent button
    document.querySelectorAll('.button').forEach(item => {
        item.setAttribute( "selected", false);
    });

}

function openProductPanel() {
    if ( this.getAttribute("selected") == "false" ) {

        closeProductPanel();

        this.setAttribute( "selected", true );
        const category = this.getAttribute("button-category");

        // get panel
        document.querySelector(`[product-category="${category}"]`).setAttribute( "visible", true );
    } else {

        this.setAttribute( "selected", false );
        closeProductPanel();

    }
}

function loadMaterial() {

    if ( this.getAttribute("selected") == "false" ) {

        const category = this.getAttribute("category");

        document.querySelectorAll(`[category="${category}"]`).forEach(item => {
            item.setAttribute( "selected", false);
        });

        const texture = eval(this.getAttribute("texture-path"));

        let rename = mydata.model_renames[category];

        let mesh = scene.getObjectByName( rename , true );

        mesh.material.uniforms.basecolorMap.value = texture.albedo;
        mesh.material.uniforms.roughnessMap.value = texture.roughness;
        mesh.material.uniforms.metalnessMap.value = texture.metalness;
        mesh.material.uniforms.normalMap.value = texture.normal;
        mesh.material.uniforms.aoMap.value = texture.occlusion;

        mesh.material.needsUpdate = true;

        this.setAttribute( "selected", true );

    }

}

function setMaterial( data, textures ) {

    // this is to avoid shared uniforms - merge from shaderutils is broken
    const materials = {
        board: new THREE.ShaderMaterial({
            vertexShader: pbrmaterial_vs,
            fragmentShader: pbrmaterial_fs,
            lights: true,
            extensions: {
                shaderTextureLOD: true, // set to use shader texture LOD - This is to support safari desktop
            },
        }),
        wheels: new THREE.ShaderMaterial({
            vertexShader: pbrmaterial_vs,
            fragmentShader: pbrmaterial_fs,
            lights: true,
            extensions: {
                shaderTextureLOD: true, // set to use shader texture LOD - This is to support safari desktop
            },
        }),
        trucks: new THREE.ShaderMaterial({
            vertexShader: pbrmaterial_vs,
            fragmentShader: pbrmaterial_fs,
            lights: true,
            extensions: {
                shaderTextureLOD: true, // set to use shader texture LOD - This is to support safari desktop
            },
        }),
        hardware: new THREE.ShaderMaterial({
            vertexShader: pbrmaterial_vs,
            fragmentShader: pbrmaterial_fs,
            lights: true,
            extensions: {
                shaderTextureLOD: true, // set to use shader texture LOD - This is to support safari desktop
            },
        }),
    };

    const a = THREE.UniformsLib['lights'];
    const b = {
        basecolorMap : { type: "t", value: null },
        roughnessMap : { type: "t", value: null },
        metalnessMap : { type: "t", value: null },
        normalMap : { type: "t", value: null },
        aoMap : { type: "t", value: null },
        aoStr : { type: "1f", value: occlusion_str },
        irrMap : { type: "t", value: null },
        radMap : { type: "t", value: null },
        envMap : { type: "t", value: null },
        brdfLUT : { type: "t", value: null },
        envStr : { type: "1f", value: environment_str },
    };

    // setup uniforms
    for ( let [key, value] of Object.entries(textures) ) {

        let rename = data.model_renames[key];
        let mesh = scene.getObjectByName( rename , true );

        materials[key].uniforms = THREE.UniformsUtils.merge( [a ,b] );
        materials[key].uniforms.basecolorMap.value = textures[key].albedo;
        materials[key].uniforms.roughnessMap.value = textures[key].roughness;
        materials[key].uniforms.metalnessMap.value = textures[key].metalness;
        materials[key].uniforms.normalMap.value = textures[key].normal;
        materials[key].uniforms.aoMap.value = textures[key].occlusion;
        materials[key].uniforms.irrMap.value = irr_map;
        materials[key].uniforms.radMap.value = rad_map;
        materials[key].uniforms.envMap.value = env_map;
        materials[key].uniforms.brdfLUT.value = brdf_lut;

        mesh.material = materials[key];
        mesh.material.needsUpdate = true;
        mesh.geometry.computeTangents();

    }
}

function loadTextureSet( data, manager, type ) {
    const basepath = data.base_paths.textures[type];

    for ( const key in data.board_components ) {
        for ( const inner in data.board_components[key].value ){
            const textures = JSON.parse(JSON.stringify(data.texture_sets.base_names));

            const local_path = data.board_components[key].value[inner].texture_set.path;
            const complete_path = basepath + local_path;

            for ( let [key, value] of Object.entries(textures) ) {
                const txt = loadTexture( manager, (complete_path + value ));
                textures[key] = txt;
            }

            data.board_components[key].value[inner].textures = textures;
        }
    }
    
}

function loadTexture( manager, path ) {

    const text = manager.load( path );
    text.flipY = false;

    return text;
}

// toggle stats
document.addEventListener('keydown', (e) => {
    if (e.code === "KeyS") {
        enableStats();
    }
});

function enableStats() {
    if(!stats_enable) {
        webgl_canvas.appendChild( stats.domElement );
    }
}