// this is a complete PBR texture based shader set
/*
    - it is based on a metalness/roughness workflow
    - it computes per-fragment normals at shading time (T in Application Stage)
    - calculates direct and indirect lightning separately
*/
export const pbrmaterial_vs = `
    attribute vec4 tangent;
    varying vec3 vNormal;
    varying vec3 vPosition;
    varying vec2 vUv;
    varying vec3 vTangent;
    varying vec3 vBitangent;
    
    void main() {
        vec4 vPos = modelViewMatrix * vec4( position, 1.0 );
        vPosition = vPos.xyz;
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
    uniform samplerCube irrMap;
    uniform samplerCube radMap;
    uniform float envStr;

    // directions
    varying vec3 vPosition;
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
    float pow2( const in float x ) {
        return x*x;
    }

    float GGXRoughnessToBlinnExponent( const in float roughness ) {
        return ( 2.0 / pow2( roughness + 0.0001 ) - 2.0 );
    }

    vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {
        return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );
    }

    float getSpecularMIPLevel( const in float blinnShininessExponent, const in int maxMIPLevel ) {
        float maxMIPLevelScalar = float( maxMIPLevel );
        float desiredMIPLevel = maxMIPLevelScalar + 0.79248 - 0.5 * log2( pow2( blinnShininessExponent ) + 1.0 );
        return clamp( desiredMIPLevel, 0.0, maxMIPLevelScalar );
    }

    vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float blinnShininessExponent, const in int maxMIPLevel, const in samplerCube envMap ) {
        vec3 reflectVec = reflect( -viewDir, normal );
        reflectVec = inverseTransformDirection( reflectVec, viewMatrix );
        float specularMIPLevel = getSpecularMIPLevel( blinnShininessExponent, maxMIPLevel );

        vec3 queryReflectVec = vec3( -1.0 * reflectVec.x, reflectVec.yz );
        vec4 envMapColor = textureCubeLodEXT( envMap, queryReflectVec, specularMIPLevel );
        //envMapColor = RGBEToLinear(envMapColor);

        return envMapColor.rgb;
    }

    vec3 getIBLIrradiance( const in vec3 normal, const in samplerCube envMap ) {
        vec3 worldNormal = inverseTransformDirection( normal, viewMatrix );
        vec3 queryVec = vec3( -1.0 * worldNormal.x, worldNormal.yz );
        vec4 envMapColor = textureCube( envMap, queryVec);
        //envMapColor = RGBEToLinear(envMapColor);

        return envMapColor.rgb;
    }

    vec3 BRDF_Specular_GGX_Environment( vec3 normal, vec3 viewDir, const in vec3 cspec, const in float roughness ) { 
        float dotNV = clamp( dot( normal, viewDir ), 0.0, 1.0);
        const vec4 c0 = vec4( - 1, - 0.0275, - 0.572, 0.022 ); 
        const vec4 c1 = vec4( 1, 0.0425, 1.04, - 0.04 ); 
        vec4 r = roughness * c0 + c1; 
        float a004 = min( r.x * r.x, exp2( - 9.28 * dotNV ) ) * r.x + r.y; 
        vec2 AB = vec2( -1.04, 1.04 ) * a004 + r.zw;
        return cspec * AB.x + AB.y;
    }

    void main() {
        vec3 directLightning = vec3(0.0);
        vec3 indirectLightning = vec3(0.0);

        // set up per-fragment normal
        vec3 normal = normalize( vNormal );
        vec3 tangent = normalize( vTangent );
        vec3 bitangent = normalize( vBitangent );

        // convert normal from tangent space to camera space
        mat3 vTBN = mat3( tangent, bitangent, normal );
        vec3 mapN = texture2D( normalMap, vUv ).xyz * 2.0 - 1.0;
        vec3 n = normalize( vTBN * mapN );

        // get normal in world space
        vec3 worldN = inverseTransformDirection( n, viewMatrix );

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

        // - - - - Direct Lightning
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

            directLightning = directLightning + ( PI * (clight * attenuation) * nDotl * (specularTerm + diffuseTerm));
        }

        // - - - - Indirect Lightning
        vec3 ambientIrradiance = getIBLIrradiance( n, irrMap );
        
        vec3 indirectIrradiance = vec3(0.0);
        indirectIrradiance = indirectIrradiance + cdiff * ambientIrradiance;

        vec3 ambientRadiance = getIBLRadiance( normalize( vPosition ), n, GGXRoughnessToBlinnExponent( roughness ), 9, radMap );
        
        vec3 indirectRadiance = vec3(0.0);
        indirectRadiance = indirectRadiance + ambientRadiance * BRDF_Specular_GGX_Environment( n, v, cspec, roughness );
        
        indirectLightning = indirectLightning + indirectIrradiance + indirectRadiance;

        vec3 outRadiance = directLightning + indirectLightning * (occlusion * aoStr) * envStr;

        // out value is gamma encoded
        GammaEncode( outRadiance, GAMMA );
        gl_FragColor = vec4(outRadiance, 1.0);

    }
`;