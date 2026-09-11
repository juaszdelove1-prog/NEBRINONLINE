import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { supabase } from '../lib/supabase';

const money = (v) => v === null || v === undefined || v === '' ? 'Not set' : `TZS ${Number(v).toLocaleString()}`;

export default function ServicePriceManager({ staff }) {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);
  const [search, setSearch] = useState('');
  const [drafts, setDrafts] = useState({});

  const canEdit = useMemo(() => /ceo|manager|accountant|treasurer|finance|cashier|audit|admin/i.test(`${staff?.role || ''} ${staff?.department || ''}`), [staff]);

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from('services')
      .select('id,name,category,price,is_active,updated_at')
      .eq('is_active', true)
      .order('category')
      .order('name');
    setLoading(false);
    if (error) return Alert.alert('Could not load prices', error.message);
    setServices(data || []);
    const next = {};
    (data || []).forEach(x => { next[x.id] = x.price == null ? '' : String(x.price); });
    setDrafts(next);
  }

  useEffect(() => { load(); }, []);

  async function savePrice(service) {
    const raw = String(drafts[service.id] ?? '').replace(/,/g, '').trim();
    if (raw === '') return Alert.alert('Price required', 'Enter the service price before saving.');
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0) return Alert.alert('Invalid price', 'Enter a valid amount of zero or greater.');

    setSavingId(service.id);
    const { data, error } = await supabase.rpc('set_service_price', {
      p_service_id: service.id,
      p_price: value,
    });
    setSavingId(null);
    if (error) return Alert.alert('Could not save price', error.message);

    const updated = Array.isArray(data) ? data[0] : data;
    setServices(list => list.map(x => x.id === service.id ? { ...x, price: updated?.price ?? value, updated_at: updated?.updated_at || new Date().toISOString() } : x));
    Alert.alert('Price updated', `${service.name}\n${money(value)}\n\nThis price is now the official price used by the NEBRIN Client Portal for new payment requests.`);
  }

  const q = search.trim().toLowerCase();
  const filtered = services.filter(x => `${x.name} ${x.category}`.toLowerCase().includes(q));
  const missing = services.filter(x => x.price == null).length;

  if (loading) return <View style={s.center}><ActivityIndicator size="large"/><Text style={s.muted}>Loading service prices...</Text></View>;

  return <ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <Text style={s.title}>Service Prices</Text>
    <Text style={s.desc}>These are the official prices used by the NEBRIN Client Portal. A client is never charged from a hard-coded price inside the client app.</Text>

    <View style={s.summary}>
      <View><Text style={s.big}>{services.length}</Text><Text style={s.muted}>Active services</Text></View>
      <View><Text style={[s.big, missing ? s.warn : s.good]}>{missing}</Text><Text style={s.muted}>Prices not set</Text></View>
    </View>

    <TextInput value={search} onChangeText={setSearch} placeholder="Search service or category" style={s.search}/>

    {!canEdit && <View style={s.notice}><Text style={s.noticeText}>You can view prices, but your current role cannot change them.</Text></View>}

    {filtered.map(service => <View key={service.id} style={s.card}>
      <Text style={s.name}>{service.name}</Text>
      <Text style={s.category}>{service.category}</Text>
      <Text style={s.current}>Current price: {money(service.price)}</Text>
      {canEdit && <>
        <Text style={s.label}>Set official price (TZS)</Text>
        <TextInput
          value={drafts[service.id] ?? ''}
          onChangeText={v => setDrafts(d => ({ ...d, [service.id]: v.replace(/[^0-9.]/g, '') }))}
          keyboardType="numeric"
          placeholder="e.g. 20000"
          style={s.input}
        />
        <Pressable disabled={savingId === service.id} onPress={() => savePrice(service)} style={[s.button, savingId === service.id && { opacity: .55 }]}>
          <Text style={s.buttonText}>{savingId === service.id ? 'Saving...' : 'Save Price'}</Text>
        </Pressable>
      </>}
    </View>)}
  </ScrollView>;
}

const s = StyleSheet.create({
  page:{padding:16,paddingBottom:80,backgroundColor:'#F4F7FB'},center:{padding:30,alignItems:'center'},title:{fontSize:26,fontWeight:'900',color:'#102A43'},desc:{color:'#627D98',fontSize:14,lineHeight:20,marginTop:6,marginBottom:14},summary:{flexDirection:'row',justifyContent:'space-between',backgroundColor:'#fff',padding:16,borderRadius:14,borderWidth:1,borderColor:'#D9E2EC',marginBottom:14},big:{fontSize:26,fontWeight:'900',color:'#1B4D89'},warn:{color:'#B54708'},good:{color:'#157347'},muted:{color:'#627D98',marginTop:4},search:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D9E2EC',borderRadius:12,padding:13,marginBottom:12},notice:{padding:12,backgroundColor:'#FFF7E8',borderRadius:12,marginBottom:12},noticeText:{color:'#8A4B08',fontWeight:'700'},card:{backgroundColor:'#fff',borderWidth:1,borderColor:'#D9E2EC',borderRadius:14,padding:15,marginBottom:10},name:{fontSize:17,fontWeight:'900',color:'#102A43'},category:{color:'#627D98',marginTop:3},current:{fontWeight:'800',color:'#E67E22',marginTop:8,marginBottom:10},label:{fontWeight:'800',color:'#243B53',marginBottom:6},input:{borderWidth:1,borderColor:'#D9E2EC',borderRadius:10,padding:12,backgroundColor:'#fff'},button:{backgroundColor:'#1B4D89',padding:12,borderRadius:10,alignItems:'center',marginTop:10},buttonText:{color:'#fff',fontWeight:'900'}
});
