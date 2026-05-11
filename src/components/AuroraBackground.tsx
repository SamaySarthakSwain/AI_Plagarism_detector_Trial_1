import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export const AuroraBackground: React.FC = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const [isDark, setIsDark] = useState(true);

    useEffect(() => {
        const checkDark = () => 
            document.documentElement.classList.contains('dark') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches && !document.documentElement.classList.contains('light'));
        
        setIsDark(checkDark());

        const observer = new MutationObserver(() => setIsDark(checkDark()));
        observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = () => setIsDark(checkDark());
        mediaQuery.addEventListener('change', handleChange);

        return () => {
            observer.disconnect();
            mediaQuery.removeEventListener('change', handleChange);
        };
    }, []);

    const isDarkRef = useRef(isDark);
    useEffect(() => {
        isDarkRef.current = isDark;
    }, [isDark]);

    useEffect(() => {
        if (!mountRef.current) return;
        const currentMount = mountRef.current;
        const scene = new THREE.Scene();
        const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const renderer = new THREE.WebGLRenderer({ alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.position = 'fixed';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.zIndex = '-10'; 
        renderer.domElement.style.display = 'block';
        currentMount.appendChild(renderer.domElement);

        const material = new THREE.ShaderMaterial({
            uniforms: { 
                iTime: { value: 0 }, 
                iResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
                uDark: { value: 1.0 }
            },
            vertexShader: `void main() { gl_Position = vec4(position, 1.0); }`,
            fragmentShader: `
                uniform float iTime; 
                uniform vec2 iResolution;
                uniform float uDark;
                #define NUM_OCTAVES 3
                float rand(vec2 n) { return fract(sin(dot(n, vec2(12.9898, 4.1414))) * 43758.5453); }
                float noise(vec2 p){ 
                    vec2 ip=floor(p);
                    vec2 u=fract(p);
                    u=u*u*(3.0-2.0*u);
                    float res=mix(mix(rand(ip),rand(ip+vec2(1.0,0.0)),u.x),mix(rand(ip+vec2(0.0,1.0)),rand(ip+vec2(1.0,1.0)),u.x),u.y);
                    return res*res; 
                }
                float fbm(vec2 x) { 
                    float v=0.0;
                    float a=0.3;
                    vec2 shift=vec2(100);
                    mat2 rot=mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.50));
                    for(int i=0;i<NUM_OCTAVES;++i){
                        v+=a*noise(x);
                        x=rot*x*2.0+shift;
                        a*=0.4;
                    }
                    return v;
                }
                void main() {
                    vec2 p=((gl_FragCoord.xy)-iResolution.xy*0.5)/iResolution.y*mat2(6.,-4.,4.,6.);
                    vec4 o=vec4(0.);
                    float f=2.+fbm(p+vec2(iTime*5.,0.))*.5;
                    for(float i=0.;i++<35.;){
                        vec2 v=p+cos(i*i+(iTime+p.x*.08)*.025+i*vec2(13.,11.))*3.5;
                        float tailNoise=fbm(v+vec2(iTime*.5,i))*.3*(1.-(i/35.));
                        vec4 auroraColors=vec4(.1+.3*sin(i*.2+iTime*.4),.3+.5*cos(i*.3+iTime*.5),.7+.3*sin(i*.4+iTime*.3),1.);
                        vec4 currentContribution=auroraColors*exp(sin(i*i+iTime*.8))/length(max(v,vec2(v.x*f*.015,v.y*1.5)));
                        float thinnessFactor=smoothstep(0.,1.,i/35.)*.6;
                        o+=currentContribution*(1.+tailNoise*.8)*thinnessFactor;
                    }
                    o=tanh(pow(o/100.,vec4(1.6)))*1.5;
                    
                    // Background Colors
                    vec3 darkBg = vec3(0.02, 0.04, 0.08); 
                    vec3 lightBg = vec3(0.96, 0.98, 1.0); 
                    
                    vec3 bg = mix(lightBg, darkBg, uDark);
                    
                    // In light mode, aurora is subtractive/darker (ink-like). In dark mode, it's additive/lighter (neon).
                    vec3 lightModeColor = bg - (o.rgb * 0.8);
                    vec3 darkModeColor = bg + o.rgb;
                    
                    vec3 finalColor = mix(lightModeColor, darkModeColor, uDark);
                    
                    gl_FragColor = vec4(finalColor, 1.0);
                }`
        });

        const geometry = new THREE.PlaneGeometry(2, 2);
        const mesh = new THREE.Mesh(geometry, material);
        scene.add(mesh);

        let animationFrameId: number;
        let currentDark = isDarkRef.current ? 1.0 : 0.0;
        
        const animate = () => { 
            animationFrameId = requestAnimationFrame(animate); 
            material.uniforms.iTime.value += 0.016; 
            
            // Smoothly interpolate dark mode uniform for a seamless fade transition
            const targetDark = isDarkRef.current ? 1.0 : 0.0;
            currentDark += (targetDark - currentDark) * 0.05;
            material.uniforms.uDark.value = currentDark;
            
            renderer.render(scene, camera); 
        };

        const handleResize = () => { 
            renderer.setSize(window.innerWidth, window.innerHeight); 
            material.uniforms.iResolution.value.set(window.innerWidth, window.innerHeight); 
        };

        window.addEventListener('resize', handleResize);
        animate();

        return () => { 
            cancelAnimationFrame(animationFrameId); 
            window.removeEventListener('resize', handleResize); 
            if (currentMount.contains(renderer.domElement)) {
                currentMount.removeChild(renderer.domElement); 
            }
            renderer.dispose(); 
            material.dispose(); 
            geometry.dispose(); 
        };
    }, []);

    return <div ref={mountRef} className="fixed inset-0 pointer-events-none z-[-10]" />;
};
