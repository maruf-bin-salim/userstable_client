import { supabase } from '@/supabase/client';
import { Auth } from '@supabase/auth-ui-react'
import { ThemeMinimal, ThemeSupa } from '@supabase/auth-ui-shared'
import { redirect } from 'next/navigation';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';



export default function Home() {

  const [session, setSession] = useState(null);
  const router = useRouter();


  useEffect(() => {
    const data = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`Supabase Auth State Change: ${event}`);
      if(event === 'SIGNED_IN' && session) {
        router.push('/dashboard');
      }
      else {
        setSession(session);
      }
     
    });

    return () => {
      data.data.subscription.unsubscribe();
    };
  }
    , []);

  useEffect(() => {
    console.log(session);
    if (session) {
      router.push('/dashboard');
    }
  }, [session]);

  return (
    <div className="flex justify-center items-center h-screen w-[100%] bg-[#2b2b2b]">
      {session && <div className="absolute top-0 right-0 p-4 bg-[#3b3b3b] text-white">User: {session.user.email}</div>}
      <div className="block min-w-[90vw] md:min-w-[300px] lg:min-w-[400px] bg-[#3b3b3b] p-4 rounded-[20px]">
        <Auth
          socialLayout='horizontal'
          view='sign_in'
          appearance={{ theme: ThemeSupa }}
          supabaseClient={supabase}
          providers={['google', 'apple']}
        />
      </div>
    </div>
  );
}
