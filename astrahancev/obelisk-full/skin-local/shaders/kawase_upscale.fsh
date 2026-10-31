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
varying vec2 v_coord;

uniform vec4 texel;

void main()
{
	const vec2 z = vec2(0);
	const vec2 s = vec2(-1,1);
	const vec2 a = vec2(0,2);
    gl_FragColor = (texture2D(gm_BaseTexture, v_coord + texel.xy*s.xx)+
					texture2D(gm_BaseTexture, v_coord + texel.xy*s.yx)+
					texture2D(gm_BaseTexture, v_coord + texel.xy*s.xy)+
					texture2D(gm_BaseTexture, v_coord + texel.xy*s.yy))*(1./6.)+
				   (texture2D(gm_BaseTexture, v_coord + texel.xy*a.xy)+
					texture2D(gm_BaseTexture, v_coord - texel.xy*a.xy)+
					texture2D(gm_BaseTexture, v_coord + texel.xy*a.yx)+
					texture2D(gm_BaseTexture, v_coord - texel.xy*a.yx))*(1./12.);
}
