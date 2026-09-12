import 'react-native-url-polyfill/auto';
import React,{useEffect,useState} from 'react';
import {SafeAreaView,ScrollView,View,Text,TextInput,TouchableOpacity,StyleSheet,Alert} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createClient} from '@supabase/supabase-js';
import * as Location from 'expo-location';

const supabase=createClient('https://oguukuhflamwmgrbdqfk.supabase.co','sb_publishable_DfUyGsd9bdFBJmouRZf5Rw_SQBnUYXE',{auth:{storage:AsyncStorage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
const money=n=>`TZS ${Number(n||0).toLocaleString()}`;
const Btn=({title,onPress,disabled})=><TouchableOpacity disabled={disabled} style={[s.btn,disabled&&{opacity:.5}]} onPress={onPress}><Text style={s.btnText}>{title}</Text></TouchableOpacity>;

export default function App(){
 const [session,setSession]=useState(null),[profile,setProfile]=useState(null),[stats,setStats]=useState({}),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[pin,setPin]=useState(''),[loginStage,setLoginStage]=useState('password'),[otpVerified,setOtpVerified]=useState(false),[tab,setTab]=useState('home'),[services,setServices]=useState([]),[selected,setSelected]=useState([]),[form,setForm]=useState({full_name:'',phone:'',whatsapp_number:'',email:'',address:''}),[busy,setBusy]=useState(false);
 useEffect(()=>{supabase.auth.getSession().then(({data})=>{if(data.session) supabase.auth.signOut()});const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,x)=>setSession(x));return()=>subscription.unsubscribe()},[]);
 useEffect(()=>{if(session&&otpVerified) bootstrap();else{setProfile(null);setStats({})}},[session,otpVerified]);
 async function bootstrap(){const {data,error}=await supabase.rpc('freelancer_bootstrap');if(error){Alert.alert('Access imezuiwa',error.message);await logout();return}setProfile(data.freelancer);setStats(data.stats||{});const q=await supabase.from('services').select('id,name,category,price').eq('is_active',true).order('name');if(!q.error)setServices(q.data||[])}
 async function checkPasswordAndSendPin(){
  const e=email.trim().toLowerCase();
  if(!e)return Alert.alert('Email inahitajika');
  if(!password)return Alert.alert('Password inahitajika');
  setBusy(true);
  const {error:pwError}=await supabase.auth.signInWithPassword({email:e,password});
  if(pwError){setBusy(false);return Alert.alert('Login imekataliwa','Email au password si sahihi.');}
  await supabase.auth.signOut();
  const {error:otpError}=await supabase.auth.signInWithOtp({email:e,options:{shouldCreateUser:false}});
  setBusy(false);
  if(otpError)return Alert.alert('Imeshindikana kutuma PIN',otpError.message);
  setPin('');
  setLoginStage('otp');
  Alert.alert('Password imethibitishwa','PIN ya tarakimu 6 imetumwa kwenye email yako. Ingiza PIN ili kukamilisha login.');
 }
 async function resendPin(){
  const e=email.trim().toLowerCase();
  setBusy(true);
  const {error}=await supabase.auth.signInWithOtp({email:e,options:{shouldCreateUser:false}});
  setBusy(false);
  if(error)return Alert.alert('Imeshindikana kutuma PIN',error.message);
  Alert.alert('PIN imetumwa','Angalia email yako.');
 }
 async function verify(){
  if(pin.trim().length!==6)return Alert.alert('Ingiza PIN ya tarakimu 6');
  setBusy(true);
  const {data,error}=await supabase.auth.verifyOtp({email:email.trim().toLowerCase(),token:pin.trim(),type:'email'});
  setBusy(false);
  if(error)return Alert.alert('PIN haijakubaliwa',error.message);
  if(!data?.session)return Alert.alert('Login haijakamilika','Jaribu tena.');
  setOtpVerified(true);
  setSession(data.session);
 }
 async function logout(){setOtpVerified(false);setLoginStage('password');setPassword('');setPin('');await supabase.auth.signOut();}
 const change=(k,v)=>setForm(x=>({...x,[k]:v}));
 const toggle=id=>setSelected(x=>x.includes(id)?x.filter(a=>a!==id):[...x,id]);
 async function register(){if(!form.full_name.trim()||!form.phone.trim())return Alert.alert('Jina na simu vinahitajika');if(!selected.length)return Alert.alert('Chagua angalau huduma moja');setBusy(true);let loc=null,consent=false;try{const p=await Location.requestForegroundPermissionsAsync();if(p.status==='granted'){const x=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.High});loc=x;consent=true}}catch(e){}
 const {data,error}=await supabase.rpc('freelancer_register_client',{p_full_name:form.full_name.trim(),p_phone:form.phone.trim(),p_whatsapp_number:form.whatsapp_number.trim()||null,p_email:form.email.trim()||null,p_address:form.address.trim()||null,p_latitude:loc?.coords?.latitude??null,p_longitude:loc?.coords?.longitude??null,p_accuracy_m:loc?.coords?.accuracy??null,p_location_consent:consent,p_service_ids:selected});setBusy(false);if(error)return Alert.alert('Usajili umeshindikana',error.message);Alert.alert('Mteja amesajiliwa',`${data.client.full_name}\n${data.client.client_number}\nHuduma: ${data.applications.length}`);setForm({full_name:'',phone:'',whatsapp_number:'',email:'',address:''});setSelected([]);setTab('home');bootstrap()}
 if(!session||!otpVerified)return <SafeAreaView style={s.root}><View style={s.login}><Text style={s.logo}>NEBRIN</Text><Text style={s.title}>Freelancer App</Text><Text style={s.sub}>{loginStage==='password'?'Hatua ya 1: Ingiza email na password yako. Baada ya password kuthibitishwa, PIN itatumwa kwenye email yako.':'Hatua ya 2: Ingiza PIN ya tarakimu 6 iliyotumwa kwenye email yako.'}</Text><TextInput style={s.input} autoCapitalize="none" keyboardType="email-address" placeholder="Email ya freelancer" value={email} editable={loginStage==='password'} onChangeText={setEmail}/>{loginStage==='password'?<><TextInput style={s.input} secureTextEntry placeholder="Password" value={password} onChangeText={setPassword}/><Btn title={busy?'Inathibitisha...':'Endelea'} onPress={checkPasswordAndSendPin} disabled={busy}/></>:<><TextInput style={s.input} keyboardType="number-pad" maxLength={6} placeholder="PIN ya tarakimu 6" value={pin} onChangeText={setPin}/><Btn title={busy?'Inathibitisha...':'Thibitisha PIN na Ingia'} onPress={verify} disabled={busy}/><TouchableOpacity onPress={resendPin}><Text style={s.link}>Tuma PIN nyingine</Text></TouchableOpacity><TouchableOpacity onPress={()=>{setLoginStage('password');setPin('')}}><Text style={s.link}>Rudi kubadilisha email/password</Text></TouchableOpacity></>}</View></SafeAreaView>;
 return <SafeAreaView style={s.root}><View style={s.header}><View><Text style={s.logoSmall}>NEBRIN Freelancer</Text><Text style={s.headerSub}>{profile?.full_name} • {profile?.freelancer_number}</Text></View><TouchableOpacity onPress={logout}><Text style={s.logout}>Toka</Text></TouchableOpacity></View><View style={s.tabs}><TouchableOpacity onPress={()=>setTab('home')}><Text style={[s.tab,tab==='home'&&s.active]}>Dashboard</Text></TouchableOpacity><TouchableOpacity onPress={()=>setTab('register')}><Text style={[s.tab,tab==='register'&&s.active]}>Sajili Mteja</Text></TouchableOpacity></View><ScrollView contentContainerStyle={s.body}>{tab==='home'?<><Text style={s.h1}>Dashboard</Text><View style={s.grid}><Card label="Wateja" value={stats.clients}/><Card label="Huduma" value={stats.services}/><Card label="Commission Pending" value={money(stats.pending_commission)}/><Card label="Commission Earned" value={money(stats.earned_commission)}/><Card label="Commission Paid" value={money(stats.paid_commission)}/></View><Text style={s.note}>Commission: TZS 5,000 kwa kila huduma inayofikisha angalau 80% ya malipo yaliyothibitishwa.</Text></>:<><Text style={s.h1}>Sajili Mteja</Text>{[['full_name','Jina kamili *'],['phone','Namba ya simu *'],['whatsapp_number','WhatsApp'],['email','Email ya mteja'],['address','Anwani / Mahali anapoishi']].map(([k,p])=><TextInput key={k} style={s.input} placeholder={p} value={form[k]} onChangeText={v=>change(k,v)} keyboardType={k==='phone'||k==='whatsapp_number'?'phone-pad':k==='email'?'email-address':'default'} autoCapitalize={k==='email'?'none':'sentences'}/>)}<Text style={s.section}>Chagua huduma moja au zaidi</Text>{services.map(x=><TouchableOpacity key={x.id} style={[s.service,selected.includes(x.id)&&s.serviceOn]} onPress={()=>toggle(x.id)}><Text style={s.check}>{selected.includes(x.id)?'☑':'☐'}</Text><View style={{flex:1}}><Text style={s.serviceName}>{x.name}</Text><Text style={s.serviceMeta}>{x.price?money(x.price):'Bei itawekwa na NEBRIN'}</Text></View></TouchableOpacity>)}<Text style={s.note}>App itaomba ruhusa ya location wakati wa usajili. Eneo litahifadhiwa tu ikiwa ruhusa imetolewa.</Text><Btn title={busy?'Inasajili...':'Sajili Mteja na Huduma'} onPress={register} disabled={busy}/></>}</ScrollView></SafeAreaView>
}
function Card({label,value}){return <View style={s.card}><Text style={s.cardLabel}>{label}</Text><Text style={s.cardValue}>{value??0}</Text></View>}
const s=StyleSheet.create({root:{flex:1,backgroundColor:'#f4f7fb'},login:{flex:1,justifyContent:'center',padding:24},logo:{fontSize:34,fontWeight:'900',color:'#0b4b8a'},title:{fontSize:25,fontWeight:'800',marginTop:5},sub:{color:'#5d6875',marginVertical:16,lineHeight:21},input:{backgroundColor:'#fff',borderWidth:1,borderColor:'#d9e0e8',borderRadius:12,padding:14,marginBottom:11,fontSize:16},btn:{backgroundColor:'#0b4b8a',padding:15,borderRadius:12,alignItems:'center',marginTop:8},btnText:{color:'#fff',fontWeight:'800',fontSize:16},link:{textAlign:'center',color:'#0b4b8a',fontWeight:'700',padding:12},header:{backgroundColor:'#0b4b8a',padding:17,flexDirection:'row',justifyContent:'space-between',alignItems:'center'},logoSmall:{color:'#fff',fontSize:20,fontWeight:'900'},headerSub:{color:'#d9eaff',marginTop:3},logout:{color:'#fff',fontWeight:'800'},tabs:{backgroundColor:'#fff',padding:14,flexDirection:'row',justifyContent:'space-around',borderBottomWidth:1,borderColor:'#e5e9ef'},tab:{fontWeight:'700',color:'#66717d'},active:{color:'#0b4b8a'},body:{padding:17,paddingBottom:50},h1:{fontSize:24,fontWeight:'900',marginBottom:15},grid:{gap:10},card:{backgroundColor:'#fff',padding:17,borderRadius:14,borderWidth:1,borderColor:'#e3e8ef'},cardLabel:{color:'#65717d',fontWeight:'600'},cardValue:{fontSize:23,fontWeight:'900',marginTop:5,color:'#132238'},note:{backgroundColor:'#eaf3fb',padding:14,borderRadius:12,lineHeight:20,color:'#33475b',marginVertical:15},section:{fontSize:17,fontWeight:'800',marginVertical:12},service:{backgroundColor:'#fff',borderWidth:1,borderColor:'#dfe5ec',borderRadius:12,padding:13,marginBottom:9,flexDirection:'row',alignItems:'center'},serviceOn:{borderColor:'#0b4b8a',backgroundColor:'#edf6ff'},check:{fontSize:23,marginRight:11,color:'#0b4b8a'},serviceName:{fontWeight:'800',fontSize:15},serviceMeta:{color:'#697683',marginTop:3}});
