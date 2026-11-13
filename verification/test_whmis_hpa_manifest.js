"use strict";
const assert=require("node:assert/strict");
const hpa=require("../data/canada/hpa_2023_source_map.json");
const catalog=require("./whmis_hazard_catalog.js");
let passed=0;
const check=(name,fn)=>{fn();passed++;console.log("PASS "+name)};
check("HPA source and versions are recorded",()=>{
 assert.equal(hpa.citations[0],"R.S.C. 1985, c. H-3");
 assert.equal(hpa.xmlMetadata.lastAmendedDate,"2023-01-14");
 assert.equal(hpa.fileSHA256.length,64);
});
check("all twenty active physical and twelve health classes extracted",()=>{
 const p=hpa.schedule2.physical.filter(x=>x.status==="active");
 const h=hpa.schedule2.health.filter(x=>x.status==="active");
 assert.equal(p.length,20);assert.equal(h.length,12);
 assert.equal(p.length+h.length,hpa.schedule2.counts.activeTotal);
});
check("physical Schedule 2 item 19 is repealed, not a hazard class",()=>{
 const n=hpa.schedule2.physical.find(x=>x.item===19);
 assert.equal(n.name,null);assert.equal(n.status,"repealed");
 assert.match(n.repealReference,/SOR\/2022-273/);
});
check("Chemicals under pressure and Canadian-specific classes preserved",()=>{
 const names=hpa.schedule2.physical.filter(x=>x.status==="active").map(x=>x.name);
 for(const x of ["Chemicals under pressure","Combustible dusts","Simple asphyxiants","Physical hazards not otherwise classified"]){
  assert.ok(names.includes(x),x);
 }
});
check("health classes include biohazardous infectious and HHNOC",()=>{
 const names=hpa.schedule2.health.map(x=>x.name);
 assert.ok(names.includes("Biohazardous infectious materials"));
 assert.ok(names.includes("Health hazards not otherwise classified"));
});
check("environmental hazard classes are not listed in Schedule 2",()=>{
 const names=[...hpa.schedule2.physical,...hpa.schedule2.health].map(x=>x.name).filter(Boolean).join(" ");
 assert.doesNotMatch(names,/aquatic environment|ozone layer/i);
 assert.equal(hpa.schedule2.notListedInSchedule2.length,2);
});
check("HPA section 12 and all five Schedule 1 exclusions remain separate",()=>{
 assert.equal(hpa.scopeExclusions.schedule1.length,5);
 assert.equal(hpa.scopeExclusions.section12Direct.length,4);
 assert.deepEqual(hpa.scopeExclusions.schedule1.map(x=>x.item),[1,2,3,4,5]);
 assert.ok(hpa.scopeExclusions.section12Direct.find(x=>x.section==="12(i)"));
});
check("scope warning prevents misrepresenting an exemption as safe",()=>{
 assert.match(hpa.scopeExclusions.interpretation,/do NOT prove.*non-hazardous/i);
 assert.ok(hpa.implementationRecommendations.some(x=>x.includes("out of scope from not classified")));
});
check("classes have unique stable IDs and ordering",()=>{
 const a=[...hpa.schedule2.physical,...hpa.schedule2.health];
 assert.equal(new Set(a.map(x=>x.code)).size,a.length);
 assert.equal(hpa.schedule2.physical.at(-1).item,21);
 assert.equal(hpa.schedule2.health.at(-1).item,12);
});
check("Runtime catalog lists all 32 HPA active classes with identical names",()=>{
 const expected=[...hpa.schedule2.physical,...hpa.schedule2.health].filter(x=>x.status==="active");
 assert.deepEqual(catalog.CATALOG.map(x=>x.name).sort(),expected.map(x=>x.name).sort());
 assert.equal(catalog.COUNTS.total,32);
});
check("Partial statuses match implemented screening families (13 of 32)",()=>{
 const partial=catalog.CATALOG.filter(x=>x.status==="partial").map(x=>x.name).sort();
 assert.deepEqual(partial,[
   "Acute toxicity","Skin corrosion/irritation","Serious eye damage/eye irritation",
   "Respiratory or skin sensitization","Germ cell mutagenicity","Carcinogenicity",
   "Reproductive toxicity","Specific target organ toxicity — single exposure",
   "Specific target organ toxicity — repeated exposure","Aspiration hazard",
   "Health hazards not otherwise classified","Chemicals under pressure","Flammable liquids"
 ].sort());
 assert.equal(catalog.COUNTS.partial,13);
 assert.equal(catalog.COUNTS.notImplemented,19);
});
check("No environmental or repealed class appears as active",()=>{
 assert.ok(!catalog.CATALOG.some(x=>x.name===null));
 assert.ok(!catalog.CATALOG.some(x=>/environment/i.test(x.name)));
 assert.ok(!catalog.CATALOG.some(x=>x.id==="HPA-S2-P19"));
});
console.log(passed+" HPA source manifest checks passed");
