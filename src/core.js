/* Shared geometry: all model lengths are inches, never screen pixels. */
(function(root){
    'use strict';
    const UNITS={
        in:1,cm:2.54,mm:25.4,pt:72,emu:914400
    };
    const finite=(v)=>typeof v==='number'&&Number.isFinite(v);
    function convert(v,from,to){
        if(!finite(v)||!UNITS[from]||!UNITS[to])throw Error('Invalid conversion');
        return v/UNITS[from]*UNITS[to];
    }
    function bounds(e){
        const r=e.rotation*Math.PI/180,c=Math.abs(Math.cos(r)),s=Math.abs(Math.sin(r));
        const w=e.w*c+e.h*s,h=e.w*s+e.h*c;
        return {
            x:e.x+e.w/2-w/2,y:e.y+e.h/2-h/2,w,h
        };
    }
    function constrain(e,slide){
        const b=bounds(e);
        e.x+=b.w>slide.w?(slide.w-b.w)/2-b.x:Math.min(0,slide.w-b.x-b.w)-Math.min(0,b.x);
        e.y+=b.h>slide.h?(slide.h-b.h)/2-b.y:Math.min(0,slide.h-b.y-b.h)-Math.min(0,b.y);
        return e;
    }
    function resizeSlide(p,w,h,mode){
        if(!finite(w)||!finite(h)||w<1||h<1||w>56||h>56)throw Error('Slide dimensions must be 1–56 inches.');
        const sx=w/p.slide.w,sy=h/p.slide.h;
        p.elements.forEach(e=>{
            if(mode==='scale'){
                e.x*=sx;
                e.y*=sy;
                e.w*=sx;
                e.h*=sy;
                e.fontSize*=Math.min(sx,sy);
            }
            else if(mode==='fit'){
                const s=Math.min(sx,sy);
                e.x=e.x*s+(w-p.slide.w*s)/2;
                e.y=e.y*s+(h-p.slide.h*s)/2;
                e.w*=s;
                e.h*=s;
                e.fontSize*=s;
            }
        });
        p.slide.w=w;
        p.slide.h=h;
        return p;
    }
    function validate(p){
        if(!p||p.version!==1||p.unit!=='in'||!p.slide||!Array.isArray(p.elements))throw Error('Expected version 1 layout with inches.');
        if(!finite(p.slide.w)||!finite(p.slide.h)||p.slide.w<1||p.slide.h<1||p.slide.w>56||p.slide.h>56)throw Error('Invalid slide size.');
        if(!/^#[0-9a-f]{6}$/i.test(p.slide.background))throw Error('Invalid background.');
        if(p.elements.length>500)throw Error('Maximum 500 elements.');
        const ids=new Set();
        const out={
            version:1,unit:'in',slide:{
                w:p.slide.w,h:p.slide.h,background:p.slide.background
            },
            elements:[]
        };
        for(const e of p.elements){
            if(!e||typeof e.id!=='string'||e.id.length>100||ids.has(e.id))throw Error('Invalid or duplicate element ID.');
            ids.add(e.id);
            if(!['text','rect','ellipse','image'].includes(e.type))throw Error('Unsupported element type.');
            for(const k of ['x','y','w','h','rotation','fontSize'])if(!finite(e[k]))throw Error('Non-finite '+k);
            if(Math.abs(e.x)>112||Math.abs(e.y)>112||e.w<.01||e.h<.01||e.w>112||e.h>112||e.fontSize<1||e.fontSize>1000||Math.abs(e.rotation)>360)throw Error('Geometry outside supported range.');
            for(const k of ['name','text','fontFamily'])if(typeof e[k]!=='string'||e[k].length>20000)throw Error('Invalid '+k);
            for(const k of ['fill','color'])if(!/^#[0-9a-f]{6}$/i.test(e[k]))throw Error('Invalid color.');
            if(typeof e.locked!=='boolean'||typeof e.hidden!=='boolean')throw Error('Invalid flags.');
            if(e.type==='image'&&(!/^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(e.src||'')||e.src.length>14000000))throw Error('Images must be embedded PNG/JPEG under 10 MB.');
            out.elements.push({
                id:e.id,type:e.type,name:e.name,text:e.text,x:e.x,y:e.y,w:e.w,h:e.h,rotation:e.rotation,fontSize:e.fontSize,fontFamily:e.fontFamily,fill:e.fill,color:e.color,locked:e.locked,hidden:e.hidden,src:e.type==='image'?e.src:undefined
            });
        }
        if(JSON.stringify(out).length>25000000)throw Error("Layout exceeds 25 MB total size limit.");
        return out;
    }
    function warnings(p){
        const a=[];
        p.elements.filter(e=>!e.hidden).forEach(e=>{
            const b=bounds(e);
            if(b.x<-.000001||b.y<-.000001||b.x+b.w>p.slide.w+.000001||b.y+b.h>p.slide.h+.000001)a.push(e.name+': extends beyond slide.');
        });
        return a;
    }
    function coordinates(e,unit){
        const o={
            id:e.id,name:e.name,type:e.type,unit,rotation:e.rotation
        };
        for(const k of ['x','y','w','h'])o[k]=unit==='emu'?Math.round(convert(e[k],'in',unit)):Number(convert(e[k],'in',unit).toFixed(6));
        return o;
    }
    function python(p){
        const q=s=>JSON.stringify(s).replace(/\\u2028/g,'\\u2028');
        const lines=['# pip install python-pptx','import base64','from io import BytesIO','from pptx import Presentation','from pptx.util import Inches, Pt','from pptx.enum.shapes import MSO_SHAPE','from pptx.dml.color import RGBColor','','prs = Presentation()',`prs.slide_width = Inches(${p.slide.w})`,`prs.slide_height = Inches(${p.slide.h})`,'slide = prs.slides.add_slide(prs.slide_layouts[6])','slide.background.fill.solid()',`slide.background.fill.fore_color.rgb = RGBColor.from_string('${p.slide.background.slice(1)}')`];
        p.elements.filter(e=>!e.hidden).forEach(e=>{
            lines.push('',`# ${e.id.replace(/[\r\n]/g,' ')}`);
            const g=[e.x,e.y,e.w,e.h].map(n=>`Inches(${n})`).join(', ');
            if(e.type==='image'){
                lines.push(`shape = slide.shapes.add_picture(BytesIO(base64.b64decode(${q(e.src.split(',')[1])})), ${g})`);
            }
            else if(e.type==='text'){
                lines.push(`shape = slide.shapes.add_textbox(${g})`,'tf = shape.text_frame','tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0',`tf.text = ${q(e.text)}`,'tf.word_wrap = True','for paragraph in tf.paragraphs:',`    paragraph.font.size = Pt(${e.fontSize})`,`    paragraph.font.name = ${q(e.fontFamily)}`,`    paragraph.font.color.rgb = RGBColor.from_string('${e.color.slice(1)}')`);
            }
            else{
                lines.push(`shape = slide.shapes.add_shape(MSO_SHAPE.${e.type==='ellipse'?'OVAL':'RECTANGLE'}, ${g})`,'shape.fill.solid()',`shape.fill.fore_color.rgb = RGBColor.from_string('${e.fill.slice(1)}')`,'shape.line.fill.background()');
            }
            lines.push(`shape.name = ${q(e.name)}`,`shape.rotation = ${e.rotation}`);
        });
        lines.push('','prs.save("layout.pptx")','');
        return lines.join('\n');
    }
    function javascript(p){
        const lines=['// npm install pptxgenjs','// Save as layout.cjs; run: node layout.cjs',"const pptxgen = require('pptxgenjs');",'const pptx = new pptxgen();',`pptx.defineLayout({name:'CUSTOM',width:${p.slide.w},height:${p.slide.h}});`,"pptx.layout = 'CUSTOM';",'const slide = pptx.addSlide();',`slide.background = {color:'${p.slide.background.slice(1)}'};`];
        p.elements.filter(e=>!e.hidden).forEach(e=>{
            const g={
                x:e.x,y:e.y,w:e.w,h:e.h,rotate:e.rotation
            };
            if(e.type==='image'){
                lines.push(`slide.addImage(${JSON.stringify({...g,data:e.src})});`);
            }
            else if(e.type==='text'){
                lines.push(`slide.addText(${JSON.stringify(e.text)}, ${JSON.stringify({...g,fontSize:e.fontSize,fontFace:e.fontFamily,color:e.color.slice(1),margin:0,breakLine:false})});`);
            }
            else lines.push(`slide.addShape(pptx.ShapeType.${e.type}, ${JSON.stringify({...g,fill:{color:e.fill.slice(1)},line:{transparency:100}})});`);
        });
        lines.push("pptx.writeFile({fileName:'layout.pptx'}).catch(e => {console.error(e);process.exitCode=1;});",'');
        return lines.join('\n');
    }
    const api={
        UNITS,convert,bounds,constrain,resizeSlide,validate,warnings,coordinates,python,javascript
    };
    if(typeof module!=='undefined')module.exports=api;
    else root.LayoutCore=api;
})(typeof globalThis!=='undefined'?globalThis:this);
