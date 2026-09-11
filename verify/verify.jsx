/* Verify Rastrokizer.jsx through its REAL inspect()/convert() on every
 * configuration the relaxed guard now accepts, plus the refusal envelope and the round-2
 * fidelity set.  Every case: build live, export; build again, convert (or record refusal),
 * describe structure, export.  Graded offline (grade_v2.py).  Throwaway docs only.
 * Injected: OUTDIR, FIXFILE, BATCH ('a' | 'b' | 'refuse').  ES3. */
(function () {
//@OUTDIR@
//@FIXFILE@
//@BATCH@
var LOG=[]; function note(t){LOG.push(String(t));}
function cid(s){return charIDToTypeID(s);} function sid(s){return stringIDToTypeID(s);} function t2s(t){try{return typeIDToStringID(t);}catch(e){return String(t);}}
var W=256,H=256,C0=96,C1=160; var MINE=[];
function newDoc(name,c){var mode=c.mode==='cmyk'?NewDocumentMode.CMYK:c.mode==='lab'?NewDocumentMode.LAB:c.gray?NewDocumentMode.GRAYSCALE:NewDocumentMode.RGB;var depth=c.depth===16?BitsPerChannelType.SIXTEEN:c.depth===32?BitsPerChannelType.THIRTYTWO:BitsPerChannelType.EIGHT;var d=app.documents.add(W,H,c.res||72,name,mode,DocumentFill.TRANSPARENT,1.0,depth);MINE.push({doc:d,id:d.id});return d;}
function closeMine(){while(MINE.length){var e=MINE.pop();try{app.activeDocument=e.doc;if(app.activeDocument.id===e.id)app.activeDocument.close(SaveOptions.DONOTSAVECHANGES);}catch(x){}}}
function rgb(r,g,b){var d=new ActionDescriptor();d.putDouble(cid('Rd  '),r);d.putDouble(cid('Grn '),g);d.putDouble(cid('Bl  '),b);return d;}
function targetRef(){var r=new ActionReference();r.putEnumerated(cid('Lyr '),cid('Ordn'),cid('Trgt'));return r;}
function fillShape(doc,layer,kind,x0,y0,x1,y1,col,aa){doc.activeLayer=layer;var d=new ActionDescriptor();var ref=new ActionReference();ref.putProperty(cid('Chnl'),cid('fsel'));d.putReference(cid('null'),ref);var e=new ActionDescriptor();e.putUnitDouble(cid('Top '),cid('#Pxl'),y0);e.putUnitDouble(cid('Left'),cid('#Pxl'),x0);e.putUnitDouble(cid('Btom'),cid('#Pxl'),y1);e.putUnitDouble(cid('Rght'),cid('#Pxl'),x1);d.putObject(cid('T   '),cid(kind),e);d.putBoolean(cid('AntA'),aa!==false);executeAction(cid('setd'),d,DialogModes.NO);var sc=new SolidColor();sc.rgb.red=col[0];sc.rgb.green=col[1];sc.rgb.blue=col[2];doc.selection.fill(sc,ColorBlendMode.NORMAL,100,false);doc.selection.deselect();}
function setLyr(doc,layer,build){doc.activeLayer=layer;var to=new ActionDescriptor();build(to);var d=new ActionDescriptor();d.putReference(cid('null'),targetRef());d.putObject(cid('T   '),cid('Lyr '),to);executeAction(cid('setd'),d,DialogModes.NO);}
var SM={NORMAL:['Nrml',1],DISSOLVE:['Dslv',1],DARKEN:['Drkn',1],MULTIPLY:['Mltp',1],COLORBURN:['CBrn',1],LINEARBURN:['linearBurn',0],DARKERCOLOR:['darkerColor',0],LIGHTEN:['Lghn',1],SCREEN:['Scrn',1],COLORDODGE:['CDdg',1],LINEARDODGE:['linearDodge',0],LIGHTERCOLOR:['lighterColor',0],OVERLAY:['Ovrl',1],SOFTLIGHT:['SftL',1],HARDLIGHT:['HrdL',1],VIVIDLIGHT:['vividLight',0],LINEARLIGHT:['linearLight',0],PINLIGHT:['pinLight',0],HARDMIX:['hardMix',0],DIFFERENCE:['Dfrn',1],EXCLUSION:['Xclu',1],SUBTRACT:['blendSubtraction',0],DIVIDE:['blendDivide',0],HUE:['H   ',1],SATURATION:['Strt',1],COLORBLEND:['Clr ',1],LUMINOSITY:['Lmns',1]};
function applyStyle(doc,group,c){
    var s=new ActionDescriptor(); s.putBoolean(cid('enab'),true);
    s.putEnumerated(cid('Styl'),cid('FStl'),cid(c.style||'OutF'));
    s.putEnumerated(cid('PntT'),cid('FrFl'),cid(c.paint||'SClr'));
    var am=c.strokeMode?SM[c.strokeMode]:null; if(am){s.putEnumerated(cid('Md  '),cid('BlnM'),am[1]?cid(am[0]):sid(am[0]));}else{s.putEnumerated(cid('Md  '),cid('BlnM'),cid('Nrml'));}
    s.putUnitDouble(cid('Opct'),cid('#Prc'),c.strokeOpacity!==undefined?c.strokeOpacity:100);
    s.putUnitDouble(cid('Sz  '),cid('#Pxl'),c.size||8);
    var col=c.colour?rgb(c.colour[0],c.colour[1],c.colour[2]):(c.gray?rgb(255,255,255):rgb(255,0,0));
    s.putObject(cid('Clr '),cid('RGBC'),col);
    var fx=new ActionDescriptor(); fx.putUnitDouble(cid('Scl '),cid('#Prc'),100);
    if(c.extra==='dropShadow'){var ds=new ActionDescriptor();ds.putBoolean(cid('enab'),true);ds.putEnumerated(cid('Md  '),cid('BlnM'),cid('Nrml'));ds.putObject(cid('Clr '),cid('RGBC'),rgb(0,255,0));ds.putUnitDouble(cid('Opct'),cid('#Prc'),100);ds.putBoolean(cid('uglg'),false);ds.putUnitDouble(cid('lagl'),cid('#Ang'),90);ds.putUnitDouble(cid('Dstn'),cid('#Pxl'),0);ds.putUnitDouble(cid('Ckmt'),cid('#Pxl'),100);ds.putUnitDouble(cid('blur'),cid('#Pxl'),12);fx.putObject(cid('DrSh'),cid('DrSh'),ds);}
    fx.putObject(cid('FrFX'),cid('FrFX'),s);
    var d=new ActionDescriptor();var ref=new ActionReference();ref.putProperty(cid('Prpr'),cid('Lefx'));ref.putEnumerated(cid('Lyr '),cid('Ordn'),cid('Trgt'));d.putReference(cid('null'),ref);d.putObject(cid('T   '),cid('Lefx'),fx);
    doc.activeLayer=group; executeAction(cid('setd'),d,DialogModes.NO);
}
function build(c,tag){
    var doc=newDoc('v2-'+c.name+'-'+tag,c);
    var bd=null; if(c.backdrop!==false){bd=doc.artLayers[0];bd.name='backdrop';fillShape(doc,bd,'Rctn',0,0,W,H,c.gray?[128,128,128]:[40,160,220],false);}
    var art=c.backdrop!==false?doc.artLayers.add():doc.artLayers[0]; art.name='content';
    var black=[0,0,0];
    if(c.silhouette==='rect'){fillShape(doc,art,'Rctn',C0,C0,C1,C1,black,false);}
    else{fillShape(doc,art,'Elps',C0,C0,C1,C1,black,true); if(c.silhouette==='partial'){art.opacity=55;}}
    if(c.childType==='smartobject'){doc.activeLayer=art;try{executeAction(sid('newPlacedLayer'),undefined,DialogModes.NO);}catch(e){}art=doc.activeLayer;}
    if(c.childType==='text'){var t=doc.artLayers.add();t.kind=LayerKind.TEXT;t.textItem.contents='Ag';t.textItem.size=new UnitValue(60,'px');t.textItem.position=[C0,C1];var tc=new SolidColor();tc.rgb.red=0;tc.rgb.green=0;tc.rgb.blue=0;t.textItem.color=tc;art.remove();art=t;}
    if(c.childBlend){art.blendMode=BlendMode[c.childBlend];}
    var group=doc.layerSets.add(); group.name='G'; art.move(group,ElementPlacement.INSIDE);
    if(c.second){var ex=doc.artLayers.add();ex.name='content 2';fillShape(doc,ex,'Rctn',140,140,190,190,black,true);ex.move(group,ElementPlacement.INSIDE);}
    if(c.groupMode){group.blendMode=BlendMode[c.groupMode];}
    if(c.groupOpacity!==undefined){group.opacity=c.groupOpacity;}
    if(c.groupFill!==undefined){setLyr(doc,group,function(to){to.putUnitDouble(sid('fillOpacity'),cid('#Prc'),c.groupFill);});}
    if(c.knockout){try{setLyr(doc,group,function(to){to.putEnumerated(sid('knockout'),sid('knockout'),sid(c.knockout));});}catch(e){}}
    applyStyle(doc,group,c);
    return {doc:doc,group:group};
}
function boundsOf(l){try{var b=l.bounds;return '['+b[0].value+','+b[1].value+','+b[2].value+','+b[3].value+']';}catch(e){return '?';}}
function readFill(doc,layer){doc.activeLayer=layer;var L=executeActionGet(targetRef());var k=sid('fillOpacity');if(!L.hasKey(k))return 100;return L.getType(k)===DescValueType.UNITDOUBLE?Math.round(L.getUnitDoubleValue(k)):Math.round(L.getInteger(k)*100/255);}
function describeTree(doc,layers,prefix){for(var i=0;i<layers.length;i++){var l=layers[i];var isG=l.typename==='LayerSet';doc.activeLayer=l;var fx=executeActionGet(targetRef()).hasKey(sid('layerEffects'));note(prefix+(isG?'group "':'layer "')+l.name+'" blend='+String(l.blendMode).replace('BlendMode.','')+' opacity='+Math.round(l.opacity*10)/10+(isG?' fill='+readFill(doc,l):'')+' bounds='+boundsOf(l)+' effects='+fx);if(isG)describeTree(doc,l.layers,prefix+'  ');}}
function savePng(doc,name){app.activeDocument=doc;if(doc.bitsPerChannel!==BitsPerChannelType.EIGHT){doc.bitsPerChannel=BitsPerChannelType.EIGHT;}doc.saveAs(new File(OUTDIR+'/'+name+'.png'),new PNGSaveOptions(),true,Extension.LOWERCASE);}

var CASES=[]; function add(c){CASES.push(c);}
if(BATCH==='a'){
    // newly accepted: all 28 group modes at 100/100 (ring for non-PT/Normal), with backdrop
    var GM=['PASSTHROUGH']; for(var k in SM){if(SM.hasOwnProperty(k))GM.push(k);}
    for(var g=0;g<GM.length;g++){add({name:'gmode-'+GM[g].toLowerCase(),groupMode:GM[g]});}
    // group opacity / fill
    var OPS=[1,50,99]; for(var o=0;o<OPS.length;o++){add({name:'gop-pt-'+OPS[o],groupOpacity:OPS[o]});add({name:'gop-nrm-'+OPS[o],groupMode:'NORMAL',groupOpacity:OPS[o]});}
    var FL=[0,50,99]; for(var f=0;f<FL.length;f++){add({name:'gfill-'+FL[f],groupFill:FL[f]});}
    add({name:'screen-op50',groupMode:'SCREEN',groupOpacity:50});
    add({name:'mult-op50',groupMode:'MULTIPLY',groupOpacity:50});
    add({name:'knock-shallow',groupMode:'NORMAL',groupFill:0,knockout:'shallow'});
    add({name:'knock-deep',groupMode:'NORMAL',groupFill:0,knockout:'deep'});
} else if(BATCH==='b'){
    // all 27 stroke modes; stroke opacity; round-2 fidelity set
    for(var k2 in SM){if(SM.hasOwnProperty(k2))add({name:'smode-'+k2.toLowerCase(),strokeMode:k2});}
    var SO=[1,50,99]; for(var s=0;s<SO.length;s++){add({name:'sop-'+SO[s],strokeOpacity:SO[s]});}
    add({name:'smode-screen-sop50',strokeMode:'SCREEN',strokeOpacity:50});
    add({name:'r2-child-multiply',childBlend:'MULTIPLY'});
    add({name:'r2-smartobject',childType:'smartobject'});
    add({name:'r2-rect',silhouette:'rect'});
    add({name:'r2-partial',silhouette:'partial'});
    add({name:'r2-size-0p5',size:0.5}); add({name:'r2-size-50',size:50}); add({name:'r2-size-4p5',size:4.5});
    add({name:'r2-two-children',second:true});
    add({name:'r2-cmyk16',mode:'cmyk',depth:16,backdrop:false});
    add({name:'r2-gray16',gray:true,depth:16,res:600,size:4.5,backdrop:false});
    add({name:'r2-nobackdrop-baseline',backdrop:false});
} else if(BATCH==='k'){
    add({name:'knock-shallow',groupMode:'NORMAL',groupFill:0,knockout:'shallow'});
    add({name:'knock-deep',groupMode:'NORMAL',groupFill:0,knockout:'deep'});
    add({name:'k-ctrl-pt',});
    add({name:'k-gop-pt-50',groupOpacity:50});
} else if(BATCH==='k2'){
    add({name:'t-gop-pt-99',groupOpacity:99}); add({name:'t-gop-pt-80',groupOpacity:80});
    add({name:'t-gop-pt-75',groupOpacity:75}); add({name:'t-gop-pt-74',groupOpacity:74});
    add({name:'t-gfill-99',groupFill:99}); add({name:'t-gfill-80',groupFill:80});
} else {
    add({name:'ref-inside',style:'InsF',refuse:true});
    add({name:'ref-center',style:'CtrF',refuse:true});
    add({name:'ref-gradient',paint:'GrFl',refuse:true});
    add({name:'ref-dropShadow',extra:'dropShadow',refuse:true});
    add({name:'ref-text-child',childType:'text',refuse:true});
}

var failure='',original=null,units=app.preferences.rulerUnits,dialogs=app.displayDialogs;
try{
    note('photoshop = '+app.version+' BATCH='+BATCH);
    try{original=app.activeDocument;}catch(e){}
    app.preferences.rulerUnits=Units.PIXELS; app.displayDialogs=DialogModes.NO;
    $.global.RastrokizerNoMain=true;
    try{$.evalFile(new File(FIXFILE));}finally{try{delete $.global.RastrokizerNoMain;}catch(e){}}
    var script=$.global.Rastrokizer; if(!script)throw new Error('fix did not load');
    note('cases='+CASES.length);
    for(var i=0;i<CASES.length;i++){
        var c=CASES[i]; note('== '+c.name);
        try{var lv=build(c,'live');savePng(lv.doc,c.name+'-live');}catch(e){note('  live ERR '+String(e).replace(/\s+/g,' ').substr(0,140)+(e.line?' L'+e.line:''));}finally{closeMine();}
        try{
            var b=build(c,'fixed');
            try{script.convert(b.doc,b.group);note('  converted'+(c.refuse?'  <-- UNEXPECTED':''));}
            catch(e){note('  refused: '+e.message+(c.refuse?'':'  <-- UNEXPECTED'));}
            describeTree(b.doc,b.doc.layers,'  ');
            savePng(b.doc,c.name+'-fixed');
        }catch(e){note('  fixed ERR '+String(e).replace(/\s+/g,' ').substr(0,140)+(e.line?' L'+e.line:''));}finally{closeMine();}
    }
}catch(e){failure=String(e);note('FATAL='+failure);}
finally{closeMine();try{delete $.global.Rastrokizer;}catch(e){}app.preferences.rulerUnits=units;app.displayDialogs=dialogs;if(original){try{app.activeDocument=original;}catch(e){}}}
var f=new File(OUTDIR+'/report.txt');f.encoding='UTF-8';f.open('w');f.write(LOG.join('\n')+'\n');f.close();
return 'wrote '+LOG.length+' lines'+(failure?' FATAL: '+failure:'');
})();
