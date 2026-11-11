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
export function LegacyEventManagement(){
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

// Event Hub v2 administration: schedules are UTC, status is derived by the server.
import { type HubEvent, type EventActivity } from "./EventHubTypes";
type EventDraft = Omit<HubEvent, 'status' | 'created_at'> & { cancelled: boolean };
const emptyHubEvent: EventDraft = { slug:'',title:'',eyebrow:'',description:'',cover_url:'',theme:'gold',start_at:'',end_at:'',cancelled_at:null,cancelled:false,published:false,featured_slot:0,activities:[] };
const localInput = (s: string) => s ? new Date(new Date(s).getTime() - new Date(s).getTimezoneOffset() * 60000).toISOString().slice(0,16) : '';
export function EventManagement() {
  const [events,setEvents]=useState<HubEvent[]>([]);
  const [draft,setDraft]=useState<EventDraft>({...emptyHubEvent});
  const [editing,setEditing]=useState(false);
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState('');
  async function load(){const data=await api('/api/admin/event-hub');setEvents(data.events ?? []);}
  useEffect(()=>{void load().catch(e=>setMessage(String(e)));},[]);
  function change<K extends keyof EventDraft>(key:K,value:EventDraft[K]){setDraft(d=>({...d,[key]:value}));}
  async function save(e:FormEvent){e.preventDefault();setBusy(true);setMessage('');try{
    const payload={...draft,start_at:new Date(draft.start_at).toISOString(),end_at:new Date(draft.end_at).toISOString()};
    await api(editing?`/api/admin/event-hub/${encodeURIComponent(draft.slug)}`:'/api/admin/event-hub',{method:editing?'PUT':'POST',body:JSON.stringify(payload)});
    setMessage('Event saved. Schedule and featured slots updated.');setDraft({...emptyHubEvent});setEditing(false);await load();
  }catch(e){setMessage(e instanceof Error?e.message:'Unable to save event');}finally{setBusy(false);}}
  async function remove(slug:string){if(!window.confirm(`Permanently delete ${slug}?`))return;try{await api(`/api/admin/event-hub/${encodeURIComponent(slug)}`,{method:'DELETE'});await load();setMessage('Event deleted.');}catch(e){setMessage(String(e));}}
  function edit(e:HubEvent){setDraft({...e,start_at:e.start_at,end_at:e.end_at,cancelled:!!e.cancelled_at});setEditing(true);setMessage('');}
  function updateActivity(i:number,key:keyof EventActivity,value:string){change('activities',draft.activities.map((a,j)=>j===i?{...a,[key]:value}:a));}
  return <div className="dc-admin-panel"><h2>Event Hub Management</h2><p>Create scheduled events, select cover artwork and themes, assign up to three linked activities, and feature up to two active events on the homepage. Dates use your browser's local timezone.</p>
    <div className="dc-admin-event-list">{events.map(e=><article key={e.slug}><div><strong>{e.title}</strong><small>{e.status} · {e.published?'Published':'Draft'} · {e.featured_slot?`Featured ${e.featured_slot}`:'Not featured'}</small></div><button type="button" onClick={()=>edit(e)}>Edit</button><button type="button" className="danger" onClick={()=>void remove(e.slug)}>Delete</button></article>)}</div>
    <form className="dc-admin-event-form" onSubmit={save}><h3>{editing?`Edit: ${draft.title}`:'Create an event'}</h3>
      <label>URL slug<input required disabled={editing} pattern="[a-z0-9]+(-[a-z0-9]+)*" value={draft.slug} onChange={e=>change('slug',e.target.value)} placeholder="festival-of-light"/></label>
      <label>Title<input required maxLength={160} value={draft.title} onChange={e=>change('title',e.target.value)}/></label>
      <label>Eyebrow<input value={draft.eyebrow} onChange={e=>change('eyebrow',e.target.value)} placeholder="SEASONAL OPERATION"/></label>
      <label>Description<textarea rows={4} value={draft.description} onChange={e=>change('description',e.target.value)}/></label>
      <label>Cover art URL<input value={draft.cover_url} onChange={e=>change('cover_url',e.target.value)} placeholder="/assets/events/banner.webp or https://..."/></label>
      <label>Theme<select value={draft.theme} onChange={e=>change('theme',e.target.value)}>{['gold','teal','crimson','violet','blue','emerald'].map(x=><option key={x} value={x}>{x.toUpperCase()}</option>)}</select></label>
      <label>Start date/time<input type="datetime-local" required value={localInput(draft.start_at)} onChange={e=>change('start_at',e.target.value ? new Date(e.target.value).toISOString() : '')}/></label>
      <label>End date/time<input type="datetime-local" required min={localInput(draft.start_at)} value={localInput(draft.end_at)} onChange={e=>change('end_at',e.target.value ? new Date(e.target.value).toISOString() : '')}/></label>
      <label>Homepage featured slot<select value={draft.featured_slot} onChange={e=>change('featured_slot',Number(e.target.value))}><option value={0}>Not featured</option><option value={1}>Featured #1</option><option value={2}>Featured #2</option></select></label>
      <label className="dc-admin-check"><input type="checkbox" checked={Boolean(draft.published)} onChange={e=>change('published',e.target.checked)}/> Publish / make visible</label>
      <label className="dc-admin-check"><input type="checkbox" checked={draft.cancelled} onChange={e=>change('cancelled',e.target.checked)}/> Cancel event early (uncheck to restore)</label>
      <h3>Linked activities ({draft.activities.length}/3)</h3><p>Internal page redirects only. Example: /activities or /vault. Activities remain independent; Nanite Break is not modified.</p>
      {draft.activities.map((a,i)=><div className="dc-admin-inline" key={i}><input required aria-label={`Activity ${i+1} title`} placeholder="Activity name" value={a.title} onChange={e=>updateActivity(i,'title',e.target.value)}/><input required aria-label={`Activity ${i+1} route`} placeholder="/activities" value={a.path} onChange={e=>updateActivity(i,'path',e.target.value)}/><button type="button" onClick={()=>change('activities',draft.activities.filter((_,j)=>j!==i))}>Remove</button></div>)}
      {draft.activities.length<3&&<button type="button" onClick={()=>change('activities',[...draft.activities,{title:'',path:''}])}>+ Add activity</button>}
      <div className="dc-admin-inline"><button disabled={busy}>{busy?'Saving…':editing?'Save event changes':'Create event'}</button>{editing&&<button type="button" onClick={()=>{setDraft({...emptyHubEvent});setEditing(false)}}>New event</button>}</div>
    </form>{message&&<p className="dc-admin-message" role="status">{message}</p>}
  </div>;
}
