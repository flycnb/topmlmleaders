// COPY ALL THIS CODE AND PASTE INTO src/App.js IN CODESPACES
// TopMLMLeaders.com — Final Complete Version

import { useState, useEffect, useMemo } from "react";
import { supabase } from "./lib/supabaseClient";
import { useFollow } from "./hooks/useFollow";
import { useChat } from "./hooks/useChat";
import { useNotifications } from "./hooks/useNotifications";
import { useAuth } from "./hooks/useAuth";

const HISTORY_HOME = { view: "home", tab: "directory" };
const SITE_URL = window.location.origin || process.env.REACT_APP_SITE_URL;

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isEmailFormatValid(raw) {
  const e = String(raw || "").trim();
  if (!e.includes("@") || !e.includes(".")) return false;
  const at = e.indexOf("@");
  if (at <= 0) return false;
  const local = e.slice(0, at);
  const domain = e.slice(at + 1);
  if (!local || !domain || !domain.includes(".")) return false;
  const lastDot = domain.lastIndexOf(".");
  return !(lastDot <= 0 || lastDot === domain.length - 1);
}

const MEMBERS = [
  { id:1, name:"Rajnish Kumar", city:"Mumbai", area:"Andheri", pin:"400053", country:"India", company:"Herbalife", role:"Diamond Leader", rating:4.8, reviews:124, phone:"private", wa:"919876500001", photo:"RK", color:"#7F77DD", desc:"15 years in MLM. Top recruiter India 2023. Team of 5000+. Specializes in health & wellness products.", social:{fb:true,ig:true,yt:true,li:true}, slug:"rajnish", flags:2, likes:310, bookmarks:87, joined:"Jan 2020", team:"5,000+", earnings:"₹2L+/mo", verified:true, plan:"elite", badges:["🏆 Diamond","⭐ Top Recruiter 2023","🌟 5000+ Team","💎 8 Year Leader"], gallery:["Team Training Mumbai","Award Ceremony 2023","Product Launch","Annual Convention"], events:[{title:"Free Training Webinar",date:"15 Jun 2026",time:"7:00 PM",mode:"Online",seats:50},{title:"Mumbai Meet & Greet",date:"22 Jun 2026",time:"5:00 PM",mode:"Andheri West",seats:20}], products:[{name:"Herbalife Shake",price:"₹2,800",cat:"Nutrition"},{name:"Formula 1 Pack",price:"₹4,500",cat:"Weight"},{name:"Aloe Vera Drink",price:"₹1,800",cat:"Wellness"}], teamMembers:[{name:"Suresh M",city:"Thane",role:"Gold"},{name:"Kavita R",city:"Pune",role:"Silver"},{name:"Deepak S",city:"Nashik",role:"Bronze"}], slots:[{day:"Today",date:"3 Jun",slots:[{time:"6:00 PM",type:"📞 Call",booked:false},{time:"8:00 PM",type:"📞 Call",booked:false}]},{day:"Tomorrow",date:"4 Jun",slots:[{time:"5:00 PM",type:"💬 WA Video",booked:false},{time:"8:00 PM",type:"🤝 In-Person",booked:false}]}] },
  { id:2, name:"Priya Sharma", city:"Delhi", area:"Dwarka", pin:"110075", country:"India", company:"Amway", role:"Platinum Director", rating:4.5, reviews:89, phone:"+91-98100-00001", wa:"919810000001", photo:"PS", color:"#D4537E", desc:"Amway top seller Delhi NCR. Women empowerment advocate. 10 years experience.", social:{fb:true,ig:true,yt:false,li:true}, slug:"priya-sharma", flags:0, likes:201, bookmarks:54, joined:"Mar 2018", team:"2,000+", earnings:"₹80K+/mo", verified:true, plan:"pro", badges:["💎 Platinum","👑 Women Leader","🏅 Top 10 India"], gallery:["Women Event","Award Night","Training Camp"], events:[{title:"Women Leaders Workshop",date:"18 Jun 2026",time:"10:00 AM",mode:"Dwarka Club",seats:30}], products:[{name:"Amway Nutrilite",price:"₹3,200",cat:"Nutrition"}], teamMembers:[{name:"Anjali T",city:"Gurgaon",role:"Gold"}], slots:[] },
  { id:3, name:"Sunita Verma", city:"Pune", area:"Kothrud", pin:"411038", country:"India", company:"Modicare", role:"Star Director", rating:4.9, reviews:203, phone:"private", wa:"919552000003", photo:"SV", color:"#BA7517", desc:"Modicare No.1 Pune. Trainer & motivational speaker. Women leader of the year 2023.", social:{fb:true,ig:true,yt:true,li:true}, slug:"sunita-verma", flags:0, likes:540, bookmarks:190, joined:"Aug 2017", team:"8,000+", earnings:"₹3L+/mo", verified:true, plan:"elite", badges:["⭐ Star Director","👑 Women of Year 2023","🏆 No.1 Pune"], gallery:["Star Director Award","Team of 8000","National Stage"], events:[{title:"Modicare Business Plan",date:"12 Jun 2026",time:"7:30 PM",mode:"Online Zoom",seats:100}], products:[{name:"Modicare Wellness Kit",price:"₹2,200",cat:"Wellness"}], teamMembers:[{name:"Vikram S",city:"Mumbai",role:"Gold"},{name:"Neha K",city:"Nashik",role:"Gold"}], slots:[{day:"Today",date:"3 Jun",slots:[{time:"7:00 PM",type:"💬 WA Video",booked:false},{time:"8:30 PM",type:"📞 Call",booked:false}]},{day:"Tomorrow",date:"4 Jun",slots:[{time:"6:00 PM",type:"🤝 In-Person",booked:false}]}] },
  { id:4, name:"Ravi Mehta", city:"Bangalore", area:"Koramangala", pin:"560034", country:"India", company:"Mi Lifestyle", role:"Crown Ambassador", rating:4.6, reviews:178, phone:"+91-98440-00004", wa:"919844000004", photo:"RM", color:"#185FA5", desc:"Crown Ambassador. Tech-savvy MLM trainer. South India head. Digital marketing expert.", social:{fb:true,ig:true,yt:true,li:true}, slug:"ravi-mehta", flags:0, likes:423, bookmarks:145, joined:"Feb 2016", team:"12,000+", earnings:"₹5L+/mo", verified:true, plan:"elite", badges:["👑 Crown Ambassador","🚀 12000+ Team","💻 Digital Expert"], gallery:["Crown Ceremony","12000 Team","Convention"], events:[{title:"Digital MLM Masterclass",date:"10 Jun 2026",time:"8:00 PM",mode:"Online",seats:200}], products:[{name:"Mi Lifestyle Pack",price:"₹3,000",cat:"Lifestyle"}], teamMembers:[{name:"Kiran B",city:"Chennai",role:"Diamond"},{name:"Suresh N",city:"Hyderabad",role:"Gold"}], slots:[{day:"Today",date:"3 Jun",slots:[{time:"9:00 PM",type:"💬 WA Video",booked:false}]},{day:"Wed",date:"5 Jun",slots:[{time:"7:00 PM",type:"📞 Call",booked:false}]}] },
  { id:5, name:"Amit Patel", city:"Ahmedabad", area:"Navrangpura", pin:"380009", country:"India", company:"Forever Living", role:"Senior Manager", rating:4.2, reviews:56, phone:"+91-97140-00002", wa:"919714000002", photo:"AP", color:"#1D9E75", desc:"Health & wellness leader. 8 yrs with Forever Living. Gujarat top performer.", social:{fb:true,ig:false,yt:true,li:false}, slug:"amit-patel", flags:1, likes:98, bookmarks:32, joined:"Jun 2019", team:"800+", earnings:"₹45K+/mo", verified:false, plan:"free", badges:["🌿 Senior Manager","🏆 Gujarat Top"], gallery:["Product Training","Team Photo"], events:[], products:[{name:"Aloe Vera Gel",price:"₹1,500",cat:"Health"}], teamMembers:[], slots:[] },
  { id:6, name:"Deepa Nair", city:"Chennai", area:"T. Nagar", pin:"600017", country:"India", company:"Vestige", role:"Director", rating:4.3, reviews:67, phone:"private", wa:"private", photo:"DN", color:"#993C1D", desc:"Vestige Director Tamil Nadu. 6 years. Bilingual trainer. South India women leader.", social:{fb:true,ig:false,yt:false,li:true}, slug:"deepa-nair", flags:1, likes:134, bookmarks:44, joined:"Oct 2021", team:"1,200+", earnings:"₹60K+/mo", verified:false, plan:"free", badges:["🌺 Director","🗣️ Bilingual Trainer"], gallery:["Tamil Nadu Team","Awards"], events:[], products:[], teamMembers:[], slots:[] },
];

const Star=({filled})=><svg width="13" height="13" viewBox="0 0 24 24" fill={filled?"#EF9F27":"none"} stroke="#EF9F27" strokeWidth="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg>;
const Stars=({rating})=><span style={{display:"flex",gap:2,alignItems:"center"}}>{[1,2,3,4,5].map(i=><Star key={i} filled={i<=Math.round(rating)}/>)}</span>;
const Avatar=({initials,color,size=52})=><div style={{width:size,height:size,borderRadius:"50%",background:`linear-gradient(135deg,${color}cc,${color}88)`,border:`2.5px solid ${color}`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,fontSize:size*0.32,color:"#fff",flexShrink:0,boxShadow:`0 4px 14px ${color}44`,position:"relative",overflow:"hidden"}}><div style={{position:"absolute",inset:0,background:"radial-gradient(circle at 30% 30%,rgba(255,255,255,0.25),transparent 60%)"}}/>  <span style={{position:"relative",zIndex:1}}>{initials}</span></div>;
const Btn=({label,icon,count,color="var(--color-text-secondary)",onClick})=><button onClick={onClick} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,background:"none",border:"none",cursor:"pointer",color,padding:"4px 5px",borderRadius:6}}><span style={{fontSize:15}}>{icon}</span>{count!==undefined&&<span style={{fontSize:10}}>{count}</span>}{label&&<span style={{fontSize:10,color:"#888"}}>{label}</span>}</button>;

function BookingModal({ m, currentUser, onClose, onBooked }) {
  const [selDay, setSelDay] = useState(0);
  const [selSlot, setSelSlot] = useState(null);
  const [name, setName] = useState("");
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [bookErr, setBookErr] = useState("");
  const day = m.slots?.[selDay];
  const goConfirm = async () => {
    setBookErr("");
    if (!name.trim() || !currentUser?.id || selSlot === null || !day?.slots?.[selSlot]) return;
    setSaving(true);
    const slot = day.slots[selSlot];
    const { error } = await supabase.from("bookings").insert({
      member_id: m.id,
      booker_id: currentUser.id,
      booker_name: name.trim(),
      slot_day: `${day.day} ${day.date}`,
      slot_time: slot.time,
      slot_type: slot.type || "",
      status: "pending",
    });
    setSaving(false);
    if (error) {
      setBookErr(error.message || "Could not save booking");
      return;
    }
    onBooked?.();
    setStep(3);
  };
  if (!m.slots?.length) {
    return (
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
        <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: 24 }} onClick={(e) => e.stopPropagation()}>
          <div style={{ fontWeight: 700, marginBottom: 8 }}>No slots available</div>
          <button type="button" onClick={onClose} style={{ width: "100%", padding: 12, borderRadius: 12, border: "1px solid #ddd", background: "#fff", cursor: "pointer" }}>Close</button>
        </div>
      </div>
    );
  }
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "flex-end", justifyContent: "center" }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: "20px 20px 0 0", width: "100%", maxWidth: 480, padding: "20px 20px max(36px, env(safe-area-inset-bottom))", maxHeight: "85vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ width: 36, height: 4, background: "#ddd", borderRadius: 2, margin: "0 auto 16px" }} />
        {!currentUser?.id && (
          <div style={{ fontSize: 13, color: "#E24B4A", marginBottom: 12, textAlign: "center" }}>Please log in to book a slot.</div>
        )}
        {step === 1 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 4 }}>Book with {m.name}</div>
            <div style={{ fontSize: 12, color: "#999", marginBottom: 16 }}>{m.role} · {m.company}</div>
            <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
              {m.slots.map((d, i) => (
                <button key={i} type="button" onClick={() => { setSelDay(i); setSelSlot(null); }} style={{ flex: 1, background: selDay === i ? m.color : "#f5f5f5", color: selDay === i ? "#fff" : "#666", border: "none", borderRadius: 10, padding: "8px 4px", cursor: "pointer", textAlign: "center" }}>
                  <div style={{ fontSize: 12, fontWeight: 700 }}>{d.day}</div>
                  <div style={{ fontSize: 11, opacity: 0.8 }}>{d.date}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {(day?.slots || []).map((s, i) => (
                <button key={i} type="button" onClick={() => !s.booked && setSelSlot(i)} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: s.booked ? "#f5f5f5" : selSlot === i ? m.color + "18" : "#f9f9f9", border: `1.5px solid ${s.booked ? "#eee" : selSlot === i ? m.color : "#eee"}`, borderRadius: 12, padding: "12px 16px", cursor: s.booked ? "not-allowed" : "pointer", opacity: s.booked ? 0.5 : 1 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <span style={{ fontSize: 18 }}>{s.booked ? "🔒" : selSlot === i ? "✅" : "🕐"}</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: selSlot === i ? m.color : "#333" }}>{s.time}</div>
                      <div style={{ fontSize: 12, color: "#666" }}>{s.type}</div>
                    </div>
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 600, color: s.booked ? "#E24B4A" : selSlot === i ? m.color : "#1D9E75" }}>{s.booked ? "Booked" : selSlot === i ? "Selected" : "Available"}</span>
                </button>
              ))}
            </div>
            <button type="button" onClick={() => selSlot !== null && currentUser?.id && setStep(2)} style={{ width: "100%", background: selSlot !== null && currentUser?.id ? m.color : "#ddd", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 15, cursor: selSlot !== null && currentUser?.id ? "pointer" : "not-allowed" }}>{selSlot !== null ? `Book ${day.slots[selSlot].time} →` : "Select a slot first"}</button>
          </>
        )}
        {step === 2 && (
          <>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Almost done! 🎉</div>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your Name" style={{ width: "100%", fontSize: 14, padding: "12px 14px", borderRadius: 10, border: `1.5px solid ${m.color}`, outline: "none", boxSizing: "border-box", marginBottom: 16 }} />
            {bookErr && <div style={{ fontSize: 12, color: "#E24B4A", marginBottom: 10, textAlign: "center" }}>{bookErr}</div>}
            <button type="button" disabled={saving || !name.trim() || !currentUser?.id} onClick={goConfirm} style={{ width: "100%", background: name.trim() && currentUser?.id ? m.color : "#ddd", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 15, cursor: name.trim() && currentUser?.id ? "pointer" : "not-allowed", opacity: saving ? 0.7 : 1 }}>{saving ? "Saving…" : "Confirm Booking"}</button>
          </>
        )}
        {step === 3 && (
          <div style={{ textAlign: "center", padding: "20px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>🎉</div>
            <div style={{ fontWeight: 800, fontSize: 20, marginBottom: 6 }}>Slot Confirmed!</div>
            <div style={{ fontSize: 14, color: "#666", marginBottom: 20 }}>{day.day} {day.slots[selSlot]?.time}</div>
            <button type="button" onClick={() => window.open(`https://wa.me/${m.wa}?text=${encodeURIComponent(`Hi ${m.name}! I booked your ${day.slots[selSlot]?.time} slot. My name is ${name}.`)}`)} style={{ width: "100%", background: "#25D366", color: "#fff", border: "none", borderRadius: 12, padding: "14px", fontWeight: 700, fontSize: 14, cursor: "pointer", marginBottom: 10 }}>💬 Message on WhatsApp</button>
            <button type="button" onClick={onClose} style={{ width: "100%", background: "none", border: "1px solid #ddd", borderRadius: 12, padding: "12px", fontWeight: 600, fontSize: 14, cursor: "pointer", color: "#666" }}>Done ✓</button>
          </div>
        )}
      </div>
    </div>
  );
}

function JoinForm({m,onClose}){
  const [step,setStep]=useState(1);
  const [form,setForm]=useState({name:"",phone:"",city:"",exp:""});
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",zIndex:2000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,padding:"24px 20px 36px"}} onClick={e=>e.stopPropagation()}>
      <div style={{width:36,height:4,background:"#ddd",borderRadius:2,margin:"0 auto 16px"}}/>
      {step<3?<>
        <div style={{fontWeight:700,fontSize:17,marginBottom:4}}>🎯 Join {m.name}'s Team</div>
        <div style={{fontSize:13,color:"#999",marginBottom:20}}>{m.company} · {m.city}</div>
        <div style={{display:"flex",gap:6,marginBottom:20}}>{[1,2].map(s=><div key={s} style={{flex:1,height:4,borderRadius:2,background:step>=s?m.color:"#eee"}}/>)}</div>
        {step===1&&<>
          <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Your Full Name *" style={{width:"100%",fontSize:14,padding:"12px 14px",borderRadius:10,border:"1.5px solid #ddd",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
          <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="WhatsApp Number *" style={{width:"100%",fontSize:14,padding:"12px 14px",borderRadius:10,border:"1.5px solid #ddd",outline:"none",boxSizing:"border-box",marginBottom:12}}/>
          <input value={form.city} onChange={e=>setForm({...form,city:e.target.value})} placeholder="Your City *" style={{width:"100%",fontSize:14,padding:"12px 14px",borderRadius:10,border:"1.5px solid #ddd",outline:"none",boxSizing:"border-box",marginBottom:20}}/>
          <button onClick={()=>form.name&&form.phone&&setStep(2)} style={{width:"100%",background:m.color,color:"#fff",border:"none",borderRadius:12,padding:"14px",fontWeight:700,fontSize:15,cursor:"pointer"}}>Next →</button>
        </>}
        {step===2&&<>
          {["No experience","1-2 years","3-5 years","5+ years"].map(exp=><button key={exp} onClick={()=>setForm({...form,exp})} style={{width:"100%",background:form.exp===exp?m.color+"18":"#f9f9f9",border:`1.5px solid ${form.exp===exp?m.color:"#eee"}`,borderRadius:10,padding:"12px",fontSize:13,cursor:"pointer",color:form.exp===exp?m.color:"#333",fontWeight:form.exp===exp?700:400,marginBottom:8,textAlign:"left"}}>{form.exp===exp?"✓ ":""}{exp}</button>)}
          <button onClick={()=>form.exp&&setStep(3)} style={{width:"100%",background:m.color,color:"#fff",border:"none",borderRadius:12,padding:"14px",fontWeight:700,fontSize:15,cursor:"pointer",marginTop:8}}>Submit</button>
        </>}
      </>:<div style={{textAlign:"center",padding:"20px 0"}}>
        <div style={{fontSize:48,marginBottom:12}}>🎉</div>
        <div style={{fontWeight:800,fontSize:20,marginBottom:8}}>Request Sent!</div>
        <button onClick={onClose} style={{background:m.color,color:"#fff",border:"none",borderRadius:12,padding:"12px 32px",fontWeight:700,fontSize:15,cursor:"pointer"}}>Done ✓</button>
      </div>}
    </div>
  </div>;
}

function PersonalWebsite({m,onHome,onChat,onToggleFollow,isFollowing,followLoading,onMemberUpdated,currentUser,onBooked}){
  const [tab,setTab]=useState("about");
  const [joinOpen,setJoinOpen]=useState(false);
  const [bookOpen,setBookOpen]=useState(false);
  const [userRating,setUserRating]=useState(0);
  const [rated,setRated]=useState(false);
  const [galleryIdx,setGalleryIdx]=useState(null);
  const [youtubeUrl,setYoutubeUrl]=useState(m.youtubeUrl||"");
  const [uploading,setUploading]=useState(false);
  const [savingVideo,setSavingVideo]=useState(false);
  const gc=["#7F77DD","#D4537E","#1D9E75","#BA7517","#185FA5"];
  const avail=m.slots.reduce((a,d)=>a+d.slots.filter(s=>!s.booked).length,0);
  const tabs=[{id:"about",label:"About"},{id:"posts",label:"Posts"},{id:"gallery",label:"Gallery"},{id:"products",label:"Products"},{id:"events",label:"Events"},{id:"team",label:"Team"},{id:"book",label:"Book"}];

  const extractYouTubeId=(url)=>{
    const u=(url||"").trim();
    const m1=u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&?/]+)/i);
    return m1?.[1] || "";
  };
  const youtubeId=extractYouTubeId(youtubeUrl);
  const canEditProfile = Boolean(currentUser?.id && m.ownerId && String(m.ownerId) === String(currentUser.id));

  const uploadAvatar=async(file)=>{
    if(!file||!canEditProfile) return;
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const fileName = `${m.id}-${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("avatars").upload(fileName, file, { upsert: true });
    if(upErr){ setUploading(false); return; }
    const { data } = supabase.storage.from("avatars").getPublicUrl(fileName);
    const avatarUrl = data?.publicUrl;
    const { error } = await supabase.from("members").update({ avatar_url: avatarUrl }).eq("id", m.id);
    if(!error && avatarUrl){
      onMemberUpdated?.({ ...m, avatarUrl });
    }
    setUploading(false);
  };

  const saveYoutube=async()=>{
    if(!canEditProfile) return;
    setSavingVideo(true);
    const { error } = await supabase.from("members").update({ youtube_url: youtubeUrl.trim() || null }).eq("id", m.id);
    if(!error){
      onMemberUpdated?.({ ...m, youtubeUrl: youtubeUrl.trim() });
    }
    setSavingVideo(false);
  };

  return <div style={{minHeight:"100vh",background:"#F7F8FC",fontFamily:"Inter,system-ui,sans-serif"}}>
    <div style={{background:`linear-gradient(135deg,${m.color}ee,${m.color}77)`,padding:"34px 22px 30px",boxShadow:"0 16px 34px rgba(18,22,33,0.18)"}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:20}}>
        <button type="button" onClick={onHome} style={{background:"rgba(255,255,255,0.24)",border:"1px solid rgba(255,255,255,0.35)",borderRadius:999,padding:"9px 18px",color:"#fff",fontSize:14,cursor:"pointer",fontWeight:700}}>← Home</button>
        <button onClick={()=>window.open(`https://wa.me/?text=${encodeURIComponent(`Check out ${m.name}'s MLM profile!\n${m.role} | ${m.company} | ${m.city}\n⭐${m.rating} | 👥${m.team} | 💰${m.earnings}\nhttps://topmlmleaders.com/${m.slug}`)}`)} style={{background:"rgba(255,255,255,0.24)",border:"1px solid rgba(255,255,255,0.35)",borderRadius:999,padding:"9px 18px",color:"#fff",fontSize:14,cursor:"pointer",fontWeight:700}}>↗ Share</button>
      </div>
      <div style={{textAlign:"center",position:"relative"}}>
        <div style={{width:118,height:118,margin:"0 auto",marginTop:8,position:"relative"}}>
          {m.avatarUrl?<img src={m.avatarUrl} alt={m.name} style={{width:118,height:118,borderRadius:"50%",objectFit:"cover",border:"4px solid #fff",boxShadow:"0 10px 22px rgba(0,0,0,0.24)"}}/>:<Avatar initials={m.photo} color="rgba(255,255,255,0.3)" size={118}/>}
          {currentUser?.id && m.ownerId && String(m.ownerId)===String(currentUser.id)&&<label style={{position:"absolute",right:0,bottom:0,width:30,height:30,borderRadius:"50%",background:"#fff",display:"grid",placeItems:"center",cursor:"pointer",boxShadow:"0 3px 10px rgba(0,0,0,0.2)"}}>📷
            <input type="file" accept="image/*" style={{display:"none"}} onChange={(e)=>uploadAvatar(e.target.files?.[0])}/>
          </label>}
        </div>
        {uploading&&<div style={{fontSize:12,color:"#fff",marginTop:8,fontWeight:600}}>Uploading photo...</div>}
        <div style={{color:"#fff",fontSize:30,fontWeight:900,marginTop:14,letterSpacing:"0.2px"}}>{m.name} {m.verified&&"✓"} {m.plan==="elite"&&"🌟"}</div>
        <div style={{color:"rgba(255,255,255,0.95)",fontSize:15,marginTop:4,fontWeight:600}}>{m.role} · {m.company}</div>
        <div style={{color:"rgba(255,255,255,0.82)",fontSize:13,marginTop:4}}>📍 {m.city}, {m.area} · {m.country}</div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"baseline",gap:8,marginTop:12}}><span style={{color:"#fff",fontWeight:900,fontSize:34}}>{(m.followerCount||0).toLocaleString()}</span><span style={{color:"rgba(255,255,255,0.92)",fontSize:13,fontWeight:700}}>Followers</span></div>
        <div style={{display:"flex",justifyContent:"center",alignItems:"center",gap:6,marginTop:6}}><Stars rating={m.rating}/><span style={{color:"rgba(255,255,255,0.9)",fontSize:12}}>{m.rating} ({m.reviews})</span></div>
        <div style={{display:"flex",gap:8,justifyContent:"center",marginTop:10,flexWrap:"wrap"}}>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 12px",fontSize:12,color:"#fff",border:"1px solid rgba(255,255,255,0.4)"}}>💰 {m.earnings}</div>
          <div style={{background:"rgba(255,255,255,0.2)",borderRadius:20,padding:"4px 12px",fontSize:12,color:"#fff",border:"1px solid rgba(255,255,255,0.4)"}}>👥 {m.team}</div>
          <div style={{background:"rgba(255,255,255,0.25)",borderRadius:20,padding:"4px 12px",fontSize:12,color:"#fff",fontWeight:700}}>👤 {(m.followerCount||0).toLocaleString()} followers</div>
          {m.plan==="elite"&&avail>0&&<div style={{background:"rgba(255,255,255,0.25)",borderRadius:20,padding:"4px 12px",fontSize:12,color:"#fff",fontWeight:600}}>📅 {avail} slots</div>}
        </div>
        <div style={{marginTop:10,display:"flex",justifyContent:"center"}}>
          <button
            type="button"
            onClick={()=>onToggleFollow?.(m)}
            disabled={followLoading}
            style={{background:isFollowing?"#fff":"#5D55C9",color:isFollowing?"#5D55C9":"#fff",border:isFollowing?"1px solid #fff":"none",borderRadius:999,padding:"12px 28px",fontWeight:800,fontSize:15,cursor:"pointer",boxShadow:isFollowing?"none":"0 8px 18px rgba(35,28,98,0.35)"}}
          >
            {isFollowing?"Following":"Follow"}
          </button>
        </div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.8)",marginTop:6}}>{(m.followerCount||0).toLocaleString()} people follow this leader</div>
        <div style={{fontSize:12,color:"rgba(255,255,255,0.7)",marginTop:8}}>🔗 topmlmleaders.com/{m.slug}</div>
      </div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,padding:"0 18px",marginTop:-18,marginBottom:18}}>
      {[["👥","Team",m.team],["📅","Since",m.joined],["💰","Earns",m.earnings]].map(([ic,l,v])=><div key={l} style={{background:"#fff",borderRadius:16,padding:"14px 10px",textAlign:"center",boxShadow:"0 8px 22px rgba(15,23,42,0.1)",border:"1px solid rgba(120,130,160,0.12)"}}><div style={{fontSize:18}}>{ic}</div><div style={{fontWeight:800,fontSize:14,color:m.color,marginTop:3}}>{v}</div><div style={{fontSize:12,color:"#8A8F9C",marginTop:2}}>{l}</div></div>)}
    </div>
    <div style={{padding:"0 16px",marginBottom:12}}>
      <div style={{display:"flex",gap:8,overflowX:"auto",paddingBottom:4}}>
        {m.badges.map(b=><div key={b} style={{flexShrink:0,background:m.color+"14",border:`1px solid ${m.color}33`,borderRadius:20,padding:"4px 12px",fontSize:11,color:m.color,fontWeight:600,whiteSpace:"nowrap"}}>{b}</div>)}
      </div>
    </div>
    <div style={{display:"flex",padding:"0 16px",marginBottom:16,borderBottom:"1px solid #E9EBF3",overflowX:"auto",position:"sticky",top:0,background:"rgba(247,248,252,0.92)",backdropFilter:"blur(8px)",zIndex:30}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flexShrink:0,background:"none",border:"none",borderBottom:tab===t.id?`3px solid ${m.color}`:"3px solid transparent",padding:"12px 12px",fontSize:13,fontWeight:tab===t.id?800:600,color:tab===t.id?m.color:"#8B90A0",cursor:"pointer"}}>{t.label}{t.id==="book"&&avail>0&&m.plan==="elite"&&<span style={{background:"#1D9E75",color:"#fff",borderRadius:10,fontSize:10,padding:"1px 5px",marginLeft:4}}>{avail}</span>}</button>)}
    </div>
    <div style={{padding:"0 18px 128px"}}>
      {tab==="about"&&<>
        <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}><div style={{fontWeight:700,fontSize:14,marginBottom:8,color:m.color}}>About Me</div><p style={{fontSize:14,color:"#555",lineHeight:1.7,margin:0}}>{m.desc}</p></div>
        <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}><div style={{fontWeight:700,fontSize:14,marginBottom:12,color:m.color}}>Contact</div>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}><span style={{fontSize:13,color:"#666"}}>📞 Phone</span>{m.phone==="private"?<span style={{fontSize:13,color:"#999"}}>🔒 Private</span>:<a href={`tel:${m.phone}`} style={{fontSize:13,color:"#1D9E75",textDecoration:"none",fontWeight:600}}>{m.phone}</a>}</div>
          <div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontSize:13,color:"#666"}}>💬 WhatsApp</span>{m.wa==="private"?<span style={{fontSize:13,color:"#999"}}>🔒 Private</span>:<a href={`https://wa.me/${m.wa}`} style={{fontSize:13,color:"#25D366",textDecoration:"none",fontWeight:600}}>Chat Now</a>}</div>
        </div>
        <div style={{background:"#fff",borderRadius:14,overflow:"hidden",marginBottom:14,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
          <div style={{padding:"12px 16px 8px",fontWeight:700,fontSize:14,color:m.color}}>My Video</div>
          <div style={{padding:"0 16px 14px"}}>
            {canEditProfile ? (
            <div style={{display:"flex",gap:8,marginBottom:10}}>
              <input value={youtubeUrl} onChange={(e)=>setYoutubeUrl(e.target.value)} placeholder="Paste YouTube URL" style={{flex:1,padding:"10px 12px",borderRadius:10,border:"1px solid #ddd",fontSize:13}}/>
              <button type="button" onClick={saveYoutube} disabled={savingVideo} style={{background:m.color,color:"#fff",border:"none",borderRadius:10,padding:"0 12px",fontWeight:700,fontSize:12,cursor:"pointer"}}>{savingVideo?"Saving":"Save"}</button>
            </div>
            ) : (
            <div style={{fontSize:12,color:"#888",marginBottom:10}}>{youtubeId ? "" : "No video on this profile yet."}</div>
            )}
            {youtubeId?<div style={{borderRadius:12,overflow:"hidden",border:"1px solid #eee"}}><iframe title="youtube-video" src={`https://www.youtube.com/embed/${youtubeId}`} style={{width:"100%",aspectRatio:"16/9",border:0}} allowFullScreen/></div>:<div style={{border:"1px dashed #d8d8d8",borderRadius:12,padding:"18px 12px",textAlign:"center",fontSize:12,color:"#888"}}>{canEditProfile ? "No video added yet. Add YouTube URL above." : "No video on this profile yet."}</div>}
          </div>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}><div style={{fontWeight:700,fontSize:14,marginBottom:12,color:m.color}}>Social Media</div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8}}>
            {m.social.fb&&<button style={{background:"#1877F218",color:"#1877F2",border:"0.5px solid #1877F244",borderRadius:10,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer"}}>📘 Facebook</button>}
            {m.social.ig&&<button style={{background:"#E1306C18",color:"#E1306C",border:"0.5px solid #E1306C44",borderRadius:10,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer"}}>📸 Instagram</button>}
            {m.social.yt&&<button style={{background:"#FF000018",color:"#FF0000",border:"0.5px solid #FF000044",borderRadius:10,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer"}}>▶ YouTube</button>}
            {m.social.li&&<button style={{background:"#0077B518",color:"#0077B5",border:"0.5px solid #0077B544",borderRadius:10,padding:"10px",fontSize:13,fontWeight:600,cursor:"pointer"}}>💼 LinkedIn</button>}
          </div>
        </div>
        <div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}><div style={{fontWeight:700,fontSize:14,marginBottom:10,color:m.color}}>Rate This Leader</div>
          <div style={{display:"flex",gap:8,marginBottom:12}}>{[1,2,3,4,5].map(i=><button key={i} onClick={()=>setUserRating(i)} style={{background:"none",border:"none",cursor:"pointer",padding:0}}><svg width="32" height="32" viewBox="0 0 24 24" fill={i<=userRating?"#EF9F27":"none"} stroke="#EF9F27" strokeWidth="2"><polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"/></svg></button>)}</div>
          {rated?<div style={{fontSize:13,color:"#1D9E75",fontWeight:600}}>✅ Thank you!</div>:<button onClick={()=>userRating>0&&setRated(true)} style={{background:m.color,color:"#fff",border:"none",borderRadius:8,padding:"8px 20px",fontWeight:600,cursor:"pointer",opacity:userRating>0?1:0.4}}>Submit</button>}
        </div>
      </>}
      {tab==="posts"&&<div style={{background:"#fff",borderRadius:14,padding:16,marginBottom:14,boxShadow:"0 1px 6px rgba(0,0,0,0.06)",fontSize:13,color:"#777"}}>Posts feed coming soon.</div>}
      {tab==="gallery"&&<>
        <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10}}>
          {m.gallery.map((g,i)=><div key={i} onClick={()=>setGalleryIdx(i)} style={{aspectRatio:"1",borderRadius:12,background:`linear-gradient(135deg,${gc[i%5]}33,${gc[i%5]}66)`,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:6,cursor:"pointer",padding:12,border:"0.5px solid #eee"}}>
            <span style={{fontSize:28}}>📸</span><div style={{fontSize:11,color:"#555",textAlign:"center",fontWeight:500}}>{g}</div>
          </div>)}
        </div>
        {galleryIdx!==null&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.9)",zIndex:2000,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setGalleryIdx(null)}>
          <div style={{width:"100%",maxWidth:400,aspectRatio:"1",background:`linear-gradient(135deg,${gc[galleryIdx%5]}44,${gc[galleryIdx%5]}88)`,borderRadius:16,display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:10}}>
            <span style={{fontSize:52}}>📸</span><div style={{color:"#fff",fontSize:15,fontWeight:600}}>{m.gallery[galleryIdx]}</div>
          </div>
        </div>}
      </>}
      {tab==="products"&&<div style={{display:"flex",flexDirection:"column",gap:10}}>
        {m.products.length>0?m.products.map((p,i)=><div key={i} style={{background:"#fff",borderRadius:12,padding:14,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}><div style={{width:44,height:44,borderRadius:10,background:m.color+"18",display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>📦</div><div><div style={{fontWeight:600,fontSize:14}}>{p.name}</div><div style={{fontSize:12,color:"#999"}}>{p.cat}</div></div></div>
          <div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:15,color:m.color}}>{p.price}</div><button style={{fontSize:11,background:m.color,color:"#fff",border:"none",borderRadius:6,padding:"4px 10px",cursor:"pointer",marginTop:4,fontWeight:600}}>Enquire</button></div>
        </div>):<div style={{textAlign:"center",padding:"30px",color:"#999"}}>No products listed yet</div>}
      </div>}
      {tab==="events"&&<div style={{display:"flex",flexDirection:"column",gap:12}}>
        {m.events.length>0?m.events.map((ev,i)=><div key={i} style={{background:"#fff",borderRadius:14,padding:16,border:`0.5px solid ${m.color}33`,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}><div style={{fontWeight:700,fontSize:15}}>{ev.title}</div><div style={{fontSize:11,background:"#1D9E7518",color:"#1D9E75",borderRadius:10,padding:"3px 8px",fontWeight:600}}>{ev.seats} seats</div></div>
          <div style={{fontSize:13,color:"#666",marginBottom:4}}>📅 {ev.date} · 🕐 {ev.time}</div>
          <div style={{fontSize:13,color:"#666",marginBottom:12}}>📍 {ev.mode}</div>
          <button style={{width:"100%",background:m.color,color:"#fff",border:"none",borderRadius:10,padding:"10px",fontWeight:700,fontSize:13,cursor:"pointer"}}>Register Now</button>
        </div>):<div style={{textAlign:"center",padding:"30px",color:"#999"}}>No upcoming events</div>}
      </div>}
      {tab==="team"&&<>
        <div style={{background:"#fff",borderRadius:12,padding:"10px 14px",marginBottom:12,fontSize:13,boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>Total team: <span style={{fontWeight:700,color:m.color}}>{m.team}</span></div>
        {m.teamMembers.length>0?m.teamMembers.map((t,i)=><div key={i} style={{background:"#fff",borderRadius:12,padding:"12px 14px",marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"center",boxShadow:"0 1px 6px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",gap:10,alignItems:"center"}}><div style={{width:36,height:36,borderRadius:"50%",background:m.color+"22",border:`1.5px solid ${m.color}44`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:m.color}}>{t.name.slice(0,2)}</div><div><div style={{fontWeight:600,fontSize:14}}>{t.name}</div><div style={{fontSize:12,color:"#999"}}>📍 {t.city}</div></div></div>
          <div style={{fontSize:12,background:m.color+"18",color:m.color,borderRadius:10,padding:"3px 10px",fontWeight:600}}>{t.role}</div>
        </div>):<div style={{textAlign:"center",padding:"30px",color:"#999"}}>No team members listed</div>}
      </>}
      {tab==="book"&&<>
        {m.plan==="elite"?<>
          <div style={{background:"#1D9E7514",border:"1px solid #1D9E7533",borderRadius:12,padding:"10px 14px",marginBottom:14,fontSize:13,color:"#1D9E75",fontWeight:600}}>✅ {m.name} accepts bookings · {avail} slots available</div>
          {m.slots.map((d,di)=><div key={di} style={{marginBottom:16}}>
            <div style={{fontWeight:700,fontSize:14,marginBottom:8}}>{d.day} · {d.date}</div>
            {d.slots.map((s,si)=><div key={si} style={{background:s.booked?"#f5f5f5":"#fff",border:`1.5px solid ${s.booked?"#eee":m.color+"44"}`,borderRadius:12,padding:"12px 16px",display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8,opacity:s.booked?0.5:1}}>
              <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:18}}>{s.booked?"🔒":"🟢"}</span><div><div style={{fontWeight:700,fontSize:14}}>{s.time}</div><div style={{fontSize:12,color:"#666"}}>{s.type}</div></div></div>
              {s.booked?<span style={{fontSize:12,color:"#E24B4A",fontWeight:600}}>Booked</span>:<button onClick={()=>setBookOpen(true)} style={{background:m.color,color:"#fff",border:"none",borderRadius:8,padding:"6px 14px",fontSize:13,fontWeight:700,cursor:"pointer"}}>Book</button>}
            </div>)}
          </div>)}
        </>:<div style={{textAlign:"center",padding:"30px 0"}}>
          <div style={{fontSize:40,marginBottom:12}}>🔒</div>
          <div style={{fontWeight:700,fontSize:17,marginBottom:8}}>Bookings not available</div>
          <div style={{fontSize:14,color:"#666",lineHeight:1.6}}>Elite plan feature only.</div>
        </div>}
      </>}
    </div>
    <div style={{position:"fixed",bottom:0,left:0,right:0,background:"rgba(255,255,255,0.96)",backdropFilter:"blur(12px)",borderTop:"1px solid #E6E8F0",padding:"12px 16px max(20px, calc(12px + env(safe-area-inset-bottom, 0px)))",display:"flex",gap:10,zIndex:100}}>
      <button onClick={()=>onChat(m)} style={{flex:1,background:"#EEF1F9",color:"#2E3342",border:"1px solid #DDE1EE",borderRadius:14,padding:"13px",fontWeight:700,fontSize:14,cursor:"pointer"}}>💬 Message</button>
      {m.plan==="elite"&&avail>0?<button onClick={()=>setBookOpen(true)} style={{flex:2,background:m.color,color:"#fff",border:"none",borderRadius:14,padding:"13px",fontWeight:800,fontSize:15,cursor:"pointer",boxShadow:"0 10px 24px rgba(52,59,120,0.28)"}}>📅 Book Appointment</button>:<button onClick={()=>setJoinOpen(true)} style={{flex:2,background:m.color,color:"#fff",border:"none",borderRadius:14,padding:"13px",fontWeight:800,fontSize:15,cursor:"pointer",boxShadow:"0 10px 24px rgba(52,59,120,0.28)"}}>🎯 Join My Team</button>}
    </div>
    {bookOpen&&<BookingModal m={m} currentUser={currentUser} onClose={()=>setBookOpen(false)} onBooked={onBooked}/>}
    {joinOpen&&<JoinForm m={m} onClose={()=>setJoinOpen(false)}/>}
  </div>;
}

function ChatModal({m,onClose,user}){
  const [msg,setMsg]=useState("");
  const { messages, sendMessage, peerMissing } = useChat(user, m);
  const send=async()=>{
    if(!msg.trim()||peerMissing)return;
    await sendMessage(msg);
    setMsg("");
  };
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.55)",zIndex:1000,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:"18px 18px 0 0",width:"100%",maxWidth:480,maxHeight:"70vh",display:"flex",flexDirection:"column"}} onClick={e=>e.stopPropagation()}>
      <div style={{padding:"14px 16px",borderBottom:"0.5px solid #eee",display:"flex",alignItems:"center",gap:10}}>
        <Avatar initials={m.photo} color={m.color} size={36}/>
        <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{m.name}</div><div style={{fontSize:11,color:"#1D9E75"}}>● Online</div></div>
        <button onClick={onClose} style={{background:"none",border:"none",cursor:"pointer",fontSize:20,color:"#888"}}>✕</button>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:14,display:"flex",flexDirection:"column",gap:10}}>
        {peerMissing&&<div style={{fontSize:12,color:"#E24B4A",textAlign:"center",padding:"8px",background:"#fff5f5",borderRadius:10}}>This profile is not linked to a login yet — chat is unavailable.</div>}
        {!peerMissing&&messages.length===0&&<div style={{fontSize:12,color:"#999",textAlign:"center",paddingTop:10}}>Start conversation with {m.name}</div>}
        {messages.map((m2)=><div key={m2.id} style={{display:"flex",justifyContent:String(m2.sender_id)===String(user?.id)?"flex-end":"flex-start"}}><div style={{background:String(m2.sender_id)===String(user?.id)?m.color+"22":"#f5f5f5",borderRadius:String(m2.sender_id)===String(user?.id)?"14px 14px 4px 14px":"14px 14px 14px 4px",padding:"8px 12px",maxWidth:"75%",fontSize:13}}><div>{m2.text}</div><div style={{fontSize:10,color:"#999",marginTop:3,textAlign:"right"}}>{new Date(m2.created_at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</div></div></div>)}
      </div>
      <div style={{padding:12,borderTop:"0.5px solid #eee",display:"flex",gap:8}}>
        <input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&!peerMissing&&send()} placeholder="Type a message..." disabled={peerMissing} style={{flex:1,fontSize:14,borderRadius:20,padding:"8px 14px",border:"1px solid #ddd",outline:"none",opacity:peerMissing?0.5:1}}/>
        <button type="button" onClick={send} disabled={!user||peerMissing} style={{background:m.color,color:"#fff",border:"none",borderRadius:20,padding:"8px 16px",fontWeight:700,cursor:"pointer",opacity:user&&!peerMissing?1:0.5}}>Send</button>
      </div>
    </div>
  </div>;
}

function AuthModal({ onClose, onSuccess }) {
  const [mode, setMode] = useState("login");
  const [phase, setPhase] = useState("auth");
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotErr, setForgotErr] = useState("");
  const [busy, setBusy] = useState(false);

  const switchMode = (m) => {
    setMode(m);
    setMsg("");
  };

  const openForgot = () => {
    setPhase("forgot");
    setForgotEmail(email.trim());
    setForgotMsg("");
    setForgotErr("");
    setMsg("");
  };

  const submitForgot = async () => {
    setForgotErr("");
    setForgotMsg("");
    if (!isEmailFormatValid(forgotEmail)) {
      setForgotErr("Please enter a valid email address");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: SITE_URL,
    });
    if (error) {
      setForgotErr(error.message || "Unable to send reset email");
      return;
    }
    setForgotMsg(`Reset instructions sent to ${forgotEmail.trim()}.`);
  };

  const upsertPublicUser = async (u, fallbackName) => {
    if (!u?.id) return;
    await supabase.from("users").upsert({
      id: u.id,
      name: fallbackName || u.user_metadata?.name || u.email?.split("@")[0] || "User",
      email: u.email || "",
      plan: "free",
    });
  };

  const handle = async () => {
    setMsg("");
    if (!email.trim() || !pass) {
      setMsg("Please fill all fields");
      return;
    }
    if (!isEmailFormatValid(email)) {
      setMsg("Please enter a valid email address");
      return;
    }
    if (pass.length < 6) {
      setMsg("Password must be at least 6 characters");
      return;
    }

    setBusy(true);
    try {
      if (mode === "signup") {
        if (!name.trim()) {
          setMsg("Please enter your full name");
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password: pass,
          options: { data: { name: name.trim() } },
        });
        if (error) {
          setMsg(error.message || "Signup failed");
          return;
        }
        if (data?.user) {
          await upsertPublicUser(data.user, name.trim());
        }
        if (!data?.session) {
          setMsg("Signup successful. Check your email to confirm your account.");
          return;
        }
        onSuccess?.();
        onClose();
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: pass,
      });
      if (error) {
        if ((error.message || "").toLowerCase().includes("invalid login credentials")) {
          setMsg("Incorrect password");
        } else {
          setMsg(error.message || "Login failed");
        }
        return;
      }
      if (data?.user) {
        await upsertPublicUser(data.user);
      }
      onSuccess?.();
      onClose();
    } finally {
      setBusy(false);
    }
  };

  const loginWithGoogle = async () => {
    setBusy(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: SITE_URL },
    });
    if (error) {
      setMsg(error.message || "Google login failed");
      setBusy(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 18, width: "100%", maxWidth: 380, padding: 24, maxHeight: "88vh", overflowY: "auto", boxSizing:"border-box" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: "#7F77DD" }}>🌐 TopMLMLeaders</div>
          <div style={{ fontSize: 12, color: "#999", marginTop: 4 }}>Find · Connect · Grow Worldwide</div>
        </div>

        {phase === "forgot" ? (
          <>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 12 }}>Reset password</div>
            <input value={forgotEmail} onChange={(e)=>setForgotEmail(e.target.value)} placeholder="Email address" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" }}/>
            {forgotErr && <div style={{ fontSize: 13, color: "#E24B4A", marginBottom: 12, textAlign: "center" }}>{forgotErr}</div>}
            {forgotMsg && <div style={{ fontSize: 13, color: "#1D9E75", marginBottom: 12, textAlign: "center", fontWeight: 600 }}>{forgotMsg}</div>}
            <button type="button" onClick={submitForgot} style={{ width: "100%", background: "#7F77DD", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 10 }}>Send reset link →</button>
            <button type="button" onClick={()=>setPhase("auth")} style={{ width: "100%", background: "#fff", color: "#666", border: "1.5px solid #ddd", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>← Back to login</button>
          </>
        ) : (
          <>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {["login", "signup"].map((m) => (
                <button key={m} type="button" onClick={() => switchMode(m)} style={{ flex: 1, background: mode === m ? "#7F77DD" : "#f5f5f5", color: mode === m ? "#fff" : "#666", border: "none", borderRadius: 10, padding: "10px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>{m === "login" ? "Login" : "Sign Up"}</button>
              ))}
            </div>
            {mode === "signup" && <input value={name} onChange={(e)=>setName(e.target.value)} placeholder="Your Full Name" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" }} />}
            <input value={email} onChange={(e)=>setEmail(e.target.value)} placeholder="Email address" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, marginBottom: 12, boxSizing: "border-box", outline: "none" }} />
            <input value={pass} onChange={(e)=>setPass(e.target.value)} type="password" placeholder="Password (min. 6 characters)" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, marginBottom: mode === "login" ? 8 : 16, boxSizing: "border-box", outline: "none" }} />
            {mode === "login" && <button type="button" onClick={openForgot} style={{ display: "block", width: "100%", textAlign: "right", background: "none", border: "none", color: "#7F77DD", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 14, padding: 0 }}>Forgot Password?</button>}
            {msg && <div style={{ fontSize: 13, color: "#E24B4A", marginBottom: 12, textAlign: "center" }}>{msg}</div>}
            <button type="button" disabled={busy} onClick={handle} style={{ width: "100%", background: "#7F77DD", color: "#fff", border: "none", borderRadius: 10, padding: "13px", fontWeight: 700, fontSize: 15, cursor: "pointer", marginBottom: 12, opacity: busy ? 0.6 : 1 }}>{mode === "login" ? "Login →" : "Create Account →"}</button>
            <button type="button" onClick={loginWithGoogle} disabled={busy} style={{ width: "100%", background: "#fff", color: "#333", border: "1.5px solid #ddd", borderRadius: 10, padding: "12px", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>Continue with Google</button>
          </>
        )}
      </div>
    </div>
  );
}

function MemberDashboard({ user, myMemberProfile, membersData, notifications, onHome, onOpenChat, onBookingsChanged }) {
  const [tab, setTab] = useState("overview");
  const [conversationList, setConversationList] = useState([]);
  const [bookingsRows, setBookingsRows] = useState([]);
  const [stats, setStats] = useState({ followers: 0, chats: 0, bookings: 0 });

  const msgUnread = (notifications || []).filter((n) => !n.read && n.type === "message").length;

  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const loadConversations = async () => {
      const { data } = await supabase
        .from("conversations")
        .select("*")
        .or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`)
        .order("last_message_time", { ascending: false });
      if (active) setConversationList(data || []);
    };
    loadConversations();
    const channel = supabase
      .channel(`dashboard-conversations-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => loadConversations())
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id || !myMemberProfile?.id) return;
    let active = true;
    const mid = myMemberProfile.id;
    const load = async () => {
      const { count } = await supabase
        .from("bookings")
        .select("*", { count: "exact", head: true })
        .or(`member_id.eq.${mid},booker_id.eq.${user.id}`);
      const { data: conv } = await supabase.from("conversations").select("id").or(`member1_id.eq.${user.id},member2_id.eq.${user.id}`);
      if (!active) return;
      setStats({
        followers: myMemberProfile.followerCount || 0,
        chats: conv?.length || 0,
        bookings: count ?? 0,
      });
    };
    load();
    return () => {
      active = false;
    };
  }, [user?.id, myMemberProfile?.id, myMemberProfile?.followerCount, onBookingsChanged]);

  useEffect(() => {
    if (!user?.id || !myMemberProfile?.id) return;
    let active = true;
    const loadBook = async () => {
      const mid = myMemberProfile.id;
      const { data } = await supabase
        .from("bookings")
        .select("*")
        .or(`member_id.eq.${mid},booker_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (active) setBookingsRows(data || []);
    };
    loadBook();
    const ch = supabase
      .channel(`dashboard-bookings-${user.id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "bookings" }, () => loadBook())
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(ch);
    };
  }, [user?.id, myMemberProfile?.id, onBookingsChanged]);

  const resolvePeerMember = (otherAuthId) =>
    (membersData || []).find((x) => x.ownerId && String(x.ownerId) === String(otherAuthId));

  const activityItems = (notifications || []).slice(0, 8);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#f8f8f8", zIndex: 1500, overflowY: "auto", fontFamily: "system-ui,sans-serif" }}>
      <div style={{ maxWidth: 1000, margin: "0 auto", padding: "20px 16px max(80px, calc(16px + env(safe-area-inset-bottom, 0px)))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 20 }}>👤 My Dashboard</div>
          <button type="button" onClick={onHome} style={{ background: "none", border: "0.5px solid #ddd", borderRadius: 20, padding: "6px 16px", cursor: "pointer", fontSize: 13, color: "#666" }}>← Home</button>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(72px, 1fr))", gap: 12, marginBottom: 20 }}>
          {[
            ["👥", "Followers", stats.followers],
            ["💬", "Chats", stats.chats],
            ["📅", "Bookings", stats.bookings],
            ["🔔", "Alerts", (notifications || []).filter((n) => !n.read).length],
          ].map(([icon, label, val]) => (
            <div key={label} style={{ background: "#fff", borderRadius: 12, padding: "14px", textAlign: "center", boxShadow: "0 1px 8px rgba(0,0,0,0.06)", position: "relative" }}>
              {label === "Alerts" && (notifications || []).filter((n) => !n.read).length > 0 && (
                <div style={{ position: "absolute", top: 8, right: 8, background: "#E24B4A", color: "#fff", borderRadius: "50%", width: 18, height: 18, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                  {(notifications || []).filter((n) => !n.read).length}
                </div>
              )}
              <div style={{ fontSize: 22 }}>{icon}</div>
              <div style={{ fontWeight: 800, fontSize: 20, marginTop: 4 }}>{val}</div>
              <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto" }}>
          {[
            ["overview", "Overview"],
            ["profile", "Profile"],
            ["bookings", "Bookings"],
            ["messages", `Messages${msgUnread > 0 ? ` (${msgUnread})` : ""}`],
            ["bookmarks", "Bookmarks"],
            ["refer", "Refer & Earn"],
          ].map(([id, label]) => (
            <button key={id} type="button" onClick={() => setTab(id)} style={{ flexShrink: 0, background: tab === id ? "#7F77DD" : "#fff", color: tab === id ? "#fff" : "#666", border: "0.5px solid #ddd", borderRadius: 20, padding: "7px 16px", fontSize: 13, fontWeight: tab === id ? 700 : 400, cursor: "pointer" }}>
              {label}
            </button>
          ))}
        </div>
        {tab === "overview" && (
          <div>
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, marginBottom: 14, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", gap: 16, alignItems: "center", marginBottom: 16 }}>
                <Avatar initials={user.name.slice(0, 2).toUpperCase()} color="#7F77DD" size={70} />
                <div>
                  <div style={{ fontWeight: 800, fontSize: 18 }}>{user.name}</div>
                  <div style={{ fontSize: 13, color: "#666" }}>{user.email}</div>
                  <div style={{ fontSize: 12, background: "#7F77DD18", color: "#7F77DD", borderRadius: 20, padding: "2px 10px", display: "inline-block", marginTop: 6, fontWeight: 600 }}>{(myMemberProfile?.plan || user.plan || "free").replace(/^\w/, (c) => c.toUpperCase())} plan</div>
                </div>
              </div>
              <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "10px 14px", fontSize: 13 }}>
                🔗{" "}
                <span style={{ color: "#7F77DD", fontWeight: 700 }}>
                  topmlmleaders.com/{myMemberProfile?.slug || "your-profile"}
                </span>
              </div>
            </div>
            <div style={{ background: "#7F77DD11", border: "1px solid #7F77DD33", borderRadius: 12, padding: 16 }}>
              <div style={{ fontWeight: 700, color: "#7F77DD", marginBottom: 8 }}>🔔 Recent Activity</div>
              {activityItems.length === 0 && <div style={{ fontSize: 13, color: "#999" }}>No activity yet. Follows, messages, and bookings will show here.</div>}
              {activityItems.map((n, i) => (
                <div key={n.id || i} style={{ display: "flex", gap: 10, alignItems: "center", padding: "8px 0", borderBottom: i < activityItems.length - 1 ? "0.5px solid #7F77DD22" : "none" }}>
                  <span style={{ fontSize: 18 }}>{n.type === "follow" ? "👥" : n.type === "message" ? "💬" : n.type === "booking" ? "📅" : "🔔"}</span>
                  <div style={{ flex: 1, fontSize: 13 }}>{n.text}</div>
                  <div style={{ fontSize: 11, color: "#999" }}>{n.created_at ? new Date(n.created_at).toLocaleString() : ""}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === "profile" && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 16 }}>Edit My Profile</div>
            {[
              ["Full Name", user.name],
              ["Company", myMemberProfile?.company || ""],
              ["Role", myMemberProfile?.role || ""],
              ["City", myMemberProfile?.city || ""],
              ["Country", myMemberProfile?.country || "India"],
              ["WhatsApp", myMemberProfile?.wa === "private" ? "" : myMemberProfile?.wa || ""],
              ["Earnings", myMemberProfile?.earnings || ""],
              ["Team Size", myMemberProfile?.team || ""],
            ].map(([label, val]) => (
              <div key={label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>{label}</div>
                <input defaultValue={val} placeholder={`Enter ${label}`} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1.5px solid #ddd", fontSize: 14, boxSizing: "border-box", outline: "none" }} />
              </div>
            ))}
            <button type="button" style={{ background: "#7F77DD", color: "#fff", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, cursor: "pointer", fontSize: 14 }}>
              Save Changes
            </button>
          </div>
        )}
        {tab === "bookings" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>📅 Bookings</div>
            {bookingsRows.length === 0 && <div style={{ textAlign: "center", padding: 40, color: "#999", fontSize: 14 }}>No bookings yet.</div>}
            {bookingsRows.map((b) => {
              const host = (membersData || []).find((x) => String(x.id) === String(b.member_id));
              const iAmHost = myMemberProfile && String(b.member_id) === String(myMemberProfile.id);
              const title = iAmHost ? (b.booker_name || "Someone") : host?.name || "Host";
              const sub = iAmHost ? `Incoming · ${b.slot_day || ""}` : `${host?.city || ""} · ${b.slot_day || ""}`;
              const wa = iAmHost ? undefined : host?.wa;
              const st = (b.status || "pending").toLowerCase();
              return (
                <div key={b.id} style={{ background: "#fff", borderRadius: 12, padding: 16, marginBottom: 10, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>{title}</div>
                    <div style={{ fontSize: 12, color: "#999" }}>{sub}</div>
                    <div style={{ fontSize: 12, color: "#666" }}>
                      {b.slot_time} {b.slot_type ? `· ${b.slot_type}` : ""}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <span style={{ fontSize: 12, background: st === "confirmed" ? "#1D9E7518" : "#EF9F2718", color: st === "confirmed" ? "#1D9E75" : "#EF9F27", borderRadius: 20, padding: "3px 10px", fontWeight: 600 }}>{st.charAt(0).toUpperCase() + st.slice(1)}</span>
                    {!iAmHost && wa && wa !== "private" && (
                      <button type="button" onClick={() => window.open(`https://wa.me/${wa}`)} style={{ background: "#25D366", color: "#fff", border: "none", borderRadius: 8, padding: "5px 12px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
                        💬 WA
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {tab === "messages" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>Conversations</div>
            {conversationList.length === 0 && <div style={{ fontSize: 13, color: "#999", marginBottom: 12 }}>No conversations yet. Message someone from their profile.</div>}
            {conversationList.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  const otherId = String(c.member1_id) === String(user.id) ? c.member2_id : c.member1_id;
                  const target = resolvePeerMember(otherId);
                  if (target) onOpenChat?.(target);
                }}
                style={{ width: "100%", textAlign: "left", background: "#fff", border: "0.5px solid #eee", borderRadius: 12, padding: 12, marginBottom: 8, cursor: "pointer" }}
              >
                <div style={{ fontSize: 13, fontWeight: 700 }}>{c.last_message || "Open chat"}</div>
                <div style={{ fontSize: 11, color: "#999", marginTop: 4 }}>{c.last_message_time ? new Date(c.last_message_time).toLocaleString() : ""}</div>
              </button>
            ))}
          </div>
        )}
        {tab === "bookmarks" && (
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 14 }}>🔖 Saved Profiles</div>
            <div style={{ textAlign: "center", padding: "40px", color: "#999", fontSize: 14 }}>Bookmarks sync is coming soon.<br />Use directory search for now.</div>
          </div>
        )}
        {tab === "refer" && (
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 8px rgba(0,0,0,0.06)" }}>
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>💰</div>
              <div style={{ fontWeight: 800, fontSize: 20 }}>Refer & Earn</div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(88px, 1fr))", gap: 10, marginBottom: 20 }}>
              {[
                ["—", "Per signup"],
                ["—", "Per Pro"],
                ["—", "This month"],
              ].map(([v, l]) => (
                <div key={l} style={{ background: "#7F77DD11", borderRadius: 12, padding: "14px 8px", textAlign: "center", border: "0.5px solid #7F77DD33" }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#7F77DD" }}>{v}</div>
                  <div style={{ fontSize: 11, color: "#999", marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
            <div style={{ background: "#f8f8f8", borderRadius: 10, padding: "12px 14px", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 11, color: "#999", marginBottom: 2 }}>Your referral link</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#7F77DD" }}>topmlmleaders.com/ref/{user.name.toLowerCase().replace(/\s+/g, "-")}</div>
              </div>
              <button type="button" onClick={() => navigator.clipboard?.writeText(`https://topmlmleaders.com/ref/${user.name.toLowerCase().replace(/\s+/g, "-")}`)} style={{ background: "#7F77DD", color: "#fff", border: "none", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Copy
              </button>
            </div>
            <button type="button" style={{ width: "100%", background: "#25D366", color: "#fff", border: "none", borderRadius: 10, padding: "12px", fontWeight: 700, fontSize: 14, cursor: "pointer" }}>💬 Share on WhatsApp</button>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminPanel({onHome,membersData}){
  const [tab,setTab]=useState("overview");
  const [members,setMembers]=useState(membersData||[]);

  useEffect(()=>{
    setMembers(membersData||[]);
  },[membersData]);
  return <div style={{position:"fixed",inset:0,background:"#0f172a",zIndex:1500,overflowY:"auto",fontFamily:"system-ui,sans-serif"}}>
    <div style={{maxWidth:1200,margin:"0 auto",padding:"20px 16px 80px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
        <div><div style={{fontWeight:800,fontSize:22,color:"#fff"}}>⚡ Admin Panel</div><div style={{fontSize:13,color:"#64748b"}}>TopMLMLeaders.com</div></div>
        <button type="button" onClick={onHome} style={{background:"#1e293b",border:"0.5px solid #334155",borderRadius:20,padding:"7px 16px",cursor:"pointer",fontSize:13,color:"#94a3b8"}}>← Home</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:24}}>
        {[["👥","Members",members.length,"#7F77DD"],["💰","Revenue","₹14,697","#1D9E75"],["📅","Bookings","23","#EF9F27"],["🚩","Flagged",members.filter(m=>m.flags>0).length,"#E24B4A"]].map(([icon,label,val,color])=><div key={label} style={{background:"#1e293b",borderRadius:12,padding:"16px",border:`0.5px solid ${color}33`}}>
          <div style={{fontSize:24}}>{icon}</div><div style={{fontWeight:800,fontSize:24,color,marginTop:6}}>{val}</div><div style={{fontSize:12,color:"#64748b",marginTop:2}}>{label}</div>
        </div>)}
      </div>
      <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
        {[["overview","Overview"],["members","Members"],["revenue","Revenue"],["flags","Flagged"],["broadcast","📣 Broadcast"]].map(([id,label])=><button key={id} onClick={()=>setTab(id)} style={{background:tab===id?"#7F77DD":"#1e293b",color:tab===id?"#fff":"#94a3b8",border:"0.5px solid #334155",borderRadius:20,padding:"7px 16px",fontSize:13,fontWeight:tab===id?700:400,cursor:"pointer"}}>{label}</button>)}
      </div>
      {tab==="overview"&&<div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:14}}>
        <div style={{background:"#1e293b",borderRadius:14,padding:20,border:"0.5px solid #334155"}}>
          <div style={{fontWeight:700,color:"#fff",marginBottom:14}}>📊 Plans</div>
          {[["Elite 🌟",members.filter(m=>m.plan==="elite").length,"#EF9F27"],["Pro 💎",members.filter(m=>m.plan==="pro").length,"#7F77DD"],["Free",members.filter(m=>m.plan==="free").length,"#64748b"]].map(([plan,count,color])=><div key={plan} style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <span style={{fontSize:13,color:"#94a3b8"}}>{plan}</span>
            <div style={{display:"flex",alignItems:"center",gap:8}}><div style={{width:80,height:6,background:"#334155",borderRadius:3}}><div style={{width:`${count/members.length*100}%`,height:"100%",background:color,borderRadius:3}}/></div><span style={{fontSize:13,color,fontWeight:700}}>{count}</span></div>
          </div>)}
        </div>
        <div style={{background:"#1e293b",borderRadius:14,padding:20,border:"0.5px solid #334155"}}>
          <div style={{fontWeight:700,color:"#fff",marginBottom:14}}>🌍 Top Cities</div>
          {["Mumbai","Delhi","Bangalore","Pune","Chennai","Ahmedabad"].map((city,i)=><div key={city} style={{display:"flex",justifyContent:"space-between",padding:"6px 0",borderBottom:"0.5px solid #334155"}}>
            <span style={{fontSize:13,color:"#94a3b8"}}>📍 {city}</span><span style={{fontSize:13,color:"#7F77DD",fontWeight:700}}>{6-i} members</span>
          </div>)}
        </div>
      </div>}
      {tab==="members"&&<div style={{background:"#1e293b",borderRadius:14,overflow:"hidden",border:"0.5px solid #334155"}}>
        <div style={{padding:"12px 16px",borderBottom:"0.5px solid #334155"}}><div style={{fontWeight:700,color:"#fff"}}>All Members ({members.length})</div></div>
        {members.map((m,i)=><div key={m.id} style={{display:"flex",alignItems:"center",gap:14,padding:"12px 16px",borderBottom:i<members.length-1?"0.5px solid #334155":"none"}}>
          <Avatar initials={m.photo} color={m.color} size={38}/>
          <div style={{flex:1}}><div style={{fontWeight:600,fontSize:14,color:"#fff"}}>{m.name}</div><div style={{fontSize:12,color:"#64748b"}}>{m.city}, {m.country} · {m.company}</div></div>
          <span style={{fontSize:11,background:m.plan==="elite"?"#EF9F2722":m.plan==="pro"?"#7F77DD22":"#33415522",color:m.plan==="elite"?"#EF9F27":m.plan==="pro"?"#7F77DD":"#64748b",borderRadius:20,padding:"3px 10px",fontWeight:600}}>{m.plan}</span>
          <div style={{display:"flex",gap:6}}>
            <button onClick={()=>setMembers(members.map(x=>x.id===m.id?{...x,verified:!x.verified}:x))} style={{background:m.verified?"#1D9E7522":"#33415522",color:m.verified?"#1D9E75":"#64748b",border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontWeight:600}}>{m.verified?"✓ Verified":"Verify"}</button>
            <button onClick={()=>setMembers(members.filter(x=>x.id!==m.id))} style={{background:"#E24B4A22",color:"#E24B4A",border:"none",borderRadius:8,padding:"5px 10px",fontSize:12,cursor:"pointer",fontWeight:600}}>Remove</button>
          </div>
        </div>)}
      </div>}
      {tab==="revenue"&&<div style={{background:"#1e293b",borderRadius:14,padding:20,border:"0.5px solid #334155"}}>
        <div style={{fontWeight:700,color:"#fff",marginBottom:20}}>💰 Revenue</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:12,marginBottom:20}}>
          {[["This Month","₹14,697","#1D9E75"],["Last Month","₹11,200","#7F77DD"],["Total","₹87,430","#EF9F27"]].map(([label,val,color])=><div key={label} style={{background:"#0f172a",borderRadius:10,padding:"16px",textAlign:"center"}}><div style={{fontWeight:800,fontSize:20,color}}>{val}</div><div style={{fontSize:12,color:"#64748b",marginTop:4}}>{label}</div></div>)}
        </div>
      </div>}
      {tab==="flags"&&<div>
        <div style={{fontWeight:700,color:"#fff",marginBottom:14}}>🚩 Flagged</div>
        {members.filter(m=>m.flags>0).map((m,i)=><div key={i} style={{background:"#1e293b",borderRadius:12,padding:16,marginBottom:10,border:"0.5px solid #E24B4A33",display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <div style={{display:"flex",gap:12,alignItems:"center"}}><Avatar initials={m.photo} color={m.color} size={44}/><div><div style={{fontWeight:700,color:"#fff"}}>{m.name}</div><div style={{fontSize:12,color:"#64748b"}}>{m.flags} flag{m.flags>1?"s":""}</div></div></div>
          <div style={{display:"flex",gap:8}}>
            <button style={{background:"#1D9E7522",color:"#1D9E75",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontWeight:600}}>Clear</button>
            <button style={{background:"#E24B4A22",color:"#E24B4A",border:"none",borderRadius:8,padding:"6px 12px",fontSize:12,cursor:"pointer",fontWeight:600}}>Suspend</button>
          </div>
        </div>)}
      </div>}
      {tab==="broadcast"&&<div style={{background:"#1e293b",borderRadius:14,padding:20,border:"0.5px solid #334155"}}>
        <div style={{fontWeight:700,color:"#fff",marginBottom:16}}>📣 Broadcast Message</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
          {[["Plan",["All","Free","Pro","Elite"]],["City",["All","Mumbai","Delhi","Bangalore"]],["Country",["All","India","USA","UK"]]].map(([label,opts])=><div key={label}>
            <div style={{fontSize:12,color:"#64748b",marginBottom:6}}>{label}</div>
            <select style={{width:"100%",background:"#0f172a",border:"0.5px solid #334155",borderRadius:8,padding:"8px 12px",color:"#fff",fontSize:13,outline:"none"}}>
              {opts.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>)}
        </div>
        <textarea placeholder="Type your message..." rows={4} style={{width:"100%",background:"#0f172a",border:"0.5px solid #334155",borderRadius:10,padding:"12px",color:"#fff",fontSize:14,outline:"none",boxSizing:"border-box",resize:"vertical",marginBottom:14}}/>
        <div style={{display:"flex",gap:10}}>
          <button style={{flex:1,background:"#7F77DD",color:"#fff",border:"none",borderRadius:10,padding:"12px",fontWeight:700,fontSize:14,cursor:"pointer"}}>📧 Send Email</button>
          <button style={{flex:1,background:"#25D366",color:"#fff",border:"none",borderRadius:10,padding:"12px",fontWeight:700,fontSize:14,cursor:"pointer"}}>💬 Send WhatsApp</button>
        </div>
      </div>}
    </div>
  </div>;
}

function MemberCard({m,onView,onChat,setShareOpen,onToggleFollow,isFollowing,followLoading}){
  const [bookmarked,setBookmarked]=useState(false);
  const [liked,setLiked]=useState(false);
  const [flagged,setFlagged]=useState(false);
  const avail=m.slots.reduce((a,d)=>a+d.slots.filter(s=>!s.booked).length,0);
  return <div style={{background:"#fff",border:`1px solid ${m.color}22`,borderRadius:18,overflow:"hidden",display:"flex",flexDirection:"column",boxShadow:`0 8px 22px ${m.color}1f`}}>
    <div style={{height:64,background:`linear-gradient(135deg,${m.color}44,${m.color}14)`,position:"relative"}}>
      <div style={{position:"absolute",top:8,right:8,display:"flex",gap:4}}>
        {m.plan==="elite"&&<span style={{fontSize:10,background:m.color,color:"#fff",borderRadius:20,padding:"2px 7px",fontWeight:700}}>🌟 Elite</span>}
        {m.plan==="pro"&&<span style={{fontSize:10,background:"#7F77DD",color:"#fff",borderRadius:20,padding:"2px 7px",fontWeight:700}}>💎 Pro</span>}
        {m.verified&&<span style={{fontSize:10,background:"#185FA5",color:"#fff",borderRadius:20,padding:"2px 7px",fontWeight:700}}>✓</span>}
      </div>
      {m.plan==="elite"&&avail>0&&<div style={{position:"absolute",top:8,left:8,fontSize:10,background:"#1D9E75",color:"#fff",borderRadius:20,padding:"2px 7px",fontWeight:700}}>📅 {avail} slots</div>}
    </div>
    <div style={{padding:"0 14px",marginTop:-28,marginBottom:10,display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
      <Avatar initials={m.photo} color={m.color} size={56}/>
      <div style={{display:"flex",gap:4,paddingBottom:2}}>
        <div style={{fontSize:10,background:"#eef2ff",border:`0.5px solid ${m.color}44`,borderRadius:20,padding:"2px 7px",color:m.color,fontWeight:700}}>👤 {m.followerCount||0}</div>
        <div style={{fontSize:10,background:"#f5f5f5",border:`0.5px solid ${m.color}33`,borderRadius:20,padding:"2px 7px",color:m.color,fontWeight:600}}>👥 {m.team}</div>
        <div style={{fontSize:10,background:"#f0fdf4",border:"0.5px solid #1D9E7533",borderRadius:20,padding:"2px 7px",color:"#1D9E75",fontWeight:600}}>💰 {m.earnings}</div>
      </div>
    </div>
    <div style={{padding:"0 14px 14px"}}>
      <div style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap",marginBottom:2}}>
        <span style={{fontWeight:800,fontSize:17,lineHeight:1.15}}>{m.name}</span>
        <span style={{fontSize:11,background:m.color+"18",color:m.color,borderRadius:20,padding:"2px 8px",fontWeight:700}}>{m.role}</span>
      </div>
      <div style={{fontSize:12,color:"#596273",marginBottom:2}}>📍 {m.city} · {m.country} · {m.pin}</div>
      <div style={{fontSize:12,color:"#8891A1",marginBottom:6}}>🏢 {m.company}</div>
      <div style={{display:"flex",alignItems:"center",gap:5,marginBottom:8}}><Stars rating={m.rating}/><span style={{fontSize:11,color:"#596273",fontWeight:600}}>{m.rating} ({m.reviews})</span></div>
      <p style={{fontSize:13,color:"#5C6678",margin:"0 0 8px",lineHeight:1.45,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{m.desc}</p>
      <div style={{fontSize:11,color:m.color,fontWeight:700,background:m.color+"10",borderRadius:20,padding:"3px 9px",display:"inline-block",marginBottom:10,border:`1px solid ${m.color}33`}}>🔗 topmlmleaders.com/{m.slug}</div>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
        <div style={{fontSize:12,color:"#5C6678"}}>{m.followerCount||0} people follow this leader</div>
        <button
          type="button"
          onClick={()=>onToggleFollow?.(m)}
          disabled={followLoading}
          style={{background:isFollowing?"#fff":"#7F77DD",color:isFollowing?"#7F77DD":"#fff",border:isFollowing?"1px solid #7F77DD":"none",borderRadius:999,padding:"6px 12px",fontWeight:800,fontSize:12,cursor:"pointer"}}
        >
          {isFollowing?"Following":"Follow"}
        </button>
      </div>
      <div style={{display:"flex",justifyContent:"space-between",borderTop:`0.5px solid ${m.color}22`,paddingTop:8,marginBottom:8}}>
        <Btn icon="👍" count={liked?m.likes+1:m.likes} color={liked?"#7F77DD":undefined} onClick={()=>setLiked(!liked)}/>
        <Btn icon="🚩" count={m.flags+(flagged?1:0)} color={flagged?"#E24B4A":undefined} onClick={()=>setFlagged(!flagged)}/>
        <Btn icon="🔖" count={m.bookmarks+(bookmarked?1:0)} color={bookmarked?"#EF9F27":undefined} onClick={()=>setBookmarked(!bookmarked)}/>
        <Btn icon="📞" label="Call" color={m.phone==="private"?"#ccc":"#1D9E75"} onClick={()=>m.phone!=="private"&&window.open(`tel:${m.phone}`)}/>
        <Btn icon="💬" label="WA" color={m.wa==="private"?"#ccc":"#25D366"} onClick={()=>m.wa!=="private"&&window.open(`https://wa.me/${m.wa}`)}/>
        <Btn icon="✉️" label="Chat" color="#185FA5" onClick={()=>onChat(m)}/>
        <Btn icon="↗" label="Share" color="#1D9E75" onClick={()=>setShareOpen(m)}/>
      </div>
      <button onClick={()=>onView(m)} style={{width:"100%",background:`linear-gradient(135deg,${m.color},${m.color}bb)`,border:"none",borderRadius:11,padding:"11px",color:"#fff",fontWeight:800,fontSize:13,cursor:"pointer",boxShadow:`0 6px 14px ${m.color}44`}}>
        {m.plan==="elite"&&avail>0?"📅 Book · View Website →":"View Personal Website →"}
      </button>
    </div>
  </div>;
}

function ShareSheet({m,onClose}){
  const full=`https://topmlmleaders.com/${m.slug}`;
  const [copied,setCopied]=useState(false);
  const copy=()=>{navigator.clipboard?.writeText(full);setCopied(true);setTimeout(()=>setCopied(false),2000);};
  const waMsg=`Check out *${m.name}*'s MLM profile! 👇\n\n*${m.name}* — ${m.role}\n🏢 ${m.company} | 📍 ${m.city}, ${m.country}\n⭐ ${m.rating}/5 | 👥 ${m.team} | 💰 ${m.earnings}\n\n${full}`;
  const opts=[
    {icon:"💬",label:"WhatsApp",color:"#25D366",action:()=>window.open(`https://wa.me/?text=${encodeURIComponent(waMsg)}`)},
    {icon:"✉️",label:"Email",color:"#185FA5",action:()=>window.open(`mailto:?subject=Check ${m.name} on TopMLMLeaders&body=${full}`)},
    {icon:"💼",label:"LinkedIn",color:"#0077B5",action:()=>window.open(`https://linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(full)}`)},
    {icon:"📘",label:"Facebook",color:"#1877F2",action:()=>window.open(`https://facebook.com/sharer/sharer.php?u=${encodeURIComponent(full)}`)},
    {icon:"🐦",label:"Twitter",color:"#333",action:()=>window.open(`https://twitter.com/intent/tweet?url=${encodeURIComponent(full)}`)},
    {icon:"📋",label:copied?"Copied!":"Copy Link",color:copied?"#1D9E75":"#666",action:copy},
  ];
  return <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.5)",zIndex:1100,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={onClose}>
    <div style={{background:"#fff",borderRadius:"20px 20px 0 0",width:"100%",maxWidth:480,padding:"20px 20px 36px"}} onClick={e=>e.stopPropagation()}>
      <div style={{width:36,height:4,background:"#ddd",borderRadius:2,margin:"0 auto 16px"}}/>
      <div style={{display:"flex",gap:12,alignItems:"center",marginBottom:16,background:"#f8f8f8",borderRadius:12,padding:12}}>
        <Avatar initials={m.photo} color={m.color} size={44}/>
        <div><div style={{fontWeight:700,fontSize:14}}>{m.name}</div><div style={{fontSize:12,color:"#666"}}>{m.role} · {m.company}</div><div style={{fontSize:11,color:m.color,fontWeight:600,marginTop:2}}>topmlmleaders.com/{m.slug}</div></div>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10}}>
        {opts.map(o=><button key={o.label} onClick={o.action} style={{display:"flex",flexDirection:"column",alignItems:"center",gap:6,background:"#f9f9f9",border:"0.5px solid #eee",borderRadius:12,padding:"14px 8px",cursor:"pointer"}}>
          <span style={{fontSize:24}}>{o.icon}</span><span style={{fontSize:12,color:o.color,fontWeight:600}}>{o.label}</span>
        </button>)}
      </div>
      <div style={{marginTop:12,fontSize:12,color:"#999",textAlign:"center"}}>💡 WhatsApp share includes your name, company & stats</div>
    </div>
  </div>;
}

function OnboardingModal({ user, onClose, onCreated }) {
  const [form, setForm] = useState({
    name: user?.name || "",
    city: "",
    company: "",
    role: "",
    wa: "",
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.city.trim() || !form.company.trim() || !form.role.trim()) {
      setMsg("Please fill all required fields");
      return;
    }
    setBusy(true);
    setMsg("");
    const slugBase = `${form.name}-${form.city}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
    const slug = `${slugBase}-${Math.random().toString(36).slice(2, 6)}`;
    const { error } = await supabase.from("members").insert({
      name: form.name.trim(),
      email: user?.email || "",
      owner_id: user?.id || null,
      city: form.city.trim(),
      country: "India",
      company: form.company.trim(),
      role: form.role.trim(),
      wa: form.wa.trim() || "private",
      phone: "private",
      photo_initials: form.name.trim().slice(0, 2).toUpperCase(),
      color: "#7F77DD",
      description: `${form.role.trim()} at ${form.company.trim()}.`,
      slug,
      plan: "free",
      verified: false,
      follower_count: 0,
      following_count: 0,
    });
    if (error) {
      setMsg(error.message || "Unable to create profile");
      setBusy(false);
      return;
    }
    onCreated?.();
    onClose?.();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 2200, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div style={{ width: "100%", maxWidth: 420, background: "#fff", borderRadius: 16, padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 4 }}>Create your MLM profile</div>
        <div style={{ fontSize: 12, color: "#777", marginBottom: 14 }}>Optional. You can complete this anytime.</div>
        <input value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="Full Name *" style={{width:"100%",padding:"10px 12px",marginBottom:10,borderRadius:10,border:"1px solid #ddd"}} />
        <input value={form.city} onChange={(e)=>setForm({...form,city:e.target.value})} placeholder="City *" style={{width:"100%",padding:"10px 12px",marginBottom:10,borderRadius:10,border:"1px solid #ddd"}} />
        <input value={form.company} onChange={(e)=>setForm({...form,company:e.target.value})} placeholder="Company *" style={{width:"100%",padding:"10px 12px",marginBottom:10,borderRadius:10,border:"1px solid #ddd"}} />
        <input value={form.role} onChange={(e)=>setForm({...form,role:e.target.value})} placeholder="Role *" style={{width:"100%",padding:"10px 12px",marginBottom:10,borderRadius:10,border:"1px solid #ddd"}} />
        <input value={form.wa} onChange={(e)=>setForm({...form,wa:e.target.value})} placeholder="WhatsApp Number" style={{width:"100%",padding:"10px 12px",marginBottom:10,borderRadius:10,border:"1px solid #ddd"}} />
        {msg && <div style={{fontSize:12,color:"#E24B4A",marginBottom:10}}>{msg}</div>}
        <button type="button" disabled={busy} onClick={save} style={{width:"100%",background:"#7F77DD",color:"#fff",border:"none",borderRadius:10,padding:"11px",fontWeight:700,cursor:"pointer",opacity:busy?0.6:1}}>Save Profile</button>
      </div>
    </div>
  );
}

export default function App(){
  const [query,setQuery]=useState("");
  const [tab,setTab]=useState("directory");
  const [profileView,setProfileView]=useState(null);
  const [chat,setChat]=useState(null);
  const [shareOpen,setShareOpen]=useState(null);
  const [showAuth,setShowAuth]=useState(false);
  const [showDashboard,setShowDashboard]=useState(false);
  const [showAdmin,setShowAdmin]=useState(false);
  const { user: authUser, loading: authLoading } = useAuth();
  const [currentUser,setCurrentUser]=useState(null);
  const [membersData,setMembersData]=useState(MEMBERS);
  const [membersReloadKey,setMembersReloadKey]=useState(0);
  const [showNotifications,setShowNotifications]=useState(false);
  const [showOnboarding,setShowOnboarding]=useState(false);
  const [myMemberProfile,setMyMemberProfile]=useState(null);
  const [bookingsVersion,setBookingsVersion]=useState(0);

  const activeUser = useMemo(() => {
    if (currentUser) return currentUser;
    if (!authUser) return null;
    return {
      id: authUser.id,
      name: authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User",
      email: authUser.email || "",
      plan: "free",
    };
  }, [currentUser, authUser]);
  const { isFollowing, toggleFollow, followingCount, loading: followLoading } = useFollow(activeUser, membersData, setMembersData);
  const { notifications, unreadCount: unreadNotifications, markAllRead } = useNotifications(activeUser);
  const unreadMessages = notifications.filter((n)=>!n.read && n.type==="message").length;

  useEffect(()=>{
    let mounted=true;
    const loadMembers=async()=>{
      const { data, error } = await supabase
        .from("members")
        .select("*")
        .order("follower_count", { ascending: false, nullsFirst: false });
      if (error || !mounted || !Array.isArray(data) || data.length===0) return;
      const mapped=data.map((m, idx)=>({
        id:m.id||idx+1,
        email:m.email||"",
        name:m.name||"Unknown",
        city:m.city||"",
        area:m.area||"",
        pin:m.pin||"",
        country:m.country||"",
        company:m.company||"",
        role:m.role||"",
        rating:Number(m.rating||0),
        reviews:0,
        phone:m.phone||"private",
        wa:m.wa||"private",
        photo:(m.photo_initials||"ML").slice(0,2).toUpperCase(),
        avatarUrl:m.avatar_url||"",
        youtubeUrl:m.youtube_url||"",
        color:m.color||"#7F77DD",
        desc:m.description||"",
        social:{fb:!!m.social_fb,ig:!!m.social_ig,yt:!!m.social_yt,li:!!m.social_li},
        slug:m.slug||`member-${idx+1}`,
        flags:0,
        likes:m.likes||0,
        bookmarks:0,
        joined:m.joined_date||"",
        team:m.team_size||"",
        earnings:m.earnings||"",
        verified:!!m.verified,
        plan:m.plan||"free",
        badges:Array.isArray(m.badges)?m.badges:[],
        gallery:[],
        events:[],
        products:[],
        teamMembers:[],
        slots:[],
        followerCount:m.follower_count||0,
        followingCount:m.following_count||0,
        ownerId:m.owner_id||null,
      }));
      setMembersData(mapped);
    };
    loadMembers();
    return ()=>{ mounted=false; };
  },[membersReloadKey]);

  useEffect(()=>{
    if (authLoading) return;
    if (!authUser) {
      setCurrentUser(null);
      return;
    }

    const hydrate = async () => {
      const fallbackName = authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User";
      await supabase.from("users").upsert({
        id: authUser.id,
        name: fallbackName,
        email: authUser.email || "",
        plan: "free",
      });
      const { data } = await supabase.from("users").select("id,name,email,plan").eq("id", authUser.id).single();
      setCurrentUser({
        id: authUser.id,
        name: data?.name || fallbackName,
        email: data?.email || authUser.email || "",
        plan: data?.plan || "free",
      });
    };

    hydrate();
  },[authUser, authLoading]);

  useEffect(()=>{
    if(!activeUser){
      setMyMemberProfile(null);
      setShowOnboarding(false);
      return;
    }
    const mine = membersData.find((m)=>normalizeEmail(m.email)===normalizeEmail(activeUser.email));
    setMyMemberProfile(mine||null);
  },[activeUser, membersData]);

  const goHome=()=>{
    setProfileView(null);
    setShowDashboard(false);
    setShowAdmin(false);
    setTab(HISTORY_HOME.tab);
    setChat(null);
    window.history.pushState(HISTORY_HOME,"","/");
  };

  const openProfile=m=>{
    setProfileView(m);
    window.history.pushState({view:"profile",memberId:m.id},"",`#/m/${m.slug}`);
  };

  const handleMemberUpdated = (updatedMember) => {
    if (!updatedMember?.id) return;
    setMembersData((prev) => prev.map((x) => (String(x.id) === String(updatedMember.id) ? { ...x, ...updatedMember } : x)));
    setProfileView((prev) => (prev && String(prev.id) === String(updatedMember.id) ? { ...prev, ...updatedMember } : prev));
  };

  const openDashboard=()=>{
    if(!activeUser){
      setShowAuth(true);
      return;
    }
    setShowDashboard(true);
    window.history.pushState({view:"dashboard"},"","/");
  };

  const openAdmin=()=>{
    setShowAdmin(true);
    window.history.pushState({view:"admin"},"","/");
  };

  const openChatForMember=(member)=>{
    if(!activeUser){
      setShowAuth(true);
      return;
    }
    setChat(member);
  };

  useEffect(()=>{
    const applyHistoryState=st=>{
      if(!st||st.view==="home"){
        setProfileView(null);
        setShowDashboard(false);
        setShowAdmin(false);
        setTab(st?.tab||"directory");
        setChat(null);
        return;
      }
      if(st.view==="profile"&&st.memberId!=null){
        const member=membersData.find(x=>x.id===st.memberId);
        setProfileView(member||null);
        setShowDashboard(false);
        setShowAdmin(false);
        setChat(null);
        return;
      }
      if(st.view==="dashboard"){
        setProfileView(null);
        setShowDashboard(true);
        setShowAdmin(false);
        setChat(null);
        return;
      }
      if(st.view==="admin"){
        setProfileView(null);
        setShowDashboard(false);
        setShowAdmin(true);
        setChat(null);
      }
    };

    const onPopState=e=>applyHistoryState(e.state);
    window.addEventListener("popstate",onPopState);


    const hash=window.location.hash;
    if(hash.startsWith("#/m/")){
      const slug=hash.slice(4);
      const member=membersData.find(x=>x.slug===slug);
      if(member){
        window.history.replaceState(HISTORY_HOME,"","/");
        window.history.pushState({view:"profile",memberId:member.id},"",hash);
        setProfileView(member);
      }
    }else if(!window.history.state||window.history.state.view==null){
      window.history.replaceState(HISTORY_HOME,"","/");
    }

    return()=>window.removeEventListener("popstate",onPopState);
  },[membersData]);

  const filtered=membersData.filter(m=>{
    if(!query.trim())return true;
    const q=query.toLowerCase();
    return m.name.toLowerCase().includes(q)||m.city.toLowerCase().includes(q)||m.area.toLowerCase().includes(q)||m.pin.includes(q)||m.company.toLowerCase().includes(q)||m.role.toLowerCase().includes(q)||m.country.toLowerCase().includes(q);
  });

  if(profileView)return <>
    <PersonalWebsite
      m={profileView}
      onHome={goHome}
      onChat={openChatForMember}
      onToggleFollow={toggleFollow}
      isFollowing={isFollowing(profileView.id)}
      followLoading={followLoading}
      onMemberUpdated={handleMemberUpdated}
      currentUser={activeUser}
      onBooked={() => setBookingsVersion((v) => v + 1)}
    />
    {chat&&<ChatModal m={chat} user={activeUser} onClose={()=>setChat(null)}/>}
  </>;

  const tabs=[{id:"directory",label:"Directory",icon:"🔍"},{id:"leaderboard",label:"Top",icon:"🏆"},{id:"board",label:"Board",icon:"📋"},{id:"plans",label:"Plans",icon:"💎"},{id:"me",label:"Me",icon:"👤"}];

  return <div style={{maxWidth:"100%",fontFamily:"system-ui,sans-serif",background:"#f8f8f8",minHeight:"100vh"}}>
    <div style={{background:"#fff",borderBottom:"0.5px solid #eee",padding:"12px 20px",position:"sticky",top:0,zIndex:100}}>
      <div style={{maxWidth:1400,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:tab==="directory"?12:0}}>
          <button type="button" onClick={goHome} style={{background:"none",border:"none",cursor:"pointer",textAlign:"left",padding:0}}>
            <div style={{fontSize:20,fontWeight:800,color:"#7F77DD"}}>🌐 TopMLMLeaders</div>
            <div style={{fontSize:11,color:"#999"}}>Find · Connect · Grow Worldwide</div>
          </button>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {activeUser&&<button type="button" onClick={()=>setShowNotifications(true)} style={{position:"relative",fontSize:12,background:"#f5f5ff",color:"#7F77DD",border:"0.5px solid #dcd8ff",borderRadius:20,padding:"6px 12px",cursor:"pointer",fontWeight:700}}>🔔{unreadNotifications>0&&<span style={{position:"absolute",top:-6,right:-4,background:"#E24B4A",color:"#fff",borderRadius:10,padding:"1px 6px",fontSize:10}}>{unreadNotifications}</span>}</button>}
            {normalizeEmail(activeUser?.email || authUser?.email)==="admin@topmlmleaders.com"&&<button type="button" onClick={openAdmin} style={{fontSize:12,background:"#E24B4A18",color:"#E24B4A",border:"0.5px solid #E24B4A44",borderRadius:20,padding:"6px 12px",cursor:"pointer",fontWeight:700}}>⚡ Admin</button>}
            <button onClick={()=>setTab("plans")} style={{fontSize:12,background:"#EF9F2718",color:"#EF9F27",border:"0.5px solid #EF9F2744",borderRadius:20,padding:"6px 12px",cursor:"pointer",fontWeight:700}}>💎 Plans</button>
            {activeUser?<button type="button" onClick={openDashboard} style={{fontSize:12,background:"#7F77DD",color:"#fff",border:"none",borderRadius:20,padding:"7px 14px",cursor:"pointer",fontWeight:700,maxWidth:220,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}><span>👤</span><span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{activeUser.name} · {followingCount}</span></button>
            :<button onClick={()=>setShowAuth(true)} style={{fontSize:12,background:"#7F77DD",color:"#fff",border:"none",borderRadius:20,padding:"7px 14px",cursor:"pointer",fontWeight:700}}>🔓 Login</button>}
          </div>
        </div>
        {tab==="directory"&&<>
          <div style={{position:"relative",marginBottom:6}}>
            <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, city, company, pin, country, role..." style={{width:"100%",fontSize:15,borderRadius:40,padding:"11px 52px 11px 20px",border:"2.5px solid #7F77DD",outline:"none",boxSizing:"border-box",boxShadow:"0 0 0 4px #7F77DD18"}}/>
            <button style={{position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",background:"#7F77DD",border:"none",borderRadius:24,padding:"5px 16px",color:"#fff",fontWeight:700,fontSize:13,cursor:"pointer"}}>Search</button>
          </div>
          <div style={{fontSize:12,color:"#999",textAlign:"center"}}>Try: "Mumbai" · "Amway" · "Diamond" · "India" · "400053"</div>
        </>}
      </div>
    </div>
    <div style={{maxWidth:1400,margin:"0 auto",padding:"16px 20px calc(90px + env(safe-area-inset-bottom, 0px))"}}>
      {tab==="directory"&&<>
        {query&&<div style={{fontSize:13,color:"#666",marginBottom:12}}>{filtered.length} result{filtered.length!==1?"s":""} found</div>}
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:18}}>
          {filtered.map(m=><MemberCard key={m.id} m={m} onView={openProfile} onChat={openChatForMember} setShareOpen={setShareOpen} onToggleFollow={toggleFollow} isFollowing={isFollowing(m.id)} followLoading={followLoading}/>)}
        </div>
      </>}
      {tab==="leaderboard"&&<div style={{maxWidth:600,margin:"0 auto"}}>
        <div style={{fontWeight:800,fontSize:18,marginBottom:16}}>🏆 Top Leaders This Week</div>
        {[...membersData].sort((a,b)=>(b.followerCount||0)-(a.followerCount||0)).map((m,idx)=><div key={m.id} style={{background:"#fff",borderRadius:14,padding:"14px 16px",display:"flex",alignItems:"center",gap:14,marginBottom:10,boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>
          <div style={{fontSize:idx<3?26:16,minWidth:32,textAlign:"center",fontWeight:700}}>{["🥇","🥈","🥉"][idx]||`#${idx+1}`}</div>
          <Avatar initials={m.photo} color={m.color} size={44}/>
          <div style={{flex:1}}><div style={{fontWeight:700,fontSize:14}}>{m.name} {m.verified&&"✓"}</div><div style={{fontSize:12,color:"#999"}}>{m.role} · {m.city}, {m.country}</div></div>
          <div style={{textAlign:"right"}}><div style={{fontWeight:700,fontSize:20,color:m.color}}>{m.followerCount||0}</div><div style={{fontSize:11,color:"#999"}}>followers</div></div>
        </div>)}
      </div>}
      {tab==="board"&&<div style={{maxWidth:600,margin:"0 auto"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}><div style={{fontWeight:800,fontSize:18}}>Opportunity Board</div><button style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:20,padding:"8px 16px",fontSize:13,fontWeight:700,cursor:"pointer"}}>+ Post</button></div>
        {[{author:"Rajnish Kumar",photo:"RK",color:"#7F77DD",city:"Mumbai",company:"Herbalife",type:"Looking for team",desc:"Looking for 5 serious leaders in Mumbai/Thane.",urgent:true},{author:"Sunita Verma",photo:"SV",color:"#BA7517",city:"Pune",company:"Modicare",type:"Training offer",desc:"Free weekend training in Pune — 15 June.",urgent:false}].map((o,i)=><div key={i} style={{background:"#fff",borderRadius:14,padding:16,marginBottom:12,boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>
          <div style={{display:"flex",gap:10,alignItems:"center",marginBottom:10}}><Avatar initials={o.photo} color={o.color} size={40}/><div style={{flex:1}}><div style={{display:"flex",justifyContent:"space-between"}}><span style={{fontWeight:700,fontSize:14}}>{o.author}</span>{o.urgent&&<span style={{fontSize:11,background:"#E24B4A18",color:"#E24B4A",borderRadius:20,padding:"2px 8px"}}>Urgent</span>}</div><div style={{fontSize:12,color:"#999"}}>{o.city} · {o.company}</div></div></div>
          <p style={{fontSize:13,color:"#666",margin:"0 0 12px",lineHeight:1.5}}>{o.desc}</p>
          <button style={{width:"100%",background:o.color,color:"#fff",border:"none",borderRadius:8,padding:"9px",fontSize:13,fontWeight:700,cursor:"pointer"}}>💬 Connect</button>
        </div>)}
      </div>}
      {tab==="plans"&&<div style={{maxWidth:900,margin:"0 auto"}}>
        <div style={{fontWeight:800,fontSize:22,marginBottom:24,textAlign:"center"}}>💎 Choose Your Plan</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(200px,1fr))",gap:16}}>
          {[{name:"Free",year:"₹0/yr",color:"#888",features:["Basic profile","Search listing","Chat","Book others"],locked:["Custom link","Verified","Bookings","Top search"]},
          {name:"Pro 💎",year:"₹1,499/yr",color:"#7F77DD",features:["Custom link","Verified ✓","Gallery","Events","Income badge"],locked:["Accept bookings","Top search"]},
          {name:"Elite 🌟",year:"₹3,999/yr",color:"#EF9F27",popular:true,features:["Everything in Pro","Accept bookings","Slots calendar","Top 5 search","Team showcase"],locked:[]},
          {name:"Company 🏢",year:"₹7,999/yr",color:"#185FA5",features:["Company page","Verified","Featured","Analytics","Support"],locked:[]}
          ].map((p,i)=><div key={i} style={{background:"#fff",border:`${p.popular?"2px":"0.5px"} solid ${p.popular?p.color:"#eee"}`,borderRadius:16,padding:18,position:"relative"}}>
            {p.popular&&<div style={{position:"absolute",top:-12,left:"50%",transform:"translateX(-50%)",background:p.color,color:"#fff",fontSize:11,fontWeight:700,padding:"3px 14px",borderRadius:20,whiteSpace:"nowrap"}}>MOST POPULAR</div>}
            <div style={{fontWeight:800,fontSize:16,color:p.color,marginBottom:4}}>{p.name}</div>
            <div style={{fontWeight:700,fontSize:18,color:p.color,marginBottom:14}}>{p.year}</div>
            {p.features.map(f=><div key={f} style={{display:"flex",gap:6,fontSize:12,marginBottom:6}}><span style={{color:"#1D9E75",fontWeight:700}}>✓</span>{f}</div>)}
            {p.locked.map(f=><div key={f} style={{display:"flex",gap:6,fontSize:12,marginBottom:6,opacity:0.4}}><span style={{color:"#E24B4A"}}>✗</span>{f}</div>)}
            <button style={{width:"100%",marginTop:12,background:i===0?"#f5f5f5":p.color,color:i===0?"#666":"#fff",border:"none",borderRadius:10,padding:"11px",fontWeight:700,fontSize:13,cursor:"pointer"}}>{i===0?"Get Started Free":`Get ${p.name.split(" ")[0]} →`}</button>
          </div>)}
        </div>
        <div style={{textAlign:"center",marginTop:16,fontSize:13,color:"#999"}}>💳 Secure payment via Razorpay · Cancel anytime</div>
      </div>}
      {tab==="me"&&<div style={{maxWidth:480,margin:"0 auto"}}>
        {activeUser?<div>
          <div style={{fontWeight:800,fontSize:20,marginBottom:16}}>My Account</div>
          <div style={{background:"#fff",borderRadius:14,padding:20,marginBottom:14,boxShadow:"0 1px 8px rgba(0,0,0,0.06)"}}>
            <div style={{display:"flex",gap:14,alignItems:"center",marginBottom:16}}>
              <Avatar initials={activeUser.name.slice(0,2).toUpperCase()} color="#7F77DD" size={60}/>
              <div><div style={{fontWeight:800,fontSize:18}}>{activeUser.name}</div><div style={{fontSize:13,color:"#666"}}>{activeUser.email}</div></div>
            </div>
            {!myMemberProfile&&<button type="button" onClick={()=>setShowOnboarding(true)} style={{width:"100%",background:"#EF9F2718",color:"#EF9F27",border:"1px solid #EF9F2744",borderRadius:10,padding:"11px",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>⚡ Complete MLM Profile</button>}
            <button type="button" onClick={openDashboard} style={{width:"100%",background:"#7F77DD",color:"#fff",border:"none",borderRadius:10,padding:"11px",fontWeight:700,fontSize:14,cursor:"pointer",marginBottom:10}}>📊 Open Dashboard</button>
            <button onClick={()=>supabase.auth.signOut()} style={{width:"100%",background:"none",border:"0.5px solid #ddd",borderRadius:10,padding:"11px",fontWeight:600,fontSize:14,cursor:"pointer",color:"#666"}}>Logout</button>
          </div>
        </div>:<div style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:48,marginBottom:16}}>👤</div>
          <div style={{fontWeight:800,fontSize:20,marginBottom:8}}>Join TopMLMLeaders</div>
          <button onClick={()=>setShowAuth(true)} style={{background:"#7F77DD",color:"#fff",border:"none",borderRadius:12,padding:"13px 32px",fontWeight:700,fontSize:15,cursor:"pointer",width:"100%",marginBottom:12}}>🔓 Login / Sign Up</button>
        </div>}
      </div>}
    </div>
    <div className="app-bottom-nav" style={{position:"fixed",bottom:0,left:0,right:0,background:"#fff",borderTop:"0.5px solid #eee",display:"flex",zIndex:100}}>
      {tabs.map(t=><button key={t.id} onClick={()=>setTab(t.id)} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:3,padding:"10px 4px 14px",background:"none",border:"none",cursor:"pointer",color:tab===t.id?"#7F77DD":"#999",position:"relative"}}>
        <span style={{fontSize:18}}>{t.icon}</span>
        {t.id==="me"&&unreadMessages>0&&<span style={{position:"absolute",top:6,right:"28%",background:"#E24B4A",color:"#fff",borderRadius:10,padding:"1px 5px",fontSize:9}}>{unreadMessages}</span>}
        <span style={{fontSize:10,fontWeight:tab===t.id?700:400}}>{t.label}</span>
      </button>)}
    </div>
    {showAuth&&<AuthModal onClose={()=>setShowAuth(false)} onSuccess={()=>setShowAuth(false)}/>}
    {showDashboard&&activeUser&&<MemberDashboard user={activeUser} myMemberProfile={myMemberProfile} membersData={membersData} notifications={notifications} onHome={goHome} onOpenChat={openChatForMember} onBookingsChanged={bookingsVersion}/>}
    {showAdmin&&<AdminPanel membersData={membersData} onHome={goHome}/>}
    {chat&&<ChatModal m={chat} user={activeUser} onClose={()=>setChat(null)}/>}
    {shareOpen&&<ShareSheet m={shareOpen} onClose={()=>setShareOpen(null)}/>}
    {showOnboarding&&activeUser&&<OnboardingModal user={activeUser} onClose={()=>setShowOnboarding(false)} onCreated={()=>setMembersReloadKey(x=>x+1)}/>}
    {showNotifications&&<div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:1400,display:"flex",alignItems:"flex-start",justifyContent:"center"}} onClick={()=>setShowNotifications(false)}>
      <div style={{background:"#fff",marginTop:70,width:"100%",maxWidth:460,borderRadius:14,padding:16,maxHeight:"72vh",overflowY:"auto"}} onClick={e=>e.stopPropagation()}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
          <div style={{fontWeight:800,fontSize:16}}>Notifications</div>
          <button type="button" onClick={markAllRead} style={{background:"#f5f5f5",border:"1px solid #eee",borderRadius:10,padding:"6px 10px",fontSize:12,cursor:"pointer"}}>Mark all read</button>
        </div>
        {notifications.length===0&&<div style={{fontSize:13,color:"#999",padding:"20px 0",textAlign:"center"}}>No notifications yet</div>}
        {notifications.map((n)=><button type="button" key={n.id} onClick={()=>{setShowNotifications(false); if(n.link) window.location.hash=n.link;}} style={{width:"100%",textAlign:"left",border:"1px solid #eee",background:n.read?"#fff":"#f8f8ff",borderRadius:12,padding:12,marginBottom:8,cursor:"pointer"}}>
          <div style={{display:"flex",justifyContent:"space-between",gap:10}}>
            <div style={{fontWeight:n.read?600:800,fontSize:13}}>{n.text}</div>
            {!n.read&&<span style={{fontSize:10,background:"#7F77DD",color:"#fff",borderRadius:10,padding:"2px 6px"}}>NEW</span>}
          </div>
          <div style={{fontSize:11,color:"#999",marginTop:4}}>{new Date(n.created_at).toLocaleString()}</div>
        </button>)}
      </div>
    </div>}
  </div>;
}