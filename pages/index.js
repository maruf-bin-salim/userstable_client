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
      if (event === 'SIGNED_IN' && session) {
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
    if (session) {
      router.push('/dashboard');
    }
  }, [session]);

  return (
    // auth_page
    <div className='auth_page'>
      {/* <div className="flex justify-center items-center h-screen w-[100%] bg-[#2b2b2b]"> */}
      <div className="auth_container">
        <Auth
          socialLayout='horizontal'
          view='sign_in'
          appearance={{
            theme: ThemeSupa,
            variables: {
              default: {
                colors: {
                  brand: '#53a150',
                  inputText: 'white',
                  inputLabelText: 'white',
                  anchorTextColor: '#dbdbdb',
                },
              },
            },
          }}
          supabaseClient={supabase}
          providers={['google', 'apple', 'azure']}
          providerScopes={{
            google: 'email',
            apple: 'email',
            azure: 'email'
          }}
        />
      </div>
    </div>
  );
}
