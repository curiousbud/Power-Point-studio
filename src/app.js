/* No modules: index.html also works directly over file://. */
'use strict';
const C=LayoutCore,$=id=>document.getElementById(id),clone=v=>JSON.parse(JSON.stringify(v));
const STORAGE='slide-coordinate-studio:v1';
let project=blank(),selected=new Set(),undo=[],redo=[],scale=60,gesture=null,dirty=false,unit='in';
function blank(){
    return {
        version:1,unit:'in',slide:{
            w:13.333333333333334,h:7.5,background:'#ffffff'
        },
        elements:[]
    };
}
function say(s){
    $('status').textContent=s;
}
function snapshot(){
    return JSON.stringify(project);
}
function pushHistory(stack,s){
    stack.push(s);
    let bytes=stack.reduce((n,v)=>n+v.length,0);
    while(stack.length>1&&(stack.length>50||bytes>20000000))bytes-=stack.shift().length;
}
function checkpoint(){
    pushHistory(undo,snapshot());
    redo=[];
}
function persist(){
    dirty=true;
    try{
        const s=snapshot();
        if(s.length>4000000){
            say('Layout exceeds autosave budget. Save JSON to protect your work.');
            return;
        }
        localStorage.setItem(STORAGE,s);
    }
    catch{
        say('Autosave unavailable or full. Save JSON to protect your work.');
    }
}
function finish(){
    persist();
    render();
}
function mutate(fn){
    const before=snapshot();
    try{
        fn();
        project=C.validate(project);
        if(snapshot()!==before){
            pushHistory(undo,before);
            redo=[];
            finish();
        }
        else render();
    }
    catch(e){
        project=JSON.parse(before);
        say(e.message);
        render();
    }
}
function active(){
    return project.elements.filter(e=>selected.has(e.id));
}
function editable(){
    return active().filter(e=>!e.locked);
}
function valIn(v){
    return C.convert(v,unit,'in');
}
function fmt(v){
    return unit==='emu'?Math.round(C.convert(v,'in',unit)):Number(C.convert(v,'in',unit).toFixed(5));
}
function newElement(type,extra={
}){
    if(project.elements.length>=500)throw Error('Maximum 500 elements.');
    const e={
        id:cryptoID(),type,name:type+' '+(project.elements.length+1),x:.5,y:.5,w:3,h:type==='text'?.6:2,rotation:0,text:type==='text'?'Your text here':'',fontSize:24,fontFamily:'Arial',fill:'#147c6d',color:'#243249',locked:false,hidden:false,...extra
    };
    project.elements.push(e);
    selected=new Set([e.id]);
}
function cryptoID(){
    return globalThis.crypto?.randomUUID?.()||'e'+Date.now().toString(36)+Math.random().toString(36).slice(2);
}
function render(){
    selected=new Set([...selected].filter(id=>project.elements.some(e=>e.id===id)));
    const avail=$('viewport').clientWidth-90;
    scale=$('zoom').value==='fit'?Math.max(8,Math.min(avail/project.slide.w,($('viewport').clientHeight-90)/project.slide.h)):96*Number($('zoom').value);
    $('frame').style.width=project.slide.w*scale+'px';
    $('frame').style.height=project.slide.h*scale+'px';
    const slide=$('slide');
    slide.style.backgroundColor=project.slide.background;
    slide.classList.toggle('grid',$('grid').checked);
    slide.style.backgroundSize=Number($('step').value)*scale+'px '+Number($('step').value)*scale+'px';
    slide.replaceChildren();
    project.elements.forEach(e=>{
        if(e.hidden)return;
        const n=document.createElement('div');
        n.dataset.id=e.id;
        n.className='element'+(selected.has(e.id)?' selected':'')+(e.locked?' locked':'');
        n.setAttribute('aria-label',e.name);
        Object.assign(n.style,{
            left:e.x*scale+'px',top:e.y*scale+'px',width:e.w*scale+'px',height:e.h*scale+'px',transform:`rotate(${e.rotation}deg)`,fontSize:e.fontSize/72*scale+'px',fontFamily:e.fontFamily,color:e.color
        });
        if(e.type==='image'){
            const im=document.createElement('img');
            im.src=e.src;
            im.alt=e.name;
            n.append(im);
        }
        else if(e.type==='text'){
            n.textContent=e.text;
        }
        else{
            n.style.background=e.fill;
            if(e.type==='ellipse')n.style.borderRadius='50%';
        }
        if(selected.size===1&&selected.has(e.id)&&!e.locked){
            for(const dir of ['nw','ne','sw','se']){
                const h=document.createElement('span');
                h.className='handle '+dir;
                h.dataset.handle=dir;
                n.append(h);
            }
        }
        slide.append(n);
    });
    $('hruler').replaceChildren();
    $('vruler').replaceChildren();
    const stride=Math.max(1,Math.ceil(45/scale));
    for(let n=0;n<=project.slide.w;n+=stride){
        const t=document.createElement('span');
        t.className='tick';
        t.style.left=n*scale+'px';
        t.textContent=fmt(n);
        $('hruler').append(t);
    }
    for(let n=0;n<=project.slide.h;n+=stride){
        const t=document.createElement('span');
        t.className='vtick';
        t.style.top=n*scale+'px';
        t.textContent=fmt(n);
        $('vruler').append(t);
    }
    $('layers').replaceChildren();
    [...project.elements].reverse().forEach(e=>{
        const b=document.createElement('button');
        b.className='layer'+(selected.has(e.id)?' active':'');
        b.textContent=(e.hidden?'◌ ':e.locked?'▣ ':'')+e.name;
        b.onclick=ev=>{
            select(e.id,ev.shiftKey);
            render();
        };
        $('layers').append(b);
    });
    const a=active(),e=a.length===1?a[0]:null;
    $('selectionInfo').textContent=e?e.type+' · '+unit:a.length?a.length+' elements selected':'Select an element to edit its coordinates.';
    $('properties').disabled=!e;
    if(e){
        for(const k of ['name','text','fontSize','fontFamily','rotation','fill','color'])$(k).value=e[k];
        for(const k of ['x','y','w','h'])$(k).value=fmt(e[k]);
        for(const k of ['locked','hidden'])$(k).checked=e[k];
        for(const k of ['name','text','fontSize','fontFamily','rotation','fill','color','x','y','w','h','hidden','aspect'])$(k).disabled=e.locked;
        for(const k of ['text','fontSize','fontFamily','color'])$(k).disabled=e.locked||e.type!=='text';
        $('fill').disabled=e.locked||!['rect','ellipse'].includes(e.type);
    }
    $('sw').value=fmt(project.slide.w);
    $('sh').value=fmt(project.slide.h);
    $('background').value=project.slide.background;
    $('undo').disabled=!undo.length;
    $('redo').disabled=!redo.length;
    $('summary').textContent=`${fmt(project.slide.w)} × ${fmt(project.slide.h)} ${unit} · ${project.elements.length} elements`;
    $('warnings').textContent=C.warnings(project).join('  ');
    updateCode();
}
function select(id,add){
    if(add){
        selected.has(id)?selected.delete(id):selected.add(id);
    }
    else selected=new Set([id]);
}
function updateCode(){
    const a=active(),p={
        ...project,elements:a
    },
    f=$('format').value;
    if(f==='json')$('code').value=JSON.stringify(a.map(e=>C.coordinates(e,unit)),null,2);
    else if(f==='python')$('code').value=C.python(p);
    else if(f==='js')$('code').value=C.javascript(p);
    else $('code').value=a.map(e=>`' ${e.name.replace(/[\r\n]/g,' ')}\n' Apply to an existing PowerPoint Shape\nWith shp\n    .Left = ${e.x*72}\n    .Top = ${e.y*72}\n    .Width = ${e.w*72}\n    .Height = ${e.h*72}\n    .Rotation = ${e.rotation}\nEnd With`).join('\n\n');
}
function download(text,name,type='text/plain'){
    const url=URL.createObjectURL(new Blob([text],{
        type
    })),a=document.createElement('a');
    a.href=url;
    a.download=name;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),2000);
}
function snap(n){
    const s=Number($('step').value);
    return $('snap').checked?Math.round(n/s)*s:n;
}
function limit(e){
    if($('clamp').checked)C.constrain(e,project.slide);
}
$('slide').addEventListener('pointerdown',ev=>{
    if(ev.button!==0||gesture)return;
    const target=ev.target.closest('.element');
    if(!target){
        selected.clear();
        render();
        return;
    }
    const id=target.dataset.id;
    if(!selected.has(id)||ev.shiftKey){
        select(id,ev.shiftKey);
        render();
    }
    const elems=editable();
    if(!elems.length)return;
    const handle=ev.target.dataset.handle;
    if(handle&&(selected.size!==1||!selected.has(id)))return;
    gesture={
        before:snapshot(),id:ev.pointerId,x:ev.clientX,y:ev.clientY,scale,handle,elems:clone(elems)
    };
    $('slide').setPointerCapture(ev.pointerId);
    ev.preventDefault();
});
$('slide').addEventListener('pointermove',ev=>{
    if(!gesture||ev.pointerId!==gesture.id)return;
    const dx=(ev.clientX-gesture.x)/gesture.scale,dy=(ev.clientY-gesture.y)/gesture.scale;
    for(const original of gesture.elems){
        const e=project.elements.find(e=>e.id===original.id);
        if(gesture.handle){
            const r=original.rotation*Math.PI/180;
            const lx=dx*Math.cos(r)+dy*Math.sin(r),ly=-dx*Math.sin(r)+dy*Math.cos(r),sx=gesture.handle.includes('e')?1:-1,sy=gesture.handle.includes('s')?1:-1;
            let w=Math.max(.01,Math.min(112,snap(original.w+sx*lx))),h=Math.max(.01,Math.min(112,snap(original.h+sy*ly)));
            if($('aspect').checked||ev.shiftKey){
                const ratio=original.w/original.h;
                if(Math.abs(lx/original.w)>Math.abs(ly/original.h))h=w/ratio;
                else w=h*ratio;
                const factor=Math.min(1,112/w,112/h);
                w*=factor;
                h*=factor;
                w=Math.max(.01,w);
                h=Math.max(.01,h);
            }
            const ox=sx*(w-original.w)/2,oy=sy*(h-original.h)/2;
            e.x=original.x+original.w/2+ox*Math.cos(r)-oy*Math.sin(r)-w/2;
            e.y=original.y+original.h/2+ox*Math.sin(r)+oy*Math.cos(r)-h/2;
            e.w=w;
            e.h=h;
        }
        else{
            const anchor=gesture.elems[0];
            e.x=original.x+snap(anchor.x+dx)-anchor.x;
            e.y=original.y+snap(anchor.y+dy)-anchor.y;
        }
        limit(e);
        e.x=Math.max(-112,Math.min(112,e.x));
        e.y=Math.max(-112,Math.min(112,e.y));
    }
    render();
});
function endGesture(cancel){
    if(!gesture)return;
    const before=gesture.before;
    if(cancel)project=JSON.parse(before);
    else if(snapshot()!==before){
        try{
            project=C.validate(project);
            pushHistory(undo,before);
            redo=[];
            persist();
        }
        catch(e){
            project=JSON.parse(before);
            say(e.message);
        }
    }
    gesture=null;
    render();
}
$('slide').addEventListener('pointerup',()=>endGesture(false));
$('slide').addEventListener('pointercancel',()=>endGesture(true));
$('slide').addEventListener('lostpointercapture',()=>{
    if(gesture)endGesture(false);
});
for(const k of ['name','text','fontSize','fontFamily','rotation','fill','color','x','y','w','h','locked','hidden'])$(k).addEventListener('change',()=>mutate(()=>{
    const e=active()[0];
    if(!e||e.locked&&k!=='locked')return;
    if(['x','y','w','h'].includes(k)){
        const n=valIn(Number($(k).value));
        if($(k).value.trim()==='')throw Error('Enter a number.');
        if($('aspect').checked&&(k==='w'||k==='h')){
            const ratio=e.w/e.h;
            e[k]=n;
            e[k==='w'?'h':'w']=k==='w'?n/ratio:n*ratio;
        }
        else e[k]=n;
    }
    else if(['locked','hidden'].includes(k))e[k]=$(k).checked;
    else if(['fontSize','rotation'].includes(k)){
        if(!$(k).value.trim())throw Error('Enter a number.');
        e[k]=Number($(k).value);
    }
    else e[k]=$(k).value;
    limit(e);
}));
$('addText').onclick=()=>mutate(()=>newElement('text'));
$('addRect').onclick=()=>mutate(()=>newElement('rect'));
$('addEllipse').onclick=()=>mutate(()=>newElement('ellipse'));
$('addImage').onclick=()=>$('imageFile').click();
async function decodeImage(src){
    const im=new Image();
    await new Promise((resolve,reject)=>{
        const timer=setTimeout(()=>reject(Error('Image decode timed out')),10000);
        im.onload=()=>{
            clearTimeout(timer);
            resolve();
        };
        im.onerror=()=>{
            clearTimeout(timer);
            reject(Error('Invalid embedded image'));
        };
        im.src=src;
    });
    if(!im.naturalWidth||im.naturalWidth*im.naturalHeight>50000000)throw Error('Image exceeds 50 megapixels.');
    return im;
}
async function imageLoad(file){
    if(!file)return;
    if(!['image/png','image/jpeg'].includes(file.type)||file.size>10000000){
        say('Use a PNG/JPEG smaller than 10 MB.');
        return;
    }
    const data=await new Promise((resolve,reject)=>{
        const r=new FileReader();
        r.onload=()=>resolve(r.result);
        r.onerror=()=>reject(Error('Cannot read image'));
        r.readAsDataURL(file);
    });
    const im=await decodeImage(data);
    mutate(()=>{
        const w=Math.min(4,project.slide.w-1),h=w*im.naturalHeight/im.naturalWidth;
        const f=Math.min(1,(project.slide.h-1)/h);
        newElement('image',{
            name:file.name,src:data,w:Math.max(.01,w*f),h:Math.max(.01,h*f)
        });
    });
}
$('imageFile').onchange=async ev=>{
    try{
        await imageLoad(ev.target.files[0]);
    }
    catch(e){
        say(e.message);
    }
    ev.target.value='';
};
$('unit').onchange=()=>{
    unit=$('unit').value;
    render();
};
$('zoom').onchange=render;
$('grid').onchange=render;
$('snap').onchange=render;
$('step').onchange=()=>{
    const v=Number($('step').value);
    if(!Number.isFinite(v)||v<.01||v>5){
        $('step').value=.1;
        say('Grid spacing must be 0.01–5 inches.');
    }
    render();
};
$('preset').onchange=()=>{
    const sizes={
        wide:[40/3,7.5],standard:[10,7.5],a4:[297/25.4,210/25.4]
    };
    const s=sizes[$('preset').value];
    if(s){
        $('sw').value=fmt(s[0]);
        $('sh').value=fmt(s[1]);
    }
};
$('applySize').onclick=()=>mutate(()=>C.resizeSlide(project,valIn(Number($('sw').value)),valIn(Number($('sh').value)),$('resizeMode').value));
$('background').onchange=()=>mutate(()=>project.slide.background=$('background').value);
$('undo').onclick=()=>{
    if(gesture)endGesture(true);
    if(undo.length){
        pushHistory(redo,snapshot());
        project=JSON.parse(undo.pop());
        finish();
    }
};
$('redo').onclick=()=>{
    if(redo.length){
        pushHistory(undo,snapshot());
        project=JSON.parse(redo.pop());
        finish();
    }
};
$('duplicate').onclick=()=>mutate(()=>{
    const copies=editable().map(e=>({
        ...clone(e),id:cryptoID(),name:e.name+' copy',x:e.x+.2,y:e.y+.2
    }));
    if(project.elements.length+copies.length>500)throw Error('Maximum 500 elements.');
    copies.forEach(limit);
    project.elements.push(...copies);
    selected=new Set(copies.map(e=>e.id));
});
$('delete').onclick=()=>mutate(()=>project.elements=project.elements.filter(e=>!selected.has(e.id)||e.locked));
$('front').onclick=()=>mutate(()=>{
    const ids=new Set(editable().map(e=>e.id));
    project.elements=[...project.elements.filter(e=>!ids.has(e.id)),...project.elements.filter(e=>ids.has(e.id))];
});
$('back').onclick=()=>mutate(()=>{
    const ids=new Set(editable().map(e=>e.id));
    project.elements=[...project.elements.filter(e=>ids.has(e.id)),...project.elements.filter(e=>!ids.has(e.id))];
});
document.querySelectorAll('[data-align]').forEach(b=>b.onclick=()=>mutate(()=>{
    const a=editable();
    if(!a.length)return;
    const boxes=a.map(C.bounds),l=a.length===1?0:Math.min(...boxes.map(e=>e.x)),t=a.length===1?0:Math.min(...boxes.map(e=>e.y)),r=a.length===1?project.slide.w:Math.max(...boxes.map(e=>e.x+e.w)),bt=a.length===1?project.slide.h:Math.max(...boxes.map(e=>e.y+e.h));
    a.forEach(e=>{
        const box=C.bounds(e);
        switch(b.dataset.align){
            case 'left':e.x+=l-box.x;
            break;
            case 'right':e.x+=r-box.x-box.w;
            break;
            case 'top':e.y+=t-box.y;
            break;
            case 'bottom':e.y+=bt-box.y-box.h;
            break;
            case 'center':e.x+=(l+r)/2-box.x-box.w/2;
            break;
            case 'middle':e.y+=(t+bt)/2-box.y-box.h/2;
        }
        limit(e);
    });
}));
$('format').onchange=updateCode;
$('copy').onclick=async()=>{
    if(!selected.size){
        say('Select at least one element.');
        return;
    }
    updateCode();
    try{
        if(!navigator.clipboard)throw Error('Clipboard unavailable');
        await navigator.clipboard.writeText($('code').value);
        say('Copied selected layout.');
    }
    catch{
        $('code').focus();
        $('code').select();
        say('Clipboard unavailable. Output selected: press Ctrl+C / Cmd+C.');
    }
};
$('export').onclick=()=>{
    const f=$('format').value;
    if(f==='python')download(C.python(project),'layout.py');
    else if(f==='js')download(C.javascript(project),'layout.cjs');
    else if(f==='vba'){
        const prev=selected;
        selected=new Set(project.elements.map(e=>e.id));
        updateCode();
        download($('code').value,'coordinates.bas');
        selected=prev;
        updateCode();
    }
    else download(JSON.stringify(project.elements.map(e=>C.coordinates(e,unit)),null,2),'coordinates.json','application/json');
};
$('save').onclick=()=>{
    download(JSON.stringify(project,null,2),'slide-layout.json','application/json');
    dirty=false;
    say('JSON downloaded. It includes embedded images.');
};
$('open').onclick=()=>$('jsonFile').click();
$('jsonFile').onchange=async ev=>{
    const f=ev.target.files[0];
    try{
        if(!f)return;
        if(f.size>25000000)throw Error('Layout exceeds 25 MB import limit.');
        const p=C.validate(JSON.parse(await f.text()));
        for(const e of p.elements.filter(e=>e.type==='image'))await decodeImage(e.src);
        if(dirty&&!confirm('Replace current layout? Save JSON first if needed.'))return;
        checkpoint();
        project=p;
        selected.clear();
        finish();
        say('Layout imported.');
    }
    catch(e){
        say('Import failed: '+e.message);
    }
    finally{
        ev.target.value='';
    }
};
$('new').onclick=()=>{
    if(project.elements.length&&!confirm('Clear current layout? Save JSON first if needed.'))return;
    mutate(()=>{
        project=blank();
        selected.clear();
    });
};
document.addEventListener('keydown',ev=>{
    const typing=ev.target.closest('input,textarea,select');
    if(typing)return;
    if(ev.key==='Escape'){
        endGesture(true);
        selected.clear();
        render();
        return;
    }
    const mod=ev.ctrlKey||ev.metaKey;
    if(mod&&ev.key.toLowerCase()==='z'){
        ev.preventDefault();
        (ev.shiftKey?$('redo'):$('undo')).click();
    }
    else if(mod&&ev.key.toLowerCase()==='y'){
        ev.preventDefault();
        $('redo').click();
    }
    else if(mod&&ev.key.toLowerCase()==='s'){
        ev.preventDefault();
        $('save').click();
    }
    else if(mod&&ev.key.toLowerCase()==='d'){
        ev.preventDefault();
        $('duplicate').click();
    }
    else if(mod&&ev.key.toLowerCase()==='a'){
        ev.preventDefault();
        selected=new Set(project.elements.filter(e=>!e.hidden).map(e=>e.id));
        render();
    }
    else if(ev.key==='Delete'||ev.key==='Backspace'){
        ev.preventDefault();
        $('delete').click();
    }
    else if(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(ev.key)){
        ev.preventDefault();
        mutate(()=>editable().forEach(e=>{
            const d=(ev.shiftKey?10:1)/72;
            e.x+=ev.key==='ArrowLeft'?-d:ev.key==='ArrowRight'?d:0;
            e.y+=ev.key==='ArrowUp'?-d:ev.key==='ArrowDown'?d:0;
            limit(e);
        }));
    }
});
window.addEventListener('beforeunload',ev=>{
    if(dirty){
        ev.preventDefault();
        ev.returnValue='';
    }
});
new ResizeObserver(()=>{
    if(!gesture)render();
}).observe($('viewport'));
try{
    const saved=localStorage.getItem(STORAGE);
    if(saved){
        project=C.validate(JSON.parse(saved));
        say('Recovered locally saved layout.');
    }
}
catch{
    say('Autosave unavailable or invalid. Use JSON save/open.');
}
render();
