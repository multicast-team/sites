precision mediump float;
#define LOWPREC lowp
// Uniforms look like they're shared between vertex and fragment shaders in GLSL, so we have to be careful to avoid name clashes

uniform sampler2D gm_BaseTexture;

uniform bool gm_PS_FogEnabled;
uniform vec4 gm_FogColour;
uniform bool gm_AlphaTestEnabled;
uniform float gm_AlphaRefValue;

void DoAlphaTest(vec4 SrcColour)
{
	if (gm_AlphaTestEnabled)
	{
		if (SrcColour.a <= gm_AlphaRefValue)
		{
			discard;
		}
	}
}

void DoFog(inout vec4 SrcColour, float fogval)
{
	if (gm_PS_FogEnabled)
	{
		SrcColour = mix(SrcColour, gm_FogColour, clamp(fogval, 0.0, 1.0)); 
	}
}

#define _YY_GLSLES_ 1
varying float v_fAlpha;
varying vec2  v_vTexcoord;

uniform vec4 u_vColorSoftness;

void main()
{
    float sdfDistance = texture2D(gm_BaseTexture, v_vTexcoord).a;
    float range = max(fwidth(sdfDistance), 0.001) / sqrt(2.0);
    float alpha = smoothstep(0.5 - u_vColorSoftness.a, 0.5 + u_vColorSoftness.a, sdfDistance);
    gl_FragColor = vec4(u_vColorSoftness.rgb, alpha*v_fAlpha);
}
