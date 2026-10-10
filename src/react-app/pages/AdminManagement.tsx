import { useEffect, useState, type FormEvent } from "react";

type Player = { id: number; username: string; global_name: string | null };
type Inventory = { user: Player; weapons: {weapon_name:string;masterwork:number}[]; currencies:{currency_name:string;amount:number}[]; materials:{material_name:string;amount:number}[] };
type EventRow = { slug:string; title:string; status:string; eyebrow:string; description:string; destination:string; objective:string; accent:string; published:number|boolean; start_at:string|null; end_at:string|null };
const blankEvent: EventRow = { slug:"",title:"",status:"UPCOMING",eyebrow:"",description:"",destination:"",objective:"",accent:"neutral",published:0,start_at:null,end_at:null };
async function api(path:string, init?:RequestInit) {
  const response = await fetch(path,{...init,credentials:"include",headers:{...(init?.body?{"Content-Type":"application/json"}:{}),...init?.headers}});
  const data = await response.json().catch(()=>({}));
  if(!response.ok) throw new Error(data.error || `Request failed (${response.status})`);
  return data;
}
export function PlayerManagement(){
  const [query,setQuery]=useState(""); const [players,setPlayers]=useState<Player[]>([]); const [selected,setSelected]=useState<Player|null>(null);
  const [inventory,setInventory]=useState<Inventory|null>(null); const [kind,setKind]=useState("weapon"); const [name,setName]=useState(""); const [amount,setAmount]=useState(1);
  const [catalog,setCatalog]=useState<{name:string;rarity:string}[]>([]); const [message,setMessage]=useState(""); const [busy,setBusy]=useState(false);
  async function refresh(id:number){ const d=await api(`/api/admin/players/${id}/inventory`);setInventory(d); }
  async function search(e:FormEvent){e.preventDefault();setMessage("");try{const d=await api(`/api/admin/players?q=${encodeURIComponent(query)}`);setPlayers(d.players);setSelected(null);setInventory(null);}catch(e){setMessage(String(e));}}
  useEffect(()=>{if(kind!=="weapon"||name.trim().length<2){setCatalog([]);return;}let alive=true;api(`/api/admin/weapon-catalog?q=${encodeURIComponent(name)}`).then(d=>{if(alive)setCatalog(d.weapons)}).catch(()=>{});return()=>{alive=false}},[kind,name]);
  async function grant(e:FormEvent){e.preventDefault();if(!selected)return;if(!window.confirm(`Grant ${kind === "weapon" ? name : `${amount} ${name}`} to ${selected.global_name||selected.username} (#${selected.id})?`))return;
    setBusy(true);setMessage("");try{await api(`/api/admin/players/${selected.id}/grants`,{method:"POST",body:JSON.stringify({kind,name,amount})});await refresh(selected.id);setMessage("Grant completed and logged.");setName("");}catch(e){setMessage(e instanceof Error?e.message:"Grant failed");}finally{setBusy(false)}}
  return <div className="dc-admin-panel"><h2>Player Account Access</h2><p>Search accounts and grant supported items. Weapons must exist in the weapon catalog; existing weapon ownership is preserved.</p>
    <form className="dc-admin-inline" onSubmit={search}><input placeholder="Username or user ID" value={query} onChange={e=>setQuery(e.target.value)} required/><button>Search players</button></form>
    <div className="dc-admin-chip-row">{players.map(p=><button key={p.id} className={selected?.id===p.id?"selected":""} onClick={()=>{setSelected(p);setMessage("");void refresh(p.id).catch(e=>setMessage(String(e)))}}>{p.global_name||p.username} · #{p.id}</button>)}</div>
    {inventory&&<><div className="dc-admin-inventory"><div><h3>Weapons ({inventory.weapons.length})</h3>{inventory.weapons.map(w=><p key={w.weapon_name}>{w.weapon_name}{w.masterwork?" · Masterworked":""}</p>)}</div><div><h3>Currencies</h3>{inventory.currencies.map(x=><p key={x.currency_name}>{x.currency_name}: {x.amount}</p>)}</div><div><h3>Materials</h3>{inventory.materials.map(x=><p key={x.material_name}>{x.material_name}: {x.amount}</p>)}</div></div>
      <form className="dc-admin-inline dc-admin-grant" onSubmit={grant}><select value={kind} onChange={e=>{setKind(e.target.value);setName("")}}><option value="weapon">Weapon</option><option value="currency">Currency</option><option value="material">Upgrade material</option></select><input value={name} onChange={e=>setName(e.target.value)} placeholder={kind==="weapon"?"Search catalog weapon":"Exact item name"} required/>{kind!=="weapon"&&<input type="number" min={1} max={1000000} value={amount} onChange={e=>setAmount(Number(e.target.value))} required/>}<button disabled={busy}>Grant item</button></form>
      {kind==="weapon"&&catalog.length>0&&<div className="dc-admin-chip-row">{catalog.map(w=><button key={w.name} type="button" onClick={()=>setName(w.name)}>{w.name} · {w.rarity}</button>)}</div>}
    </>}{message&&<p role="status" className="dc-admin-message">{message}</p>}
  </div>
}
export function EventManagement(){
  const [events,setEvents]=useState<EventRow[]>([]);const [draft,setDraft]=useState<EventRow>({...blankEvent});const [editing,setEditing]=useState(false);const [message,setMessage]=useState("");const [busy,setBusy]=useState(false);
  async function load(){const d=await api("/api/admin/events");setEvents(d.events)}
  useEffect(()=>{void load().catch(e=>setMessage(String(e)))},[]);
  function set(key:keyof EventRow,value:string|number|null){setDraft(d=>({...d,[key]:value}))}
  async function save(e:FormEvent){e.preventDefault();setBusy(true);setMessage("");try{await api(editing?`/api/admin/events/${encodeURIComponent(draft.slug)}`:"/api/admin/events",{method:editing?"PUT":"POST",body:JSON.stringify({...draft,published:Boolean(draft.published)})});setMessage(editing?"Event updated":"Event created");setDraft({...blankEvent});setEditing(false);await load();}catch(e){setMessage(e instanceof Error?e.message:"Save failed")}finally{setBusy(false)}}
  async function remove(slug:string){if(!window.confirm(`Delete event ${slug}? This cannot be undone.`))return;try{await api(`/api/admin/events/${encodeURIComponent(slug)}`,{method:"DELETE"});await load();setMessage("Event deleted");}catch(e){setMessage(String(e))}}
  return <div className="dc-admin-panel"><h2>Event Management</h2><p>Published events appear on the Events hub. Scheduling fields record the planned dates; status is changed manually.</p>
    <div className="dc-admin-event-list">{events.map(ev=><article key={ev.slug}><div><strong>{ev.title}</strong><small>{ev.slug} · {ev.status} · {ev.published?"Published":"Draft"}</small></div><button onClick={()=>{setDraft({...ev});setEditing(true)}}>Edit</button><button className="danger" onClick={()=>void remove(ev.slug)}>Delete</button></article>)}</div>
    <form className="dc-admin-event-form" onSubmit={save}><h3>{editing?`Editing ${draft.slug}`:"Create an event"}</h3>
      <label>URL slug<input value={draft.slug} disabled={editing} onChange={e=>set("slug",e.target.value)} placeholder="new-operation" required pattern="[a-z0-9]+(-[a-z0-9]+)*"/></label>
      <label>Title<input value={draft.title} onChange={e=>set("title",e.target.value)} required/></label>
      <label>Eyebrow<input value={draft.eyebrow} onChange={e=>set("eyebrow",e.target.value)}/></label>
      <label>Description<textarea rows={4} value={draft.description} onChange={e=>set("description",e.target.value)}/></label>
      <label>Destination<input value={draft.destination} onChange={e=>set("destination",e.target.value)}/></label>
      <label>Objective<input value={draft.objective} onChange={e=>set("objective",e.target.value)}/></label>
      <label>Status<select value={draft.status} onChange={e=>set("status",e.target.value)}><option>UPCOMING</option><option>ACTIVE</option><option>CONCLUDED</option></select></label>
      <label>Accent<select value={draft.accent} onChange={e=>set("accent",e.target.value)}><option value="neutral">Neutral</option><option value="siva">SIVA</option></select></label>
      <label>Start (optional)<input type="datetime-local" value={draft.start_at?.slice(0,16)??""} onChange={e=>set("start_at",e.target.value||null)}/></label>
      <label>End (optional)<input type="datetime-local" value={draft.end_at?.slice(0,16)??""} onChange={e=>set("end_at",e.target.value||null)}/></label>
      <label className="dc-admin-check"><input type="checkbox" checked={Boolean(draft.published)} onChange={e=>set("published",e.target.checked?1:0)}/> Publish event</label>
      <div className="dc-admin-inline"><button disabled={busy}>{busy?"Saving…":editing?"Save changes":"Create event"}</button>{editing&&<button type="button" onClick={()=>{setDraft({...blankEvent});setEditing(false)}}>Cancel</button>}</div>
    </form>{message&&<p role="status" className="dc-admin-message">{message}</p>}
  </div>
}
export function AuditManagement(){const [entries,setEntries]=useState<{id:number;action:string;target:string;details_json:string;created_at:string}[]>([]);const [message,setMessage]=useState("");useEffect(()=>{void api("/api/admin/audit").then(d=>setEntries(d.entries)).catch(e=>setMessage(String(e)))},[]);return <div className="dc-admin-panel"><h2>Recent admin actions</h2>{message&&<p>{message}</p>}{entries.map(e=><div className="dc-admin-audit" key={e.id}><strong>{e.action}</strong><span>Target #{e.target}</span><small>{e.created_at}</small><code>{e.details_json}</code></div>)}</div>}
