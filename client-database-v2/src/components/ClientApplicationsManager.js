import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

const money = v => v == null ? 'Not set' : `TZS ${Number(v).toLocaleString()}`;
const nextActions = status => {
  switch (status) {
    case 'Submitted':
    case 'New': return ['Received'];
    case 'Received': return ['Payment Required','Approved'];
    case 'Payment Required':
    case 'Payment Pending': return ['Payment Received'];
    case 'Payment Received': return ['Approved'];
    case 'Approved': return ['Processing'];
    case 'Processing': return ['Certificate Issued','Completed'];
    case 'Certificate Issued': return ['Completed'];
    default: return [];
  }
};

export default function ClientApplicationsManager() {
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);
  const [selected,setSelected]=useState(null);
  const [search,setSearch]=useState('');
  const [busy,setBusy]=useState(false);
  const [note,setNote]=useState('');
  const [history,setHistory]=useState([]);

  async function load(){
    setLoading(true);
    const {data,error}=await supabase.from('applications')
      .select('id,reference,full_name,phone,email,service,service_id,status,quoted_amount,payment_status,documents,created_at,updated_at,admin_note')
      .is('deleted_at',null)
      .order('created_at',{ascending:false}).limit(300);
    setLoading(false);
    if(error) return Alert.alert('Could not load applications',error.message);
    setItems(data||[]);
  }
  useEffect(()=>{load()},[]);

  const filtered=useMemo(()=>{
    const q=search.trim().toLowerCase();
    if(!q) return items;
    return items.filter(x=>`${x.reference} ${x.full_name} ${x.phone} ${x.email||''} ${x.service} ${x.status}`.toLowerCase().includes(q));
  },[items,search]);

  async function openApplication(app){
    setSelected(app); setNote(app.admin_note||''); setHistory([]);
    const receive=await supabase.rpc('staff_receive_application',{p_application_id:app.id});
    if(receive.error){
      Alert.alert('Could not open application',receive.error.message);
      return;
    }
    const current=Array.isArray(receive.data)?receive.data[0]:receive.data;
    if(current) setSelected(current);
    const h=await supabase.from('application_status_history').select('status,note,created_at').eq('application_id',app.id).order('created_at',{ascending:false});
    setHistory(h.data||[]);
    await load();
  }

  async function changeStatus(status){
    if(!selected) return;
    setBusy(true);
    const {data,error}=await supabase.rpc('staff_set_application_status',{p_application_id:selected.id,p_status:status,p_note:note||null});
    setBusy(false);
    if(error) return Alert.alert('Status not changed',error.message);
    const updated=Array.isArray(data)?data[0]:data;
    setSelected(updated);
    Alert.alert('Application updated',`Status is now ${status}.${status==='Payment Required' ? `\n\nClient amount: ${money(updated?.quoted_amount)}`:''}`);
    const h=await supabase.from('application_status_history').select('status,note,created_at').eq('application_id',selected.id).order('created_at',{ascending:false});
    setHistory(h.data||[]);
    await load();
  }

  if(loading) return <View style={s.center}><ActivityIndicator size="large"/><Text style={s.muted}>Loading client applications...</Text></View>;

  return <View style={s.wrap}>
    <Text style={s.title}>Client Applications</Text>
    <Text style={s.desc}>Open a submitted application to mark it Received automatically, review documents, request payment and move the work through approval, processing and completion.</Text>
    <TextInput value={search} onChangeText={setSearch} placeholder="Search reference, client, service or status" style={s.search}/>
    <ScrollView contentContainerStyle={{paddingBottom:80}}>
      {filtered.length===0?<Text style={s.muted}>No applications found.</Text>:filtered.map(a=><Pressable key={a.id} onPress={()=>openApplication(a)} style={s.card}>
        <View style={s.row}><Text style={s.service}>{a.service}</Text><Text style={s.status}>{a.status}</Text></View>
        <Text style={s.ref}>{a.reference}</Text>
        <Text style={s.client}>{a.full_name} • {a.phone}</Text>
        <Text style={s.meta}>Payment: {a.payment_status} • {money(a.quoted_amount)}</Text>
      </Pressable>)}
    </ScrollView>

    <Modal visible={!!selected} animationType="slide" onRequestClose={()=>setSelected(null)}>
      <View style={s.modalHead}><View style={{flex:1}}><Text style={s.modalTitle}>{selected?.service}</Text><Text style={s.ref}>{selected?.reference}</Text></View><Pressable onPress={()=>setSelected(null)}><Text style={s.close}>Close</Text></Pressable></View>
      <ScrollView contentContainerStyle={s.modalBody}>
        <Text style={s.section}>Client</Text><Text style={s.value}>{selected?.full_name}</Text><Text style={s.meta}>{selected?.phone}{selected?.email?` • ${selected.email}`:''}</Text>
        <Text style={s.section}>Current status</Text><Text style={s.bigStatus}>{selected?.status}</Text>
        <Text style={s.section}>Payment</Text><Text style={s.value}>{selected?.payment_status}</Text><Text style={s.price}>{money(selected?.quoted_amount)}</Text>
        <Text style={s.section}>Documents</Text>
        {Array.isArray(selected?.documents)&&selected.documents.length?selected.documents.map((d,i)=><View key={i} style={s.doc}><Text style={s.docTitle}>{d.type||d.name||`Document ${i+1}`}</Text><Text style={s.meta}>{Array.isArray(d.files)?`${d.files.length} file(s) attached`:'Attached'}</Text></View>):<Text style={s.muted}>No structured document list available.</Text>}
        <Text style={s.section}>Staff note</Text><TextInput value={note} onChangeText={setNote} multiline placeholder="Optional note for this stage" style={[s.search,{minHeight:88,textAlignVertical:'top'}]}/>
        <Text style={s.section}>Available actions</Text>
        {nextActions(selected?.status).map(x=><Pressable disabled={busy} key={x} onPress={()=>changeStatus(x)} style={[s.button,busy&&{opacity:.5}]}><Text style={s.buttonText}>{busy?'Updating...':x}</Text></Pressable>)}
        {!nextActions(selected?.status).length&&<Text style={s.muted}>No further workflow action is available from this status.</Text>}
        <Text style={s.section}>Status history</Text>
        {history.map((h,i)=><View key={i} style={s.history}><Text style={s.docTitle}>{h.status}</Text><Text style={s.meta}>{new Date(h.created_at).toLocaleString()}</Text>{h.note?<Text style={s.meta}>{h.note}</Text>:null}</View>)}
      </ScrollView>
    </Modal>
  </View>;
}

const s=StyleSheet.create({
  wrap:{flex:1,padding:16,backgroundColor:'#F4F7FB'},center:{padding:30,alignItems:'center'},title:{fontSize:26,fontWeight:'900',color:'#102A43'},desc:{color:'#627D98',lineHeight:20,marginTop:5,marginBottom:12},search:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D9E2EC',borderRadius:12,padding:13,marginBottom:12},muted:{color:'#627D98',marginTop:8},card:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D9E2EC',borderRadius:14,padding:15,marginBottom:10},row:{flexDirection:'row',justifyContent:'space-between',gap:10},service:{fontSize:17,fontWeight:'900',color:'#102A43',flex:1},status:{fontWeight:'900',color:'#157347'},ref:{fontWeight:'800',color:'#E67E22',marginTop:4},client:{fontWeight:'700',color:'#243B53',marginTop:7},meta:{color:'#627D98',marginTop:4},modalHead:{padding:18,paddingTop:28,flexDirection:'row',alignItems:'center',borderBottomWidth:1,borderColor:'#D9E2EC'},modalTitle:{fontSize:22,fontWeight:'900',color:'#102A43'},close:{color:'#1B4D89',fontWeight:'900'},modalBody:{padding:18,paddingBottom:60},section:{fontSize:15,fontWeight:'900',color:'#102A43',marginTop:18,marginBottom:7},value:{fontSize:17,fontWeight:'800',color:'#243B53'},bigStatus:{fontSize:24,fontWeight:'900',color:'#157347'},price:{fontSize:20,fontWeight:'900',color:'#E67E22',marginTop:4},doc:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D9E2EC',borderRadius:10,padding:11,marginBottom:8},docTitle:{fontWeight:'900',color:'#102A43'},button:{backgroundColor:'#1B4D89',padding:14,borderRadius:11,alignItems:'center',marginBottom:9},buttonText:{color:'#fff',fontWeight:'900'},history:{borderLeftWidth:3,borderColor:'#1B4D89',paddingLeft:11,paddingVertical:7}
});
