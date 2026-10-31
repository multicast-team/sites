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
//
// SDF (with blur) fragment shader
//
varying vec2 v_vTexcoord;
varying vec4 v_vColour;

// SDF values are measured from 0 (at the outer edge) to 1 which is the innermost point that can be represented
uniform vec2 gm_SDF_Blur_MinMax;			// the range across which to filter the SDF
uniform vec4 gm_SDF_Blur_Col;				// the colour tint of the blurred text

void main()
{
	vec4 texcol = texture2D( gm_BaseTexture, v_vTexcoord );	
	vec4 currcol = gm_SDF_Blur_Col;
		
	currcol.a *= smoothstep(gm_SDF_Blur_MinMax.x, gm_SDF_Blur_MinMax.y, texcol.a);		
	
	vec4 combinedcol = v_vColour * currcol;
	DoAlphaTest(combinedcol);	

    gl_FragColor = combinedcol;
}
