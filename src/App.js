import { useState } from "react";
// TopMLMLeaders.com — Full App

const MEMBERS = [
  { id:1, name:"Rajnish Kumar", city:"Mumbai", area:"Andheri", pin:"400053", company:"Herbalife", role:"Diamond Leader", rating:4.8, reviews:124, phone:"private", wa:"919876500001", photo:"RK", color:"#7F77DD", desc:"15 years in MLM. Top recruiter India 2023. Team of 5000+.", social:{fb:true,ig:true,yt:true,li:true}, slug:"rajnish", flags:2, likes:310, bookmarks:87, joined:"Jan 2020", team:"5,000+", earnings:"₹2L+/mo", verified:true, plan:"elite",
    badges:["🏆 Diamond","⭐ Top Recruiter 2023","🌟 5000+ Team","💎 8 Year Leader"],
    gallery:["Team Training Mumbai","Award Ceremony 2023","Product Launch","Annual Convention"],
    events:[{title:"Free Training Webinar",date:"15 Jun 2026",time:"7:00 PM",mode:"Online",seats:50}],
    products:[{name:"Herbalife Shake",price:"₹2,800",cat:"Nutrition"},{name:"Formula 1 Pack",price:"₹4,500",cat:"Weight"}],
    teamMembers:[{name:"Suresh M",city:"Thane",role:"Gold"},{name:"Kavita R",city:"Pune",role:"Silver"}],
    slots:[
      {day:"Today",date:"3 Jun",slots:[{time:"6:00 PM",type:"📞 Call",booked:false},{time:"8:00 PM",type:"📞 Call",booked:false}]},
      {day:"Tomorrow",date:"4 Jun",slots:[{time:"5:00 PM",type:"💬 WA Video",booked:false},{time:"8:00 PM",type:"🤝 In-Person",booked:false}]},
    ]
  },
  { id:2, name:"Priya Sharma", city:"Delhi", area:"Dwarka", pin:"110075", company:"Amway", role:"Platinum Director", rating:4.5, reviews:89, phone:"+91-98100-00001", wa:"919810000001", photo:"PS", color:"#D4537E", desc:"Amway top seller Delhi NCR. Women empowerment advocate.", social:{fb:true,ig:true,yt:false,li:true}, slug:"priya-sharma", flags:0, likes:201, bookmarks:54, joined:"Mar 2018", team:"2,000+", earnings:"₹80K+/mo", verified:true, plan:"pro",
    badges:["💎 Platinum","👑 Women Leader","🏅 Top 10 India"],
    gallery:["Women Event","Award Night","Training Camp"],
    events:[{title:"Women Leaders Workshop",date:"18 Jun 2026",time:"10:00 AM",mode:"Dwarka Club",seats:30}],
    products:[{name:"Amway Nutrilite",price:"₹3,200",cat:"Nutrition"}],
    teamMembers:[{name:"Anjali T",city:"Gurgaon",role:"Gold"}],
    slots:[]
  },
  { id:3, name:"Sunita Verma", city:"Pune", area:"Kothrud", pin:"411038", company:"Modicare", role:"Star Director", rating:4.9, reviews:203, phone:"private", wa:"919552000003", photo:"SV", color:"#BA7517", desc:"Modicare No.1 Pune. Trainer & motivational speaker.", social:{fb:true,ig:true,yt:true,li:true}, slug:"sunita-verma", flags:0, likes:540, bookmarks:190, joined:"Aug 2017", team:"8,000+", earnings:"₹3L+/mo", verified:true, plan:"elite",
    badges:["⭐ Star Director","👑 Women of Year 2023","🏆 No.1 Pune"],
    gallery:["Star Director Award","Team of 8000","National Stage"],
    events:[{title:"Modicare Business Plan",date:"12 Jun 2026",time:"7:30 PM",mode:"Online Zoom",seats:100}],
    products:[{name:"Modicare Wellness Kit",price:"₹2,200",cat:"Wellness"}],
    teamMembers:[{name:"Vikram S",city:"Mumbai",role:"Gold"},{name:"Neha K",city:"Nashik",role:"Gold"}],
    slots:[
      {day:"Today",date:"3 Jun",slots:[{time:"7:00 PM",type:"💬 WA Video",booked:false},{time:"8:30 PM",type:"📞 Call",booked:false}]},
      {day:"Tomorrow",date:"4 Jun",slots:[{time:"6:00 PM",type:"🤝 In-Person",booked:false}]},
    ]
  },
  { id:4, name:"Ravi Mehta", city:"Bangalore", area:"Koramangala", pin:"560034", company:"Mi Lifestyle", role:"Crown Ambassador", rating:4.6, reviews:178, phone:"+91-98440-00004", wa:"919844000004", photo:"RM", color:"#185FA5", desc:"Crown Ambassador. Tech-savvy MLM trainer. South India head.", social:{fb:true,ig:true,yt:true,li:true}, slug:"ravi-mehta", flags:0, likes:423, bookmarks:145, joined:"Feb 2016", team:"12,000+", earnings:"₹5L+/mo", verified:true, plan:"elite",
    badges:["👑 Crown Ambassador","🚀 12000+ Team","💻 Digital Expert"],
    gallery:["Crown Ceremony","12000 Team","South India Convention"],
    events:[{title:"Digital MLM Masterclass",date:"10 Jun 2026",time:"8:00 PM",mode:"Online",seats:200}],
    products:[{name:"Mi Lifestyle Pack",price:"₹3,000",cat:"Lifestyle"}],
    teamMembers:[{name:"Kiran B",city:"Chennai",role:"Diamond"},{name:"Suresh N",city:"Hyderabad",role:"Gold"}],
    slots:[
      {day:"Today",date:"3 Jun",slots:[{time:"9:00 PM",type:"💬 WA Video",booked:false}]},
      {day:"Wed",date:"5 Jun",slots:[{time:"7:00 PM",type:"📞 Call",booked:false}]},
    ]
  },
];

const Star=({filled})=><svg width="13" height="13" viewBox="0 0 24 24" fill={filled?"#EF9F27":"none"} stroke="#EF9F27" strokeWidth="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>;
const Stars=({rating})=><span style={{display:"flex",gap:2,alignItems:"center"}}>{[1,2,3,4,5].map(i=><Star key={i} filled={i<=Math.round(rating)}/>)}</span>;

const Avatar=({initials,color,size=52})=>(
  <div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color}cc,${color}88)`,border:`2.5px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:size*0.32,color:"#fff",flexShrink:0,boxShadow:`0 4px 14px ${color}55`,position:"relative",overflow:"hidden"}}>
    <div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 30% 30%, rgba(255,255,255,0.25), transparent 60%)"}}/>
    <span style={{position:"relative",zIndex:1}}>{initials}</span>
  </div>
);

const Btn=({label,icon,count,color="var(--color-text-secondary)",onClick})=>(
  <button onClick={onClick} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",color,padding:"4px 5px",borderRadius:6}}>
    <span style={{fontSize:15}}>{icon}</span>
    {count!==undefined&&<span style={{fontSize:10}}>{count}</span>}
    {label&&<span style={{fontSize:10,color:"#888"}}>{label}</span>}
  </button>
);

function MemberCard({m,onView,onChat,setShareOpen}){
  const [bookmarked,setBookmarked]=useState(false);
  const [liked,setLiked]=useState(false);
  const [flagged,setFlagged]=useState(false);
  const availableSlots=m.slots.reduce((a,d)=>a+d.slots.filter(s=>!s.booked).length,0);
  return(
    <div style={{background:"#fff",border:`0.5px solid ${m.color}33`,borderRadius:16,overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:`0 2px 16px ${m.color}18`,marginBottom:16}}>
      {/* Cover */}
      <div style={{height:64,background:`linear-gradient(135deg,${m.color}33,${m.color}11)`,position:"relative"}}>
        <div style={{position:"absolute",top:10,right:10,display:"flex",gap:6}}>
          {m.plan==="elite"&&<span style={{fontSize:11,background:m.color,color:"#fff",borderRadius:20,padding:"2px 8px",fontWeight:700}}>🌟 Elite</span>}
          {m.plan==="pro"&&<span style={{fontSize:11,background:"#7F77DD",color:"#fff",borderRadius:20,padding:"2px 8px",fontWeight:700}}>💎 Pro</span>}
          {m.verified&&<span style={{fontSize:11,background:"#185FA5",color:"#fff",borderRadius:20,padding:"2px 8px",fontWeight:700}}>✓ Verified</span>}
        </div>
        {m.plan==="elite"&&availableSlots>0&&<div style={{position:"absolute",top:10,left:10,fontSize:11,background:"#1D9E75",color:"#fff",borderRadius:20,padding:"2px 8px",fontWeight:700}}>📅 {availableSlots} slots</div>}
      </div>
      {/* Avatar */}
      <div style={{padding:"0 14px",marginTop:-30,marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
        <Avatar initials={m.photo} color={m.color} size={60}/>
        <div style={{display:"flex",gap:6,paddingBottom:4}}>
          <div style={{fontSize:11,background:"#f5f5f5",border:`0.5px solid ${m.color}33`,borderRadius:20,padding:"3px 8px",color:m.color,fontWeight:600}}>👥 {m.team}</div>
          <div style={{fontSize:11,background:"#f0fdf4",border:"0.5px solid #1D9E7533",borderRadius:20,padding:"3px 8px",color:"#1D9E75",fontWeight:600}}>💰 {m.earnings}</div>
        </div>
      </div>
      {/* Info */}
      <div style={{padding:"0 14px 14px"}}>
        <div style={{display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",marginBottom:3}}>
          <span style={{fontWeight:800,fontSize:15}}>{m.name}</span>
          <span style={{fontSize:11,background:m.color+"18",color:m.color,borderRadius:20,padding:"2px 8px",fontWeight:700}}>{m.role}</span>
        </div>
        <div style={{fontSize:12,color:"#666",marginBottom:2}}>📍 {m.city} · {m.area} · {m.pin}</div>
        <div style={{fontSize:12,color:"#999",marginBottom:6}}>🏢 {m.company}</div>
        <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:8}}>
          <Stars rating={m.rating}/>
          <span style={{fontSize:11,color:"#666"}}>{m.rating} ({m.reviews} reviews)</span>
        </div>
        <p style={{fontSize:12,color:"#666",margin:"0 0 10px",lineHeight:1.55}}>{m.desc}</p>
        <div style={{fontSize:11,color:m.color,fontWeight:600,background:m.color+"10",borderRadius:20,padding:"3px 10px",display:"inline-block",marginBottom:10,border:`0.5px solid ${m.color}33`}}>🔗 topmlmleaders.com/{m.slug}</div>
        {/* Actions */}
        <div style={{display:"flex",justifyContent:"space-between",borderTop:`0.5px solid ${m.color}22`,paddingTop:10,marginBottom:10}}>
          <Btn icon="👍" count={liked?m.likes+1:m.likes} color={liked?"#7F77DD":undefined} onClick={()=>setLiked(!liked)}/>
          <Btn icon="🚩" count={m.flags+(flagged?1:0)} color={flagged?"#E24B4A":undefined} onClick={()=>setFlagged(!flagged)}/>
          <Btn icon="🔖" count={m.bookmarks+(bookmarked?1:0)} color={bookmarked?"#EF9F27":undefined} onClick={()=>setBookmarked(!bookmarked)}/>
          <Btn icon="📞" label="Call" color={m.phone==="private"?"#ccc":"#1D9E75"} onClick={()=>m.phone!=="private"&&window.open(`tel:${m.phone}`)}/>
          <Btn icon="💬" label="WA" color={m.wa?"#25D366":"#ccc"} onClick={()=>m.wa&&window.open(`https://wa.me/${m.wa}`)}/>
          <Btn icon="✉️" label="Chat" color="#185FA5" onClick={()=>onChat(m)}/>
          <Btn icon="↗" label="Share" color="#1D9E75" onClick={()=>setShareOpen(m)}/>
        </div>
        <button onClick={()=>onView(m)} style={{width:"100%",background:`linear-gradient(135deg,${m.color},${m.color}bb)`,border:"none",borderRadius:10,padding:"11px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer",boxShadow:`0 3px 10px ${m.color}44`}}>
          {m.plan==="elite"&&availableSlots>0?`📅 Book · View Website →`:"View Personal Website →"}
        </button>
      </div>
    </div>
  );
}

function ChatModal({m,onClose}){
  const [msg,setMsg]=useState("");
  const [msgs,setMsgs]=useState([{from:"them",text:`Hi! I'm ${m.name}. How can I help you?`}]);
  const send=()=>{
    if(!msg.trim())return;
    setMsgs(p=>[...p,{from:"me",text:msg}]);
    setTimeout(()=>setMsgs(p=>[...p,{from:"them",text:"Thanks! I'll connect with you soon."}]),800);
    setMsg("");
  };
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}}>
      <div style={{background:"#fff",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:480,maxHeight:"70vh",display:"flex",flexDirection:"column"}}>
        <div style={{padding:"14px 16px",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",gap:10}}>
          <Avatar initials={m.photo} color={m.color} size={36}/>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{m.name}</div><div style={{fontSize:11,color:"#1D9E75"}}>● Online</div></div>
          <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#888"}}>✕</button>
        </div>
        <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
          {msgs.map((m2,i)=>(
            <div key={i} style={{display:"flex",justifyContent:m2.from==="me"?"flex-end":"flex-start"}}>
              <div style={{background:m2.from==="me"?m.color+"22":"#f5f5f5",borderRadius:m2.from==="me"?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"8px 12px",maxWidth:"75%",fontSize:13}}>{m2.text}</div>
            </div>
          ))}
        </div>
        <div style={{padding:12,borderTop:"0.5px solid #eee",display:"flex",gap:8}}>
          <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Type a message..." style={{flex:1,fontSize:14,borderRadius:20,padding:"8px 14px",border:"1px solid #ddd",outline:"none"}}/>
          <button onClick={send} style={{background:m.color,color:"#fff",border:"none",borderRadius:20,padding:"8px 16px",fontWeight:700,cursor:"pointer"}}>Send</button>
        </div>
      </div>
    </div>
  );
}

function ShareSheet({m,onClose}){
  const url=`topmlmleaders.com/${m.slug}`;
  const full=`https://${url}`;
  const [copied,setCopied]=useState(false);
  const copy=()=>{navigator.clipboard?.writeText(full);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const opts=[
    {icon:"💬",label:"WhatsApp",color:"#25D366",action:()=>window.open(`https://wa.me/?text=${encodeURIComponent("Check my MLM profile: "+full)}`)},
    {icon:"📋",label:copied?"Copied!":"Copy Link",color:copied?"#1D9E75":"#666",action:copy},
  ];
  return(
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
      <div style={{background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,padding:"20px 20px 36px"}} onClick={e=>e.stopPropagation()}>
        <div style={{width:36,height:4,background:"#ddd",borderRadius:2,margin:"0 auto 16px"}}/>
        <div style={{fontWeight:700,fontSize:16,marginBottom:4}}>Share {m.name}'s Profile</div>
        <div style={{fontSize:13,color:m.color,fontWeight:600,marginBottom:16}}>topmlmleaders.com/{m.slug}</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
          {opts.map(o=>(
            <button key={o.label} onClick={o.action} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:"#f9f9f9",border:"0.5px solid #eee",borderRadius:12,padding:"14px 8px",cursor:"pointer"}}>
              <span style={{fontSize:24}}>{o.icon}</span>
              <span style={{fontSize:12,color:o.color,fontWeight:600}}>{o.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function App(){
  const [query,setQuery]=useState("");
  const [tab,setTab]=useState("directory");
  const [websiteView,setWebsiteView]=useState(null);
  const [chat,setChat]=useState(null);
  const [shareOpen,setShareOpen]=useState(null);

  const filtered=MEMBERS.filter(m=>{
    if(!query.trim())return true;
    const q=query.toLowerCase();
    return m.name.toLowerCase().includes(q)||m.city.toLowerCase().includes(q)||m.area.toLowerCase().includes(q)||m.pin.includes(q)||m.company.toLowerCase().includes(q)||m.role.toLowerCase().includes(q);
  });

  const tabs=[
    {id:"directory",label:"Directory",icon:"🔍"},
    {id:"leaderboard",label:"Top",icon:"🏆"},
    {id:"board",label:"Board",icon:"📋"},
    {id:"plans",label:"Plans",icon:"💎"},
    {id:"me",label:"Me",icon:"👤"},
  ];

  return(
    <div style={{maxWidth:680,margin:"0 auto",fontFamily:"system-ui,sans-serif",background:"#f8f8f8",minHeight:"100vh"}}>
      <div style={{padding:"16px 16px 0",background:"#fff",borderBottom:"0.5px solid #eee"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
          <div>
            <div style={{fontSize:20,fontWeight:800}}>🌐 TopMLMLeaders</div>
            <div style={{fontSize:11,color:"#999"}}>Find · Connect · Grow Worldwide</div>
          </div>
          <div style={{display:"flex",gap:8}}>
            <button style={{fontSize:12,background:"#EF9F2718",color:"#EF9F27",border:"0.5px solid #EF9F2744",borderRadius:20,padding:"6px 12px",cursor:"pointer",fontWeight:700}}>💎 Plans</button>
            <button style={{fontSize:12,background:"#7F77DD",color:"#fff",border:"none",borderRadius:20,padding:"7px 14px",cursor:"pointer",fontWeight:700}}>Login</button>
          </div>
        </div>
        {tab==="directory"&&(
          <>
            <div style={{position:"relative",marginBottom:6}}>
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, city, company, pin, role..." style={{width:"100%",fontSize:15,borderRadius:40,padding:"13px 56px 13px 20px",border:"2.5px solid #7F77DD",outline:"none",boxSizing:"border-box",boxShadow:"0 0 0 4px #7F77DD18"}}/>
              <button style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"#7F77DD",border:"none",borderRadius:24,padding:"6px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Search</button>
            </div>
            <div style={{fontSize:12,color:"#999",textAlign:"center",marginBottom:12}}>Try: "Mumbai" · "Amway" · "Diamond" · "400053"</div>
          </>
        )}
      </div>

      <div style={{padding:"16px 16px 90px"}}>
        {tab==="directory"&&filtered.map(m=>(
          <MemberCard key={m.id} m={m} onView={setWebsiteView} onChat={setChat} setShareOpen={setShareOpen}/>
        ))}
        {tab==="leaderboard"&&(
          <div>
            <div style={{fontWeight:800,fontSize:18,marginBottom:16}}>🏆 Top Leaders This Week</div>
            {[...MEMBERS].sort((a,b)=>b.likes-a.likes).map((m,idx)=>(
              <div key={m.id} style={{background:"#fff",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>
                <div style={{fontSize:idx<3?26:16,minWidth:32,textAlign:"center",fontWeight:700}}>{["🥇","🥈","🥉"][idx]||`#${idx+1}`}</div>
                <Avatar initials={m.photo} color={m.color} size={44}/>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:14}}>{m.name}</div>
                  <div style={{fontSize:12,color:"#999"}}>{m.role} · {m.city}</div>
                  <div style={{fontSize:12,color:"#1D9E75",fontWeight:600}}>{m.earnings}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontWeight:700,fontSize:20,color:m.color}}>{m.likes}</div>
                  <div style={{fontSize:11,color:"#999"}}>likes</div>
                </div>
              </div>
            ))}
          </div>
        )}
        {tab==="board"&&(
          <div>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
              <div style={{fontWeight:800,fontSize:18}}>Opportunity Board</div>
              <button style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:20,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Post</button>
            </div>
            {[
              {author:"Rajnish Kumar",photo:"RK",color:"#7F77DD",city:"Mumbai",company:"Herbalife",type:"Looking for team",desc:"Looking for 5 serious leaders in Mumbai/Thane.",urgent:true},
              {author:"Sunita Verma",photo:"SV",color:"#BA7517",city:"Pune",company:"Modicare",type:"Training offer",desc:"Free weekend training in Pune — 15 June.",urgent:false},
            ].map((o,i)=>(
              <div key={i} style={{background:"#fff",borderRadius:14,padding:16,marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>
                <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}>
                  <Avatar initials={o.photo} color={o.color} size={40}/>
                  <div style={{flex:1}}>
                    <div style={{display:"flex",justifyContent:"space-between"}}>
                      <span style={{fontWeight:700,fontSize:14}}>{o.author}</span>
                      {o.urgent&&<span style={{fontSize:11,background:"#E24B4A18",color:"#E24B4A",borderRadius:20,padding:"2px 8px"}}>Urgent</span>}
                    </div>
                    <div style={{fontSize:12,color:"#999"}}>{o.city} · {o.company}</div>
                  </div>
                </div>
                <div style={{fontSize:12,background:o.color+"14",color:o.color,borderRadius:20,padding:"3px 10px",display:"inline-block",marginBottom:8,fontWeight:600}}>{o.type}</div>
                <p style={{fontSize:13,color:"#666",margin:"0 0 12px",lineHeight:1.5}}>{o.desc}</p>
                <button style={{width:"100%",background:o.color,color:"#fff",border:"none",borderRadius:8,padding:"9px",fontSize:13,fontWeight:700,cursor:"pointer"}}>💬 Connect</button>
              </div>
            ))}
          </div>
        )}
        {tab==="plans"&&(
          <div>
            <div style={{fontWeight:800,fontSize:18,marginBottom:16}}>💎 Choose Your Plan</div>
            {[
              {name:"Free",price:"₹0/yr",color:"#888",features:["Basic profile","Search listing","Chat messaging"],locked:["Custom link","Verified badge","Booking slots"]},
              {name:"Pro",price:"₹1,499/yr",color:"#7F77DD",features:["Custom link /yourname","Verified badge","Gallery & products","Events listing","Income badge"],locked:["Booking slots","Top search boost"]},
              {name:"Elite ⭐",price:"₹3,999/yr",color:"#EF9F27",features:["Everything in Pro","Accept bookings","Available slots","Top 5 search boost","Team showcase"],locked:[]},
            ].map((p,i)=>(
              <div key={i} style={{background:"#fff",border:`${i===2?"2px":"0.5px"} solid ${i===2?p.color:"#eee"}`,borderRadius:16,padding:18,marginBottom:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <div style={{fontWeight:800,fontSize:17,color:p.color}}>{p.name}</div>
                  <div style={{fontWeight:700,fontSize:18,color:p.color}}>{p.price}</div>
                </div>
                {p.features.map(f=><div key={f} style={{display:"flex",gap:8,fontSize:13,marginBottom:6}}><span style={{color:"#1D9E75",fontWeight:700}}>✓</span>{f}</div>)}
                {p.locked.map(f=><div key={f} style={{display:"flex",gap:8,fontSize:13,marginBottom:6,opacity:0.4}}><span style={{color:"#E24B4A"}}>✗</span>{f}</div>)}
                <button style={{width:"100%",marginTop:12,background:i===0?"#f5f5f5":p.color,color:i===0?"#666":"#fff",border:"none",borderRadius:10,padding:"12px",fontWeight:700,fontSize:14,cursor:"pointer"}}>
                  {i===0?"Get Started Free":`Get ${p.name} →`}
                </button>
              </div>
            ))}
          </div>
        )}
        {tab==="me"&&(
          <div>
            <div style={{fontWeight:800,fontSize:20,marginBottom:16}}>My Dashboard</div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
              {[["Views","1,240"],["Messages","23"],["Bookings","5"]].map(([l,v])=>(
                <div key={l} style={{background:"#fff",borderRadius:10,padding:"12px",textAlign:"center",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
                  <div style={{fontSize:20,fontWeight:800}}>{v}</div>
                  <div style={{fontSize:11,color:"#999",marginTop:2}}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{background:"#fff",borderRadius:12,padding:"10px 14px",marginBottom:12,fontSize:13}}>
              🔗 <span style={{color:"#7F77DD",fontWeight:700}}>topmlmleaders.com/rajnish</span>
            </div>
            <div style={{background:"#7F77DD11",border:"1px solid #7F77DD33",borderRadius:12,padding:14}}>
              <div style={{fontWeight:700,color:"#7F77DD",marginBottom:6}}>🚀 Upgrade to Elite — ₹3,999/yr</div>
              <div style={{fontSize:13,color:"#666",lineHeight:1.6}}>Booking slots · Top search · All features</div>
              <button style={{marginTop:10,background:"#7F77DD",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontWeight:700,cursor:"pointer",fontSize:13}}>Upgrade Now</button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Nav */}
      <div style={{position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",width:"100%",maxWidth:680,background:"#fff",borderTop:"0.5px solid #eee",display:"flex",zIndex:100}}>
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 4px 14px",background:"none",border:"none",cursor:"pointer",color:tab===t.id?"#7F77DD":"#999"}}>
            <span style={{fontSize:18}}>{t.icon}</span>
            <span style={{fontSize:10,fontWeight:tab===t.id?700:400}}>{t.label}</span>
          </button>
        ))}
      </div>

      {chat&&<ChatModal m={chat} onClose={()=>setChat(null)}/>}
      {shareOpen&&<ShareSheet m={shareOpen} onClose={()=>setShareOpen(null)}/>}
    </div>
  );
}