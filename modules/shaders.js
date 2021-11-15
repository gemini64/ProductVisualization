// this is a complete PBR texture based shader set
/*
    - it is based on a metalness/roughness workflow
    - it computes per-fragment normals at shading time (T in Application Stage)
    - uses pre-filtered (BRDF pre-convolved) environment maps

    Notes: this uses the UE4 ibl approach (see: https://www.gamedevs.org/uploads/real-shading-in-unreal-engine-4.pdf)
    so split sum approximation and GGX (using pre-filtered maps and a BRDF look-up table)

    See also PowerVR's demo (https://github.com/powervr-graphics/Native_SDK/tree/master/examples/OpenGLES/ImageBasedLighting)
*/
export const pbrmaterial_vs = `
    attribute vec4 tangent;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec3 wPosition;
    varying vec2 vUv;
    varying vec3 vTangent;
    varying vec3 vBitangent;
    
    void main() {
        vec4 vPos = modelViewMatrix * vec4( position, 1.0 );
        vPosition = vPos.xyz;
        wPosition = (modelMatrix * vec4( position, 1.0 )).xyz;
        vUv = uv;

        vNormal = normalize( normalMatrix * normal );

        vec3 objectTangent = vec3( tangent.xyz );
        vec3 transformedTangent = normalMatrix * objectTangent;
        vTangent = normalize( transformedTangent );
        vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );

        gl_Position = projectionMatrix * vPos;
    }
`;

export const pbrmaterial_fs = `
    #if NUM_POINT_LIGHTS > 0
        struct PointLight {
            vec3 color;
            vec3 position;
            float decay;
            float distance;
        };
        uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
    #endif

    // texture maps
    uniform sampler2D basecolorMap;
    uniform sampler2D metalnessMap;
    uniform sampler2D roughnessMap;
    uniform sampler2D normalMap;
    uniform float aoStr;
    uniform sampler2D aoMap;
    uniform sampler2D brdfLUT;
    uniform samplerCube irrMap;
    uniform samplerCube radMap;
    uniform samplerCube envMap;
    uniform float envStr;

    // directions
    varying vec3 vPosition;
    varying vec3 wPosition;
    varying vec2 vUv;
    varying vec3 vTangent;
    varying vec3 vBitangent;
    varying vec3 vNormal;

    const float PI = 3.14159;
    const float GAMMA = 2.2;
    const float CSPEC_DIELECTRICS = 0.04;

    // Direct BRDF helpers
    vec3 FSchlick(vec3 cspec, float dotProd) {
        return (cspec + (vec3(1.0) - cspec) * pow( (1.0 - dotProd) , 5.0 ));
    }

    float GGX( float alpha, float dotProd ) {
        float alpha2 = alpha * alpha;
        return ( alpha2 / ( PI * pow( (pow( dotProd, 2.0) * ( alpha2 - 1.0 ) + 1.0 ) , 2.0)));
    }

    float G1( float dotProd, float k ) {
        return ( dotProd / ( dotProd * (1.0 - k) + k ) );
    }

    // Gamma conversion
    void GammaDecode( inout vec3 source, float gamma ) {
        source = pow( source, vec3(gamma) );
    }

    void GammaEncode( inout vec3 source, float gamma ) {
        source = pow( source , vec3(1.0/gamma) );
    }

    // IBL Helpers
    vec2 IntegrateBRDF( vec3 N, vec3 V, float roughness, const in sampler2D brdfLUT)  {
        return texture2D( brdfLUT, vec2( clamp( dot(N, V), 0.0, 1.0), roughness ) ).xy;
    }
    
    vec3 getIBLDiff( vec3 N, const in samplerCube irrMap) {
        return textureCube( irrMap, N ).rgb;
    }

    vec3 getIBLSpec( vec3 R, const in samplerCube radMap, const in samplerCube envMap, float roughness, float maxmip ) {

        float cutoff = 1.0 / maxmip;

        if(roughness <= cutoff)
        {
            float lod = roughness * maxmip;
            return mix( textureCubeLodEXT(envMap, R, 0.).rgb, textureCubeLodEXT(radMap, R, 0.).rgb, lod);
        }
        else
        {
            float lod = (roughness - cutoff) * maxmip / (1. - cutoff); // Remap to 0..1 on rest of mip maps
            return textureCubeLodEXT(radMap, R, lod).rgb;
        }
    }

    vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
        return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
    }

    vec3 f_schlickR(float cosTheta, vec3 F0, float roughness)
    {
        return F0 + (max(vec3(1.0 - roughness), F0) - F0) * pow(1.0 - cosTheta, 5.0);
    }

    void main() {
        vec3 directLighting = vec3(0.0);
        vec3 iblLighting = vec3(0.0);

        // set up per-fragment normal
        vec3 normal = normalize( vNormal );
        vec3 tangent = normalize( vTangent );
        vec3 bitangent = normalize( vBitangent );

        // convert normal from tangent space to camera space
        mat3 vTBN = mat3( tangent, bitangent, normal );
        vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
        vec3 n = normalize( vTBN * mapN );

        // read per-fragment roughness
        float roughness = texture2D( roughnessMap, vUv.xy ).x;
        float alpha = roughness * roughness;

        // read per-fragment metalness
        float metallic = texture2D( metalnessMap, vUv ).x;

        // read per-fragment ao
        float occlusion = texture2D( aoMap, vUv ).x;

        // set per-fragment specular and diffuse
        vec3 baseColor = texture2D( basecolorMap, vUv ).xyz;
        GammaDecode( baseColor, GAMMA ); // linearize color value

        vec3 cdiff = baseColor * (1.0 - metallic);
        vec3 cspec = baseColor * metallic + vec3(CSPEC_DIELECTRICS) * (1.0 - metallic);

        // get view direction
        vec3 v = normalize( -vPosition );
        float nDotv = max(0.000001, dot(n,v));

        // - - - - Direct Lighting
        for ( int i=0; i < NUM_POINT_LIGHTS; i++ ) {
            // light position passed as uniform is already in camera space
            vec4 lPosition = vec4(pointLights[i].position, 1.0);
            vec3 l = normalize( lPosition.xyz - vPosition.xyz );
            vec3 h = normalize( v + l );

            float nDotl = max(0.000001, dot(n,l));
            float nDoth = max(0.000001, dot(n,h));
            float lDoth = max(0.000001, dot(l,h));
            float lDotv = max(0.000001, dot(l,v));

            vec3 clight = pointLights[i].color; // this is already pre-multiplied with strength

            // set attenuation based on distance
            float radius = pointLights[i].distance;
            float distance = distance( lPosition.xyz, vPosition.xyz );
            // float decay = pointLights[i].decay;
            float attenuation = clamp(1.0 - distance/radius, 0.0, 1.0);

            float GSmith = G1(nDotl, alpha) * G1(nDotv, alpha);
            vec3 fTerm = FSchlick(cspec, lDoth);

            vec3 specularTerm = ( fTerm * GSmith * GGX(alpha, nDoth) ) / ( 4.0 * nDotl * nDotv );
            vec3 diffuseTerm = (vec3(1.0) - fTerm) * (cdiff / PI);

            directLighting = directLighting + ( PI * (clight * attenuation) * nDotl * (specularTerm + diffuseTerm));
        }

        // - - - - IBL Lighting
        // setup queryvectors - supplied in worldspace
        vec3 worldN = inverseTransformDirection( n, viewMatrix );
        vec3 worldV = cameraPosition - wPosition ;
        vec3 worldR = normalize( reflect(-worldV,worldN));

        vec3 iblDiff = getIBLDiff( vec3(-worldN.x,worldN.yz), irrMap );
        vec3 iblSpec = getIBLSpec( vec3(-worldR.x,worldR.yz), radMap, envMap, roughness, 9.0 );

        vec2 brdf = IntegrateBRDF( n, v, roughness, brdfLUT);

        vec3 F = f_schlickR(max(dot(n, v), 0.0), cspec, roughness);
        vec3 kD = vec3(1.0 - F) * (1.0 - metallic); // Diffuse factor, this is probably for energy conservation
        
        iblLighting = iblLighting + (kD * cdiff * iblDiff + iblSpec * (F * brdf.x + brdf.y));

        vec3 outRadiance = directLighting + iblLighting * (occlusion * aoStr) * envStr;
        //vec3 outRadiance = directLighting;
        //vec3 outRadiance = iblLighting * (occlusion * aoStr) * envStr;

        // out value is gamma encoded
        gl_FragColor = vec4(outRadiance, 1.0);

    }
`;


/*
    A simple Color Grading + Customizable exposure shader

    Uses Uchimura tonemapping (from Gran Turismo sport)
    - the paper is in japanese (https://www.slideshare.net/nikuque/hdr-theory-and-practicce-jp)
*/
export const postFX_vs = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
    }
`;

export const postFX_fs = `
    uniform sampler2D tDiffuse;
    uniform float exposure;
    varying vec2 vUv;
    const float GAMMA = 2.2;

    vec3 uchimura(vec3 x, float P, float a, float m, float l, float c, float b) {
        float l0 = ((P - m) * l) / a;
        float L0 = m - m / a;
        float L1 = m + (1.0 - m) / a;
        float S0 = m + l0;
        float S1 = m + a * l0;
        float C2 = (a * P) / (P - S1);
        float CP = -C2 / P;
      
        vec3 w0 = vec3(1.0 - smoothstep(0.0, m, x));
        vec3 w2 = vec3(step(m + l0, x));
        vec3 w1 = vec3(1.0 - w0 - w2);
      
        vec3 T = vec3(m * pow(x / m, vec3(c)) + b);
        vec3 S = vec3(P - (P - S1) * exp(CP * (x - S0)));
        vec3 L = vec3(m + a * (x - m));
      
        return T * w0 + L * w1 + S * w2;
    }
      
    vec3 uchimura(vec3 x) {
        const float P = 1.0;  // max display brightness
        const float a = 1.0;  // contrast
        const float m = 0.22; // linear section start
        const float l = 0.4;  // linear section length
        const float c = 1.33; // black
        const float b = 0.0;  // pedestal
      
        return uchimura(x, P, a, m, l, c, b);
    }
      
    float uchimura(float x, float P, float a, float m, float l, float c, float b) {
        float l0 = ((P - m) * l) / a;
        float L0 = m - m / a;
        float L1 = m + (1.0 - m) / a;
        float S0 = m + l0;
        float S1 = m + a * l0;
        float C2 = (a * P) / (P - S1);
        float CP = -C2 / P;
      
        float w0 = 1.0 - smoothstep(0.0, m, x);
        float w2 = step(m + l0, x);
        float w1 = 1.0 - w0 - w2;
      
        float T = m * pow(x / m, c) + b;
        float S = P - (P - S1) * exp(CP * (x - S0));
        float L = m + a * (x - m);
      
        return T * w0 + L * w1 + S * w2;
    }
      
    float uchimura(float x) {
        const float P = 1.0;  // max display brightness
        const float a = 1.0;  // contrast
        const float m = 0.22; // linear section start
        const float l = 0.4;  // linear section length
        const float c = 1.33; // black
        const float b = 0.0;  // pedestal
      
        return uchimura(x, P, a, m, l, c, b);
    }

    // exposure here is a float value
    void clampExposure( inout vec3 source, float exposure ) {
        source = clamp(exposure * source, 0., 1.);
    }

    void GammaEncode( inout vec3 source, float gamma ) {
        source = pow( source , vec3(1.0/gamma) );
    }

    void main() {
        vec4 texel = texture2D( tDiffuse, vUv );

        vec3 outColor = uchimura( texel.xyz );
        clampExposure( outColor, exposure );
        GammaEncode( outColor, GAMMA );

        gl_FragColor = vec4( outColor, 1.0 );
    }
`;