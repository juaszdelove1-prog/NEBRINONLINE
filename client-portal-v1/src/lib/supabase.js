import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
export const supabase=createClient('https://oguukuhflamwmgrbdqfk.supabase.co','sb_publishable_DfUyGsd9bdFBJmouRZf5Rw_SQBnUYXE',{auth:{storage:AsyncStorage,autoRefreshToken:true,persistSession:true,detectSessionInUrl:false}});
