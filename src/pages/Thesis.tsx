import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
Plus,
Trash2,
Settings,
Download,
Edit,
FileText
} from "lucide-react";
import * as api from "../lib/api";
import { useAuth } from "../contexts/AuthContextApi";

type Tab =
"Dashboard"|
"Protocol"|
"Patients"|
"Followups"|
"Documents"|
"Statistics"|
"Deadlines";

const STUDY_TYPES=[
"Randomized Trial",
"Observational",
"Prospective",
"Retrospective"
];

export default function Thesis(){

const {user}=useAuth();

if(!user) return null;

const [selectedTab,setSelectedTab]=useState<Tab>("Dashboard");

const [protocol,setProtocol]=useState<any>(null);
const [patients,setPatients]=useState<any[]>([]);
const [documents,setDocuments]=useState<any[]>([]);
const [deadlines,setDeadlines]=useState<any[]>([]);

const [statsData,setStatsData]=useState<any>(null);

const [followupsByPatient,setFollowupsByPatient]=useState<Record<string,any[]>>({});

const [showProtocolForm,setShowProtocolForm]=useState(false);

const [showAddPatient,setShowAddPatient]=useState(false);
const [editingPatient,setEditingPatient]=useState<any>(null);

const blankPatient={
patientId:"",
studyNumber:"",
groupName:"A",
recruitmentDate:new Date().toISOString(),
consentTaken:false,
inclusionCriteriaMet:false,
exclusionCriteriaMet:false,
proformaStatus:"Pending",
followupStatus:"Pending",
notes:""
};

const [patientForm,setPatientForm]=useState<any>(blankPatient);

const [showAddFollowup,setShowAddFollowup]=useState(false);

const [followupForm,setFollowupForm]=useState<any>({
patientId:"",
visitNumber:1,
visitDate:"",
status:"pending",
notes:""
});

const [showAddDeadline,setShowAddDeadline]=useState(false);
const [editingDeadline,setEditingDeadline]=useState<any>(null);

const [deadlineForm,setDeadlineForm]=useState<any>({
title:"",
date:"",
completed:false,
notes:""
});


useEffect(()=>{

loadAll()

},[])


useEffect(()=>{

if(selectedTab==="Followups" && patients.length){

loadFollowups()

}

if(selectedTab==="Statistics"){

api.getThesisStats(user.id)
.then(setStatsData)

}

},[selectedTab,patients])


const loadAll=async()=>{

const [p,pts,docs,dls]=await Promise.all([

api.getThesisProtocol(user.id),

api.getPatients(user.id),

api.getDocuments(user.id),

api.getDeadlines(user.id)

])

setProtocol(p||null)
setPatients(pts||[])
setDocuments(docs||[])
setDeadlines(dls||[])

}


const loadFollowups=async()=>{

const results=await Promise.all(

patients.map(async p=>{

const arr=await api.getFollowups(p.id)

return {id:p.id,arr:arr||[]}

})

)

const map:Record<string,any[]>={}

results.forEach(r=>map[r.id]=r.arr)

setFollowupsByPatient(map)

}



const saveProtocol=async(data:any)=>{

const payload={...data,userId:user.id}

if(protocol?.id)

await api.updateProtocol(protocol.id,payload)

else

await api.createProtocol(payload)

setShowProtocolForm(false)

loadAll()

}



const savePatient=async()=>{

const payload={...patientForm,userId:user.id}

if(editingPatient)

await api.updatePatient(editingPatient.id,payload)

else

await api.createPatient(payload)

setShowAddPatient(false)
setEditingPatient(null)
setPatientForm(blankPatient)

loadAll()

}


const deletePatient=async(id:string)=>{

if(!confirm("Delete patient?")) return

await api.deletePatient(id)

loadAll()

}


const exportPatients=async()=>{

const csv=await api.exportPatientsCsv(user.id)

const blob=new Blob([csv])

const url=URL.createObjectURL(blob)

const a=document.createElement("a")

a.href=url
a.download="patients.csv"

document.body.appendChild(a)
a.click()

a.remove()

URL.revokeObjectURL(url)

}



const saveFollowup=async()=>{

await api.createFollowup(followupForm)

setShowAddFollowup(false)

loadFollowups()

}



const saveDeadline=async()=>{

if(editingDeadline)

await api.updateDeadline(editingDeadline.id,deadlineForm)

else

await api.createDeadline(deadlineForm)

setShowAddDeadline(false)
setEditingDeadline(null)

loadAll()

}



const stats=useMemo(()=>{

const total=protocol?.totalSampleSize||0

const recruited=patients.length

const completedFollowups=Object.values(followupsByPatient)

.flat()

.filter((f:any)=>f.status==="completed").length

return{

total,
recruited,
completedFollowups

}

},[protocol,patients,followupsByPatient])



return(

<div className="space-y-6">

<div className="flex justify-between items-center">

<div>

<h1 className="text-3xl font-bold text-emerald-600">
Thesis Manager
</h1>

<p className="text-gray-500">
Residency Research System
</p>

</div>


<div className="flex gap-2 flex-wrap">

{["Dashboard","Protocol","Patients","Followups","Documents","Statistics","Deadlines"]

.map(t=>(

<button
key={t}
onClick={()=>setSelectedTab(t as Tab)}
className={`px-4 py-2 rounded-xl font-semibold ${
selectedTab===t
?"bg-emerald-500 text-white"
:"bg-gray-100"
}`}
>

{t}

</button>

))}

</div>

</div>



{/* DASHBOARD */}

{selectedTab==="Dashboard" &&(

<div className="grid md:grid-cols-3 gap-4">

<div className="bg-white p-6 shadow rounded-2xl">

<div>Total Sample</div>

<div className="text-3xl font-bold">

{stats.total}

</div>

</div>


<div className="bg-white p-6 shadow rounded-2xl">

<div>Recruited</div>

<div className="text-3xl font-bold">

{stats.recruited}

</div>

</div>


<div className="bg-white p-6 shadow rounded-2xl">

<div>Completed Followups</div>

<div className="text-3xl font-bold">

{stats.completedFollowups}

</div>

<button
onClick={exportPatients}
className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-xl flex gap-2 items-center"
>

<Download size={14}/>

Export CSV

</button>

</div>

</div>

)}



{/* PROTOCOL */}

{selectedTab==="Protocol" &&(

<div className="bg-white shadow p-6 rounded-2xl">

<button
onClick={()=>setShowProtocolForm(!showProtocolForm)}
className="mb-4 px-4 py-2 bg-emerald-500 text-white rounded-xl flex gap-2 items-center"
>

<Settings size={14}/>

Edit Protocol

</button>


<AnimatePresence>

{showProtocolForm&&(

<motion.form

initial={{opacity:0}}
animate={{opacity:1}}
exit={{opacity:0}}

onSubmit={e=>{

e.preventDefault()

const f=new FormData(e.currentTarget)

saveProtocol({

title:f.get("title"),
studyType:f.get("studyType"),
totalSampleSize:Number(f.get("totalSampleSize"))

})

}}

className="grid md:grid-cols-3 gap-3"

>


<input name="title" defaultValue={protocol?.title}
placeholder="Title"
className="border p-2 rounded-xl"/>


<select name="studyType"
defaultValue={protocol?.studyType}
className="border p-2 rounded-xl">

{STUDY_TYPES.map(s=>
<option key={s}>{s}</option>
)}

</select>


<input name="totalSampleSize"
type="number"
defaultValue={protocol?.totalSampleSize}
className="border p-2 rounded-xl"/>


<button className="bg-emerald-500 text-white rounded-xl py-2 col-span-3">

Save

</button>

</motion.form>

)}

</AnimatePresence>

</div>

)}



{/* PATIENTS */}

{selectedTab==="Patients"&&(

<div>

<div className="flex items-center justify-between mb-4">

<h2 className="text-xl font-bold">Patients</h2>

<div className="flex gap-2">

<motion.button
whileHover={{scale:1.03}}
onClick={()=>{
setShowAddPatient(true)
setEditingPatient(null)
setPatientForm(blankPatient)
}}
className="px-4 py-2 bg-emerald-500 text-white rounded-xl flex gap-2 items-center"
>

<Plus size={14}/>

Add Patient

</motion.button>

</div>

</div>


<div className="grid md:grid-cols-2 gap-4">

{patients.map(p=>(

<div key={p.id}
className="border rounded-xl p-4 shadow-sm">

<div className="flex justify-between">

<div>

<div className="font-bold">

{p.studyNumber||p.patientId}

</div>

<div className="text-sm text-gray-500">

Group {p.groupName}

</div>

</div>


<div className="flex gap-2">

<button onClick={()=>{

setEditingPatient(p)
setPatientForm(p)
setShowAddPatient(true)

}}>

<Edit size={16}/>

</button>


<button
onClick={()=>deletePatient(p.id)}
className="text-red-500">

<Trash2 size={16}/>

</button>

</div>

</div>

</div>

))}

</div>

</div>

)}



{/* FOLLOWUPS */}

{selectedTab==="Followups"&&(

<div className="space-y-4">

<motion.button
whileHover={{scale:1.03}}
onClick={()=>setShowAddFollowup(true)}
className="px-4 py-2 bg-emerald-500 text-white rounded-xl flex gap-2 items-center">

<Plus size={14}/>

Add Followup

</motion.button>


{patients.map(p=>(

<div key={p.id}
className="bg-white shadow rounded-2xl p-4">

<div className="font-bold mb-2">

{p.studyNumber||p.patientId}

</div>


{(followupsByPatient[p.id]||[]).map((f:any)=>(

<div key={f.id}
className="border-b py-2 text-sm">

Visit {f.visitNumber} — {f.status}

</div>

))}

</div>

))}

</div>

)}



{/* DOCUMENTS */}

{selectedTab==="Documents"&&(

<div className="grid md:grid-cols-3 gap-4">

{documents.map(d=>(

<div key={d.id}
className="bg-white shadow rounded-2xl p-4">

<FileText/>

<div>{d.name}</div>

</div>

))}

</div>

)}



{/* STATISTICS */}

{selectedTab==="Statistics"&&(

<div className="bg-white p-6 rounded-2xl shadow">

<div>Total Recruited: {statsData?.totalRecruited||0}</div>

<div>Dropout %: {statsData?.dropoutPercent||0}</div>

<div>Followup %: {statsData?.followupCompletionPercent||0}</div>

</div>

)}



{/* DEADLINES */}

{selectedTab==="Deadlines"&&(

<div className="space-y-4">

<motion.button
whileHover={{scale:1.03}}
onClick={()=>setShowAddDeadline(true)}
className="px-4 py-2 bg-emerald-500 text-white rounded-xl">

Add Deadline

</motion.button>


{deadlines.map(d=>(

<div key={d.id}
className="bg-white shadow rounded-xl p-4 flex justify-between">

<div>

<div className="font-bold">{d.title}</div>

<div>{d.date}</div>

</div>


<button
onClick={()=>{

setEditingDeadline(d)
setDeadlineForm(d)
setShowAddDeadline(true)

}}>

<Edit size={16}/>

</button>

</div>

))}

</div>

)}


</div>

)

}