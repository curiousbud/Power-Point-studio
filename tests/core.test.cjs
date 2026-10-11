const {
    test
}
=require('node:test');
const assert=require('node:assert/strict');
const C=require('../src/core.js');
const element=()=>({
    id:'one',type:'text',name:'Title',x:1,y:2,w:3,h:1,rotation:0,text:'Line 1\n"quotes" \\ slash 😀',fontSize:24,fontFamily:'Arial',fill:'#147c6d',color:'#243249',locked:false,hidden:false
});
const project=()=>({
    version:1,unit:'in',slide:{
        w:10,h:7.5,background:'#ffffff'
    },
    elements:[element()]
});
test('Office units and precision',()=>{
    assert.equal(C.convert(1,'in','emu'),914400);
    assert.equal(C.convert(1,'pt','emu'),12700);
    assert.equal(C.convert(25.4,'mm','in'),1);
    assert.throws(()=>C.convert(NaN,'in','pt'));
    assert.throws(()=>C.convert(1,'px','pt'));
    const e=element();
    e.x=1/3;
    assert.equal(C.coordinates(e,'emu').x,304800);
});
test('rotated bounds and inside constraint',()=>{
    const e=element();
    e.rotation=90;
    let b=C.bounds(e);
    assert.ok(Math.abs(b.w-1)<1e-10);
    assert.ok(Math.abs(b.h-3)<1e-10);
    e.x=-4;
    e.y=-4;
    C.constrain(e,{
        w:10,h:7.5
    });
    b=C.bounds(e);
    assert.ok(Math.abs(b.x)<1e-10);
    assert.ok(Math.abs(b.y)<1e-10);
});
test('oversized element centres and warns',()=>{
    const p=project();
    p.elements[0].w=20;
    C.constrain(p.elements[0],p.slide);
    assert.equal(C.bounds(p.elements[0]).x,-5);
    assert.equal(C.warnings(p).length,1);
});
test('resize policies preserve or scale geometry',()=>{
    let p=project();
    C.resizeSlide(p,20,15,'keep');
    assert.equal(p.elements[0].x,1);
    p=project();
    C.resizeSlide(p,20,15,'scale');
    assert.equal(p.elements[0].w,6);
    assert.equal(p.elements[0].fontSize,48);
    p=project();
    C.resizeSlide(p,20,7.5,'fit');
    assert.equal(p.elements[0].x,6);
    assert.equal(p.elements[0].w,3);
    assert.throws(()=>C.resizeSlide(p,0,7,'keep'));
});
test('reject malformed inputs and never accept remote or SVG image sources',()=>{
    const p=project();
    assert.equal(C.validate(p).elements.length,1);
    for(const mutate of [p=>p.version=2,p=>p.elements[0].w=0,p=>p.elements[0].x=Infinity,p=>p.elements.push({
        ...p.elements[0]
    }),p=>p.elements[0].fill='red',p=>{
        p.elements[0].type='image';p.elements[0].src='https://example.org/a.png';
    },
    p=>{
        p.elements[0].type='image';p.elements[0].src='data:image/svg+xml;base64,YQ==';
    }
    ]){
        const copy=project();
        mutate(copy);
        assert.throws(()=>C.validate(copy));
    }
});
test('code retains numeric geometry and omits hidden elements',()=>{
    const p=project();
    assert.match(C.python(p),/Inches\(3\)/);
    assert.match(C.javascript(p),/"w":3/);
    p.elements[0].hidden=true;
    assert.doesNotMatch(C.python(p),/add_textbox/);
    assert.doesNotMatch(C.javascript(p),/addText/);
});
test('coordinate extraction does not mutate project',()=>{
    const p=project(),before=JSON.stringify(p);
    C.coordinates(p.elements[0],'mm');
    C.python(p);
    C.javascript(p);
    assert.equal(JSON.stringify(p),before);
});
