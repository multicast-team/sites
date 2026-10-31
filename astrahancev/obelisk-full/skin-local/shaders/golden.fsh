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
varying vec2 v_vTexcoord;
varying vec4 v_vColour;
/* varying vec3 vv_position; */
/* varying vec3 vv_normal; */

const vec3 stage0 = vec3(25.0, 25.0, 25.0) / 255.0;
const vec3 stage1 = vec3(200.0, 67.0, 0.0) / 255.0;
const vec3 stage2 = vec3(237.0, 164.0, 50.0) / 255.0;
const vec3 stage3 = vec3(255.0, 225.0, 78.0) / 255.0;
const vec3 stage4 = vec3(255.0, 247.0, 116.0) / 255.0;
const vec3 stage5 = vec3(251.0, 255.0, 184.0) / 255.0;

const vec3 grey = vec3(0.229, 0.587, 0.114);

void main() 
{
    vec4 originalcolor = v_vColour * texture2D(gm_BaseTexture, v_vTexcoord);
    float posterization = (originalcolor.r + originalcolor.g + originalcolor.b) / 3.0;
    float index = clamp(posterization * 6.0 - 1.0, 0.0, 5.0);
    vec3 colors[6];
    colors[0] = vec3(25.0, 25.0, 25.0) / 255.0;
    colors[1] = vec3(200.0, 67.0, 0.0) / 255.0;
    colors[2] = vec3(237.0, 164.0, 50.0) / 255.0;
    colors[3] = vec3(255.0, 225.0, 78.0) / 255.0;
    colors[4] = vec3(255.0, 247.0, 116.0) / 255.0;
    colors[5] = vec3(251.0, 255.0, 184.0) / 255.0;
    gl_FragColor = vec4(colors[int(index)], originalcolor.a);
}
