import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
ChevronLeft,
ChevronRight,
Calendar as CalendarIcon,
CheckCircle,
Circle,
Book,
Briefcase,
Heart,
Dumbbell,
DollarSign,
Bell
} from 'lucide-react';

import {
format,
startOfMonth,
endOfMonth,
eachDayOfInterval,
isSameMonth,
isToday,
startOfWeek,
endOfWeek,
addMonths,
subMonths,
addDays,
parseISO
} from 'date-fns';

import * as api from '../lib/api';
import { useAuth } from '../contexts/AuthContextApi';
import WeeklyReview from './WeeklyReview';
import Journal from './Journal';


export default function CalendarView() {

const { user } = useAuth();
const [activeTab, setActiveTab] = useState<'calendar' | 'weekly-review' | 'journal'>('calendar');

const [currentDate,setCurrentDate]=useState(new Date());

const [selectedDate,setSelectedDate]=useState<Date|null>(null);

const [dayData,setDayData]=useState<any>({});

const [selectedDayDetails,setSelectedDayDetails]=useState<any>(null);

const [tasksData,setTasksData]=useState<any[]>([]);

const [remindersData,setRemindersData]=useState<any[]>([]);



useEffect(()=>{
if(user) loadMonthData();
},[user,currentDate]);


useEffect(()=>{
setSelectedDate(null);
setSelectedDayDetails(null);
},[currentDate]);



const getCategoryIcon=(cat:string)=>{

cat=(cat||"").toLowerCase();

if(cat.includes("study")) return <Book size={16}/>
if(cat.includes("work")) return <Briefcase size={16}/>
if(cat.includes("fitness")) return <Dumbbell size={16}/>
if(cat.includes("health")) return <Heart size={16}/>
if(cat.includes("finance")) return <DollarSign size={16}/>

return <Circle size={16}/>
}



const loadMonthData=async()=>{

if(!user)return;

try{

const start=startOfMonth(currentDate);

const end=endOfMonth(currentDate);

const startKey=format(start,'yyyy-MM-dd');

const endKey=format(end,'yyyy-MM-dd');


const [tasks,study,expenses,selfcare,reminders,reminderHistory]=await Promise.all([
api.getTasks(user.id),
api.getStudySessions(user.id),
api.getExpenses(user.id),
api.getSelfCareActivities(user.id),
api.getReminders(),
api.getReminderHistory()
]);


setTasksData(tasks||[]);
setRemindersData(reminders||[]);


const data:any={};


tasks?.forEach((t:any)=>{

const d=new Date(t.updatedAt || t.dueDate);

if(isNaN(d.getTime()))return;

const key=format(d,'yyyy-MM-dd');

if(key<startKey || key>endKey)return;


data[key]??={
completed:0,
pending:0,
tasks:[]
};


if(t.isCompleted)
data[key].completed++;
else
data[key].pending++;


data[key].tasks.push(t);

});



study?.forEach((s:any)=>{

const d=new Date(s.date);

if(isNaN(d.getTime()))return;

const key=format(d,'yyyy-MM-dd');

if(key<startKey || key>endKey)return;

data[key]??={};

data[key].study=(data[key].study||0)+s.durationMinutes;

});



expenses?.forEach((e:any)=>{

const d=new Date(e.date);

if(isNaN(d.getTime()))return;

const key=format(d,'yyyy-MM-dd');

if(key<startKey || key>endKey)return;

data[key]??={};

data[key].expenses=(data[key].expenses||0)+parseFloat(e.amount);

});


selfcare?.forEach((s:any)=>{

const d=new Date(s.date);

if(isNaN(d.getTime()))return;

const key=format(d,'yyyy-MM-dd');

if(key<startKey || key>endKey)return;

data[key]??={};

data[key].selfcare=(data[key].selfcare||0)+1;

});


reminderHistory?.forEach((log:any)=>{

const d=new Date(log.date||log.markedDoneAt);

if(isNaN(d.getTime()))return;

const key=format(d,'yyyy-MM-dd');

if(key<startKey || key>endKey)return;

data[key]??={};

data[key].reminders=(data[key].reminders||0)+1;

});


setDayData(data);

}
catch(err){
console.error(err);
}

};



const getDaysInMonth=()=>{

const start=startOfWeek(startOfMonth(currentDate));

const end=endOfWeek(endOfMonth(currentDate));

return eachDayOfInterval({start,end});

};



const calculateStreak=(task:any,day:Date)=>{

let count=0;

let check=day;

while(true){

const key=format(check,'yyyy-MM-dd');

const found=tasksData.some((t:any)=>{

if(!t.isCompleted)return false;

const d=new Date(t.updatedAt);

if(isNaN(d.getTime()))return false;

return format(d,'yyyy-MM-dd')===key &&
(
t.recurrenceId===task.recurrenceId ||
t.title===task.title
);

});

if(!found)break;

count++;

check=addDays(check,-1);

if(count>365)break;

}

return count;

};



const handleDayClick=(day:Date)=>{

setSelectedDate(day);

const key=format(day,'yyyy-MM-dd');

const base=dayData[key]||{};


const tasks=tasksData.filter((t:any)=>{

const d=new Date(t.updatedAt || t.dueDate);

if(isNaN(d.getTime()))return false;

return format(d,'yyyy-MM-dd')===key;

});


const taskStreaks=tasks.map((t:any)=>({
task:t,
streak:calculateStreak(t,day)
}));


setSelectedDayDetails({
...base,
tasks,
taskStreaks,
reminders:remindersData
});

};



const days=getDaysInMonth();



return(

<div className="p-6">

<h1 className="text-3xl font-bold mb-4 bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">Calendar & Review</h1>

{/* Tab switcher */}
<div className="flex gap-2 mb-6 bg-gray-100 p-1 rounded-2xl w-fit">
  {(['calendar', 'weekly-review', 'journal'] as const).map((tab) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      className={`px-5 py-2.5 rounded-xl font-semibold text-sm transition-all capitalize ${
        activeTab === tab ? 'bg-white text-emerald-700 shadow-md' : 'text-gray-500 hover:text-gray-800'
      }`}
    >
      {tab === 'weekly-review' ? 'Weekly Review' : tab.charAt(0).toUpperCase() + tab.slice(1)}
    </button>
  ))}
</div>

{activeTab === 'weekly-review' && <WeeklyReview />}
{activeTab === 'journal' && <Journal />}
{activeTab === 'calendar' && (
<div>

<motion.div
initial={{opacity:0,y:10}}
animate={{opacity:1,y:0}}
className="bg-white rounded-2xl shadow-lg p-6"
>


<div className="flex items-center justify-between mb-6">


<div className="flex items-center gap-2">

<CalendarIcon size={24}/>

<h2 className="text-xl font-semibold">

{format(currentDate,"MMMM yyyy")}

</h2>

</div>


<div className="flex gap-2">

<button
onClick={()=>setCurrentDate(subMonths(currentDate,1))}
className="p-2 rounded-lg hover:bg-gray-100"
>
<ChevronLeft/>
</button>


<button
onClick={()=>setCurrentDate(addMonths(currentDate,1))}
className="p-2 rounded-lg hover:bg-gray-100"
>
<ChevronRight/>
</button>

</div>

</div>



<div className="grid grid-cols-7 gap-2 mb-4">

{["Sun","Mon","Tue","Wed","Thu","Fri","Sat"].map(d=>(

<div key={d} className="text-center text-sm text-gray-500">

{d}

</div>

))}

</div>



<div className="grid grid-cols-7 gap-2">

{days.map(day=>{

const key=format(day,'yyyy-MM-dd');

const data=dayData[key]||{};

const selected=selectedDate &&
format(selectedDate,'yyyy-MM-dd')===key;


return(

<div
key={key}
onClick={()=>handleDayClick(day)}
className={`
p-2 rounded-lg cursor-pointer border
${!isSameMonth(day,currentDate)&&"opacity-40"}
${isToday(day)&&"border-blue-500"}
${selected&&"bg-blue-50"}
`}
>

<div className="text-sm">

{format(day,"d")}

</div>


<div className="flex items-center gap-1 mt-1 justify-center">


{Array(data.completed||0)
.fill(0)
.slice(0,5)
.map((_,i)=>(
<span key={i} className="inline-flex w-3 h-3 items-center justify-center text-white text-xs bg-emerald-500 border border-emerald-600">✓</span>
))}


{Array(data.pending||0)
.fill(0)
.slice(0,5)
.map((_,i)=>(
<span key={i} className="inline-flex w-3 h-3 items-center justify-center text-white text-xs bg-red-500 border border-red-600">✗</span>
))}

</div>


{data.expenses &&
<div className="text-xs text-center mt-1">

₹{data.expenses}

</div>
}

{data.reminders>0 &&
<div className="text-xs text-center mt-1 flex items-center justify-center gap-1">

<Bell size={12} className="text-blue-500"/>

<span className="text-blue-500 font-medium">{data.reminders}</span>

</div>
}

</div>

);

})}

</div>



</motion.div>



{selectedDayDetails && selectedDayDetails.tasks?.length>0 &&(

<motion.div
initial={{opacity:0,y:10}}
animate={{opacity:1,y:0}}
className="mt-6 bg-white rounded-2xl p-4 shadow-lg"
>

<h3 className="text-lg font-bold mb-3">

Tasks on {format(selectedDate!,"PPP")}

</h3>


<div className="space-y-2">

{selectedDayDetails.tasks.map((t:any)=>(

<div
key={t.id}
className="flex items-center gap-3 p-3 border rounded-lg"
>

{getCategoryIcon(t.category)}

<div className="flex-1">

<div className="font-semibold">

{t.title}

</div>

<div className="text-xs text-gray-500">

{t.category} • {t.priority}

</div>

</div>


<div className="flex items-center gap-2">

{t.isCompleted?

<CheckCircle className="text-green-500" size={18}/>

:

<Circle className="text-red-500" size={18}/>

}


</div>

</div>

))}

</div>

</motion.div>

)}


{selectedDayDetails && selectedDayDetails.reminders?.length>0 &&(

<motion.div
initial={{opacity:0,y:10}}
animate={{opacity:1,y:0}}
className="mt-6 bg-white rounded-2xl p-4 shadow-lg"
>

<h3 className="text-lg font-bold mb-3 flex items-center gap-2">

<Bell size={18} className="text-blue-500"/>

Reminders on {format(selectedDate!,"PPP")}

</h3>


<div className="space-y-2">

{selectedDayDetails.reminders.map((r:any)=>(

<div
key={r.id}
className="flex items-center gap-3 p-3 border rounded-lg border-blue-200 bg-blue-50"
>

<Bell size={16} className="text-blue-500"/>

<div className="flex-1">

<div className="font-semibold text-gray-900">

{remindersData.find((rem:any)=>rem.id === r.reminderId)?.title || 'Reminder'}

</div>

<div className="text-xs text-gray-500">

{remindersData.find((rem:any)=>rem.id === r.reminderId)?.time || 'Time not set'} • {r.markedDone?'✓ Completed':'Pending'}

</div>

</div>

</div>

))}

</div>

</motion.div>

)}


</div>

</div>
)}

</div>

);

}